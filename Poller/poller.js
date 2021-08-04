/* eslint-disable no-mixed-spaces-and-tabs */
"use strict";

const readline = require("readline");
const poller = require("./snmp.js");
const args = require("minimist")(process.argv.slice(2));
const fs = require("fs");
const throat = require("throat");
const addr = require("ip-address");
const func = require("./tools.js");
const mariadb = require("mariadb");
const { Client } = require("pg");

function print_ndjson(doc, inh, inhObj) {
	let collected = {};
	if (inh) {
		for (let i in inh) doc.tag[i] = inh[i];
	}
	if (inhObj) {
		if ("tag" in inhObj || "field" in inhObj) {
			for (let k of ["tag", "field"]) {
				if (k in doc) {
					collected[k] = k in inhObj ? {...doc[k], ...inhObj[k]} : doc[k];
				} else if (k in inhObj) {
					collected[k] = inhObj[k];
				}
			}
		} else {
			collected = doc;    
		}
	} else {
		collected = doc;
	}
	console.log(JSON.stringify(collected));
	return collected;
}

async function process_target(target, conf, inhObj) {
	const inh = ("inh_oids" in conf) ? await poller.get_oids(target, conf.community, conf.options, conf.inh_oids, conf.reportError) : false;
	let result = [];
	if ("table" in conf) {
		for (const table of conf.table) {
			if ("options" in table) {
				if (!("measurement" in table.options)) {
					console.error(new func.CustomError("Config", "No ha declarado measurement dentro de table"));
					continue;
				}
			} else {
				console.error(new func.CustomError("Config", "No ha declarado options dentro de table"));
				continue;
			}
			const part = await poller.get_table(target, conf.community, conf.options, table.oids, conf.maxRepetitions, conf.limit, conf.reportError);
			for (let k in part) {
				let doc = part[k];
				if ("index" in table.options && table.options.index) doc.tag.index = k;
				if ("pollertime" in conf) doc.pollertime = conf.pollertime;
				doc.tag.agent_host = target;
				doc.measurement_name = table.options.measurement;
				let collected = print_ndjson(doc, inh, inhObj);
				result.push(collected);
			}
		}
	}
	if ("oids_get" in conf || "oids_walk" in conf) {
		let obj = {
			"measurement_name": conf.measurement,
			"pollertime": conf.pollertime,
			"tag": {"agent_host": target}
		};
		let get, walk;
		if ("oids_get" in conf)
			get = await poller.get_all(target, conf.community, conf.options, conf.oids_get, conf.reportError);
		if ("oids_walk" in conf)
			walk = await poller.get_walk(target, conf.community, conf.options, conf.oids_walk, "array", conf.maxRepetitions, conf.maxIterations, conf.reportError);
		for (let k of ["tag", "field"]) {
			if (get && k in get) {
				obj[k] = walk && k in walk ? {...obj[k], ...get[k], ...walk[k]} : {...obj[k], ...get[k]};
			} else {
				obj[k] = walk && k in walk ? {...obj[k], ...walk[k]} : obj[k];
			}
		}
		let collected = print_ndjson(obj, inh, inhObj);
		result.push(collected);
	}
	return result;
}

async function start() {
	try {
		const expect = ["hosts", "options"];
		const defaultVal = {
			"maxRepetitions": 50,
			"limit": 1,
			"time": true,
			"ConLimit": 3000,
			"maxIterations": 20,
			"reportError": "log",
			"community": "public"
		};
		let conf = await poller.read_config(args.config, expect, defaultVal, true);
		const ConLimit = conf.ConLimit;
		if (conf.time)
			conf.pollertime = Date.now() / 1000;
		if (typeof conf.hosts === "string") {
			if (fs.existsSync(conf.hosts)) {
				const readInterface = readline.createInterface({
					input: fs.createReadStream(conf.hosts),
					output: process.stdout,
					console: false
				});
				readInterface.on("line", throat(ConLimit, async (target) => {
					if (typeof target === "string") {
						let ipv4 = new addr.Address4(target);
						if (ipv4.isValid()) {
							await process_target(target, conf);
						}
					}
				}));
			} else throw new func.CustomError("Config", "File of hosts not exists");
		} else if (typeof conf.hosts === "object" && Array.isArray(conf.hosts)) {
			await Promise.all(conf.hosts.map(throat(ConLimit, async (target) => {
				if (typeof target === "string") {
					let ipv4 = new addr.Address4(target);
					if (ipv4.isValid()) {
						await process_target(target, conf);
					}
				}
			})));
		} else if (func.isObject(conf.hosts) && "type" in conf.hosts && "ipField" in conf.hosts) {
			let data = [];
			if (conf.hosts.type === "mysql") {
				if (!("dbOpt" in conf.hosts && "sql" in conf.hosts)) throw new func.CustomError("DbConfig", "db parameters are incomplete");
				const conn = await mariadb.createConnection(conf.hosts.dbOpt);
				const rows = await conn.query(conf.hosts.sql);
				await conn.end();
				rows.forEach(obj => {
					data.push(func.ObjExpand(obj));
				});
			} else if (conf.hosts.type === "pg") {
				if (!("dbOpt" in conf.hosts && "sql" in conf.hosts)) throw new func.CustomError("DbConfig", "db parameters are incomplete");
				const client = new Client(conf.hosts.dbOpt);
				await client.connect();
				const res = await client.query(conf.hosts.sql);
				await client.end();
				res.rows.forEach(obj => {
					data.push(func.ObjExpand(obj));
				});
			} else if (conf.hosts.type === "stdin") {
				const rl = readline.createInterface({
					input: process.stdin,
					output: process.stdout,
					terminal: false,
				});
				rl.on("line", throat(ConLimit, async (line) => {
					let doc, target;
					try {
						doc = func.ObjExpand(JSON.parse(line));
						target = doc[conf.hosts.ipField];
					} catch (e) {
						target = line;
					}
					if (typeof target === "string") {
						let ipv4 = new addr.Address4(target);
						if (ipv4.isValid()) {
							if (func.isObject(doc)) {
								if ("comField" in conf.hosts && conf.hosts.comField in doc) conf.community = doc[conf.hosts.comField];
								await process_target(target, conf, doc);
							} else {
								await process_target(target, conf);
							}
						}
					}
				}));
			} else throw new func.CustomError("DbConfig", "Type of DB is not allowed");
			if (data.length > 0) {
				Promise.all(data.map(throat(ConLimit, async (doc) => {
					let target = func.get_ObjValue(doc,conf.hosts.ipField);
					if (typeof target === "string") {
						let ipv4 = new addr.Address4(target);
						if (ipv4.isValid()) {
							if ("comField" in conf.hosts && conf.hosts.comField in doc) conf.community = doc[conf.hosts.comField];
							process_target(target, conf, doc);
						}
					}
				})));
			}
		} else throw new func.CustomError("Config", "Type of list of hosts are not defined");
	} catch (error) {
		console.error(error);
	}
}

if ("config" in args) {
	start().catch(error => {
		console.error(error);
	});
}