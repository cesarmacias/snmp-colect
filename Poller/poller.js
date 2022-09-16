#!/usr/bin/env node
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
const merge = require("deepmerge");

function print_ndjson(doc, inh, inhObj) {
	if (inh) {
		for (let i in inh) doc.tag[i] = inh[i];
	}
	let collected = func.isObject(inhObj) ? merge(doc, inhObj) : doc;
	console.log(JSON.stringify(collected));
	return collected;
}

async function process_target(target, conf, inhObj) {
	let obj = {
		"measurement_name": conf.measurement,
		"pollertime": conf.pollertime,
		"tag": {"agent_host": target}
	};
	let session = await poller.create_session(target, conf.options, conf.community, conf.user); 
	let test = await poller.snmp_test(target, conf.community, JSON.parse(JSON.stringify(conf.options)), conf.user);
	if (test === undefined){
		const inh = ("inh_oids" in conf) ? await poller.get_oids(target, session, conf.inh_oids, conf.reportError) : false;
		let result = [];
		if ("table" in conf) {
			await Promise.all(conf.table.map(async (table)=> {
				let flag = true;
				if ("options" in table) {
					if (!("measurement" in table.options)) {
						console.error(new func.CustomError("Config", "No ha declarado measurement dentro de table"));
						flag = false;
					}
				} else {
					console.error(new func.CustomError("Config", "No ha declarado options dentro de table"));
					flag = false;
				}
				if (flag) {
					const part = await poller.get_table(target, conf.community, conf.options, table.oids, conf.maxRepetitions, conf.reportError);
					for (let k in part) {
						let doc = {};
						if (k !== "snmperror") {
							doc = ("index" in table.options && table.options.index) ? merge(part[k], {"tag": {"agent_host": target, "index": k}, "measurement_name": table.options.measurement, "pollertime": conf.pollertime}) : merge(part[k], {"tag": {"agent_host": target}, "measurement_name": table.options.measurement, "pollertime": conf.pollertime});
						} else {
							doc =  merge({[k]: part[k]}, {"tag": {"agent_host": target}, "measurement_name": table.options.measurement, "pollertime": conf.pollertime});
						}
						let collected = print_ndjson(doc, inh, inhObj);
						result.push(collected);
					}
				}
			}));
		}
		if ("oids_get" in conf || "oids_walk" in conf) {
			if ("oids_get" in conf) {
				let get = await poller.get_all(target, conf.community, conf.options, conf.oids_get, conf.reportError);
				if (func.isObject(get)) obj = merge(obj, get);
			}
			if ("oids_walk" in conf) {
				let walk = await poller.get_walk(target, conf.community, conf.options, conf.oids_walk, "array", conf.maxRepetitions, conf.maxIterations, conf.reportError);
				if (func.isObject(walk)) obj = merge(obj, walk);
			}
			let collected = print_ndjson(obj, inh, inhObj);
			result.push(collected);
		}
		session.close();
		return result;
	} else {
		if("reportError" in conf && conf.reportError == "log") {
			console.error("SNMP_RequestTimedOut:" + target);
		} else {
			obj = merge(obj, {snmperror: { host: test }});
			print_ndjson(obj, undefined, inhObj);
		}
	}
}

async function start() {
	try {
		const expect = ["hosts", "options"];
		const defaultVal = {
			"maxRepetitions": 50,
			"time": true,
			"ConLimit": 3000,
			"maxIterations": 0,
			"reportError": "json",
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
								func.del_field_obj(doc,conf.hosts.ipField);
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
							func.del_field_obj(doc,conf.hosts.ipField);
							process_target(target, conf, doc);
						} else {
							console.error("target is not a valid ipv4");
						}
					} else {
						console.error(conf.hosts.ipField + " as target is not a string");
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
