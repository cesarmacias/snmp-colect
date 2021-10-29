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
Funcion para obtener datos tipo tabla (indice compartido) por SNMP
*/
function streePromise(
	session,
	oid,
	maxRepetitions,
	mib,
	response, 
	TypeResponse
) {
	return new Promise( (resolve, reject) => {
		let type = "tag" in mib && mib.tag ? "tag" : "field";
		session.subtree(
			oid,
			maxRepetitions,
			(varbinds) => {
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
 main function get_table
*/
async function get_table(
	target,
	comm,
	options,
	oids,
	maxRepetitions,
	limit,
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
			"table"
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
			let resp;
			if (error) {
				resp = {
					tag: {
						SnmpError: {
							error: error.name,
							host: target,
							oids: _oids,
							type: "inh",
						},
					},
				};
				if (reportError === "log") {
					console.error(JSON.stringify(resp));
					resp = undefined;
				}
			} else {
				resp = varbinds.reduce((vbs, vb) => {
					if (!snmp.isVarbindError(vb)) {
						vbs[oids[vb.oid]] = vb.value;
						if (vb.type === snmp.ObjectType.OctetString)
							vbs[oids[vb.oid]] = vb.value.toString();
					}
					return vbs;
				}, {});
			}
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
			if (error) {
				resp = {
					tag: {
						SnmpError: {
							error: error.name,
							host: target,
							oids: _oids,
							type: "get",
						},
					},
				};
				if (reportError === "log") {
					console.error(JSON.stringify(resp));
					resp = undefined;
				}
			} else {
				for (const vb of varbinds) {
					if (!snmp.isVarbindError(vb)) {
						let mib = oids[vb.oid];
						let type = "tag" in mib && mib.tag ? "tag" : "field";
						let name = mib.name;
						resp[type] =
              resp && type in resp ?
              	{
              		...resp[type],
              		...{
              			[name]: await vb_transform(vb, mib),
              		},
              	} :
              	{
              		[name]: await vb_transform(vb, mib),
              	};
					}
				}
			}
			session.close();
			resolve(resp);
		});
	});
}
/*
Funcion para que snmp.subtree trabaje con promesas
*/
function streePromisified(
	session,
	oid,
	maxRepetitions,
	mib,
	TypeResponse,
	maxIterations
) {
	return new Promise(function (resolve, reject) {
		let i = 0;
		let response = TypeResponse === "array" ? [] : {};
		maxRepetitions = maxRepetitions || 20;
		maxIterations = maxIterations || maxRepetitions;
		session.subtree(
			oid,
			maxRepetitions,
			async (varbinds) => {
				if (maxIterations && i++ > maxIterations)
					reject("maxIterations reached");
				for (let vb of varbinds)
					if (!snmp.isVarbindError(vb)) {
						let value = vb_transform(vb, mib);
						if (TypeResponse === "array") response.push(value);
						else {
							let index = vb.oid.substring(oid.length + 1);
							response = {
								...response,
								[index]: value,
							};
						}
					}
			},
			(error) => {
				if (error) reject(error);
				else resolve(response);
			}
		);
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
		await streePromise(
			session,
			oid,
			maxRepetitions,
			mib,
			resp,
			TypeResponse || "array"
		).catch((error) => {
			let err = {[mib.name]: error.toString()};
			if (reportError === "log") {
				console.error(JSON.stringify({snmperror: {...{host: target}, ...err}}));
			} else {
				resp.snmperror = merge(resp.snmperror, err);
			}
		});
	}
	session.close();
	return resp;
}
//
async function get_walk2(
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
	let oiderror = {};
	try {
		const session = snmp.createSession(target, comm, options);
		for await (const oid of Object.keys(oids)) {
			let mib = oids[oid];
			let type = "tag" in mib && mib.tag ? "tag" : "field";
			let value = await streePromisified(
				session,
				oid,
				maxRepetitions,
				mib,
				TypeResponse,
				maxIterations
			).catch((error) => {
				oiderror.SnmpError =
          "SnmpError" in oiderror ?
          	{
          		...oiderror.SnmpError,
          		...{
          			[oids[oid].name]: error.toString(),
          		},
          	} :
          	{
          		[oids[oid].name]: error.toString(),
          	};
			});
			if (value && typeof value === "object")
				resp[type] =
          resp && type in resp ?
          	{
          		...resp[type],
          		...{
          			[mib.name]: value,
          		},
          	} :
          	{
          		[mib.name]: value,
          	};
		}
		session.close();
	} catch (error) {
		resp = {
			tag: {
				SnmpError: error,
			},
		};
		if (reportError === "log") {
			console.error(JSON.stringify(resp.tag));
			resp = undefined;
		}
	} finally {
		if (oiderror && "SnmpError" in oiderror) {
			oiderror.SnmpError = {
				oids_walk: oiderror.SnmpError,
			};
			if (reportError === "log") {
				console.error(
					JSON.stringify({
						...oiderror,
						host: target,
					})
				);
			} else {
				resp.tag =
          "tag" in resp ?
          	{
          		...resp.tag,
          		...oiderror,
          	} :
          	oiderror;
			}
		}
		return resp;
	}
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
	await streePromisified(session, "1", 1, mib, "array", 1).catch((error) => {
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
	get_walk2,
	snmp_test,
};