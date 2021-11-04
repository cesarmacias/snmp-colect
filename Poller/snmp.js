/* eslint-disable no-unsafe-finally */
/* eslint-disable no-mixed-spaces-and-tabs */
"use strict";

const snmp = require("net-snmp");
const fs = require("fs");
const addr = require("ip-address");
const func = require("./tools.js");
const merge = require("deepmerge");

/*
Funcion para convetir el valor recibido en IPv4
*/
function addr_convert(value) {
	let ipv4;
	if (typeof value === "string") {
		ipv4 = new addr.Address4(value);
		if (!ipv4.isValid()) {
			value = value.replace(/[:.\s]/g, "");
			let reg = /^[0-9a-fA-F]{8}$/g;
			if (reg.test(value))
				ipv4 = new addr.Address4.fromHex(value);
		}
	} else if (typeof value === "number") {
		ipv4 = new addr.Address4.fromInteger(value);
	}
	return ipv4.address;
}
/*
Funcion para tratar/modificar el valor recibido
*/
function vb_transform(vb, oid) {
	let value = vb.value;
	if (vb.type === snmp.ObjectType.OctetString) {
		value = vb.value.toString();
		if ("type" in oid && oid.type === "hex") value = vb.value.toString("hex");
		if ("type" in oid && oid.type === "regex") {
			if ("regex" in oid && "map" in oid) {
				let arr = value.match(new RegExp(oid.regex));
				if (arr) {
					value = {};
					for (let i = 1, len = oid.map.length; i <= len; i++)
						value[oid.map[i - 1]] = arr[i];
				}
			}
		}
	} else if (vb.type === snmp.ObjectType.Counter64) {
		value = 0;
		for (let x of vb.value.values()) {
			value *= 256;
			value += x;
		}
	}
	let resp = value;
	if ("conversion" in oid) {
		if (oid.conversion === "ipv4") {
			resp = addr_convert(value);
		} else if (oid.conversion === "number") {
			resp = value * 1;
		}
	}
	return resp;
}
/*
Funcion para leer la configuracion para el proceso de poleo snmp, fuente un archivo JSON
*/
async function read_config(file, inh, def, newConf) {
	let config;
	try {
		let rawdat = fs.readFileSync(file, "utf8");
		config = JSON.parse(rawdat);
	} catch (error) {
		throw new func.CustomError("Config", error.toString());
	}
	inh.forEach((k) => {
		if (!(k in config))
			throw new func.CustomError("Config", k + "is not defined");
	});
	if (newConf && ("oids_get" in config || "oids_walk" in config)) {
		if (!("measurement" in config))
			throw new func.CustomError("Config", "measurement is not defined");
	}
	if ("options" in config)
		if ("version" in config.options)
			config.options.version =
        config.options.version === "1" ? snmp.Version1 : snmp.Version2c;
	if (def && func.isObject(def)) {
		for (const key in def) {
			if (Object.prototype.hasOwnProperty.call(def, key)) {
				if (!(key in config)) config[key] = def[key];
			}
		}
	}
	return config;
}
/*
Funcion para que snmp.subtree trabaje con promesas
*/
function streePromise(
	session,
	oid,
	maxRepetitions,
	mib,
	response, 
	TypeResponse,
	maxIterations
) {
	return new Promise( (resolve, reject) => {
		let type = "tag" in mib && mib.tag ? "tag" : "field";
		let i = 0;
		session.subtree(
			oid,
			maxRepetitions,
			(varbinds) => {
				if (TypeResponse === "test") return resolve(true);
				if(maxIterations > 0 && i++ > maxIterations) return resolve({snmperror: {[mib.name]: "maxIterations reached"}});
				for (let vb of varbinds)
					if (!snmp.isVarbindError(vb)) {
						let value = vb_transform(vb, mib);
						let index = vb.oid.substring(oid.length + 1);
						if (TypeResponse === "array") {
							if(!(type in response)) response = {[type]: {[mib.name]: []}};
							response[type][mib.name].push(value);
						}
						else if (TypeResponse === "json") {
							response = merge(response, {[type]: {[mib.name]: value}});
						} else if (TypeResponse === "table") {
							if ("index_slice" in mib && Array.isArray(mib.index_slice)) {
								let slice = mib.index_slice;
								let arr = index.split(".");
								arr = arr.slice(slice[0], slice[1] || slice.length);
								let idx = arr.join(".");
								if (idx !== index) {
									response[idx] = merge(response[idx], { idx: { [mib.name]: index } });
									index = idx;
								}
							}
							response[index] = merge(response[index], {[type]: {[mib.name]: value}});
						}
					}
			},
			(error) => {
				if (error) return reject(error);
				else resolve(response);
			}
		);
	});
}
/*
Funcion para obtener datos tipo tabla (indice compartido) por SNMP
*/
async function get_table(
	target,
	comm,
	options,
	oids,
	maxRepetitions,
	reportError
) {
	let resp = {};
	const session = snmp.createSession(target, comm, options);
	for (const mib of oids)
		await streePromise(
			session,
			mib.oid,
			maxRepetitions,
			mib,
			resp,
			"table",
			0
		).catch((error) => {
			let err = {[mib.name]: error.toString()};
			if (reportError === "log") {
				console.error(JSON.stringify({snmperror: {...{host: target}, ...err}}));
			} else {
				resp.snmperror = merge(resp.snmperror, err);
			}
		});
	session.close();
	return resp;
}
/*
Funcion para obtener datos snmpget para ser heredados en las tablas
*/
async function get_oids(target, comm, options, oids, reportError) {
	return new Promise((resolve) => {
		let session = snmp.createSession(target, comm, options);
		let _oids = Object.keys(oids);
		session.get(_oids, (error, varbinds) => {
			let resp = varbinds.reduce((vbs, vb) => {
				if (!snmp.isVarbindError(vb)) {
					vbs[oids[vb.oid]] = vb.value;
					if (vb.type === snmp.ObjectType.OctetString)
						vbs[oids[vb.oid]] = vb.value.toString();
				} else {
					let err = {[oids[vb.oid]]: snmp.ObjectType[vb.type]};
					if (reportError === "log")
						console.error(JSON.stringify({snmperror: {...{host: target}, ...err}}));
					else
						vbs[oids[vb.oid]] =  snmp.ObjectType[vb.type];
				}
				return vbs;
			}, {});
			session.close();
			resolve(resp);
		});
	});
}
/*
Funcion para obtener varios datos por snmpget, desde un array de OIDS
*/
function get_all(target, comm, options, oids, reportError) {
	return new Promise((resolve) => {
		let session = snmp.createSession(target, comm, options);
		let _oids = Object.keys(oids);
		let resp = {};
		session.get(_oids, async (error, varbinds) => {
			for (const vb of varbinds) {
				if (!snmp.isVarbindError(vb)) {
					let mib = oids[vb.oid];
					let type = "tag" in mib && mib.tag ? "tag" : "field";
					resp[type] = merge(resp[type], {[mib.name]: await vb_transform(vb, mib)});
				} else {
					let err = {[oids[vb.oid].name]: snmp.ObjectType[vb.type]};
					if (reportError === "log")
						console.error(JSON.stringify({snmperror: {...{host: target}, ...err}}));
					else
						resp.snmperror = merge(resp.snmperror, err);
				}
			}
			session.close();
			resolve(resp);
		});
	});
}
/*
Funcion para obtener datos por snmpwalk
*/
async function get_walk(
	target,
	comm,
	options,
	oids,
	TypeResponse,
	maxRepetitions,
	maxIterations,
	reportError
) {
	let resp = {};
	const session = snmp.createSession(target, comm, options);
	for (const oid of Object.keys(oids)){
		let mib = oids[oid];
		let part = await streePromise(
			session,
			oid,
			maxRepetitions,
			mib,
			{},
			TypeResponse || "array",
			maxIterations || 0
		).catch((error) => {
			let err = {[mib.name]: error.toString()};
			if (reportError === "log") {
				console.error(JSON.stringify({snmperror: {...{host: target}, ...err}}));
			} else {
				resp.snmperror = merge(resp.snmperror, err);
			}
		});
		resp = merge(resp, part);
	}
	session.close();
	return resp;
}
/*
	Test SNMP
*/
async function snmp_test(target, comm, options) {
	options.timeout = 500;
	options.retries = 2;
	let mib = { 1: { name: "test" } };
	const session = snmp.createSession(target, comm, options);
	let message;
	await streePromise(session, "1", 1, mib, {}, "test").catch((error) => {
		message = error.toString();
	});
	session.close();
	return !/RequestTimedOut/i.test(message);
}
/*
Funciones a Exportar
*/
module.exports = {
	get_table,
	get_oids,
	get_all,
	read_config,
	get_walk,
	snmp_test
};