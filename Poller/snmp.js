/*jslint node: true */
'use strict';

const snmp = require("net-snmp");
const fs = require("fs");
const async = require("async");
const addr = require("ip-address");
const func = require("./tools.js");

/*
Funcion para convetir el valor recibido en IPv4
*/
async function addr_convert(value) {
    return new Promise((resolve, reject) => {
        let ipv4;
        if (typeof value === 'string') {
            ipv4 = new addr.Address4(value);
            if (ipv4.isValid()) {
                resolve(ipv4.address);
            } else {
                value = value.replace(/[:.\s]/g, '');
                let reg = /^[0-9a-fA-F]{8}$/g;
                if (reg.test(value)) {
                    ipv4 = new addr.Address4.fromHex(value);
                    if (ipv4.isValid())
                        resolve(ipv4.address);
                    else reject("Not IPv4");
                } else reject("Not IPv4");
            }
        } else if (typeof value === 'number') {
            ipv4 = new addr.Address4.fromInteger(value);
            if (ipv4.isValid()) {
                resolve(ipv4.address);
            } else reject("Not IPv4");
        }
        reject("Error Type");
    });
}

/*
Funcion para tratar/modificar el valor recibido
*/
async function vb_transform(vb, oid) {
    return new Promise(async (resolve) => {
        let value = vb.value;
        if (vb.type === snmp.ObjectType.OctetString) {
            value = vb.value.toString();
            if ("type" in oid && oid.type === "hex")
                value = vb.value.toString("hex");
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
                resp = await addr_convert(value);
            } else if (oid.conversion === "number") {
                resp = value * 1;
            }
        }
        resolve(resp);
    });
}

/*
Funcion para procesar los datos obtenidos de un snmpwalk a un dispositivo, los valores los asocia a "field" o "tag"
*/
async function feedCb(varbinds) {
    let self = this;
    for (let i = 0; i < varbinds.length; i++)
        if (snmp.isVarbindError(varbinds[i])) {
            console.error(snmp.varbindError(varbinds[i]).toString);
        } else {
            let index = varbinds[i].oid.substring(self.mib.oid.length + 1);
            let value, type;
            if (varbinds[i].type === snmp.ObjectType.OctetString) {
                value = "type" in self.mib && self.mib.type === "hex" ? varbinds[i].value.toString("hex") : varbinds[i].value.toString();
            } else if (varbinds[i].type === snmp.ObjectType.Counter64) {
                value = 0;
                for (let x of varbinds[i].value.values()) {
                    value *= 256;
                    value += x;
                }
            } else value = varbinds[i].value;
            if ("conversion" in self.mib && self.mib.conversion === "ipv4") value = await addr_convert(value);
            type = "tag" in self.mib && self.mib.tag ? "tag" : "field";
            if (!(index in self.resp)) self.resp[index] = {};
            if (!("tag" in self.resp[index])) self.resp[index].tag = {};
            if (!("field" in self.resp[index])) self.resp[index].field = {};
            self.resp[index][type][self.mib.name] = value;
        }
}

/*
Funcion para leer la configuracion para el proceso de poleo snmp, fuente un archivo JSON
*/
async function read_config(file, inh, def) {
    return new Promise((resolve, reject) => {
        let config;
        try {
            let rawdat = fs.readFileSync(file, 'utf8');
            config = JSON.parse(rawdat);
        } catch (error) {
            reject(new func.CustomError('Config', error.toString()));
        }
        inh.forEach((k) => {
            if (!(k in config)) reject(new func.CustomError('Config', k + 'is not defined'));
        });
        if ("oids_get" in config || "oids_walk" in config) {
            if (!("measurement" in config)) reject(new func.CustomError('Config', 'measurement is not defined'));
        }
        if ("options" in config)
            if ("version" in config.options)
                config.options.version = config.options.version === "1" ? snmp.Version1 : snmp.Version2c;
        if (func.isObject(def)) {
            for (const key in def) {
                if (def.hasOwnProperty(key)) {
                    if (!(key in config)) config[key] = def[key];
                }
            }
        }
        resolve(config);
    });
}

/*
Funcion para obtener datos tipo tabla (indice compartido) por SNMP
*/
async function get_table(target, comm, options, oids, max, limit, reportError) {
    return new Promise((resolve, reject) => {
        let obj = {};
        let session = snmp.createSession(target, comm, options);
        async.eachLimit(oids, limit, (oid, callback) => {
            session.subtree(oid.oid, max, feedCb.bind({mib: oid, resp: obj}), (error) => {
                if (error)
                    if (reportError) console.error("table|" + target + "|" + oid.oid + "|" + error.toString());
                callback();
            });
        }, function (error) {
            session.close();
            if (error) {
                if (reportError) console.error(error.toString());
                reject(new Error("SNMP error host: " + target));
            }
            resolve(obj);
        });
    });
}

/*
Funcion para obtener datos snmpget para ser heredados en las tablas
*/
async function get_oids(target, comm, options, oids, reportError) {
    return new Promise((resolve) => {
        let session = snmp.createSession(target, comm, options);
        session.get(Object.keys(oids), (error, varbinds) => {
            let resp = {};
            if (error) {
                resp = {"tag": {"SnmpError": {"inh_oids": error}}};
                if (reportError === 'log') {
                    console.error(JSON.stringify({...resp.tag, "host": target}));
                    resp = undefined;
                }
            } else {
                resp = varbinds.reduce((vbs, vb) => {
                    if (!(snmp.isVarbindError(vb))) {
                        vbs[oids[vb.oid]] = vb.value;
                        if (vb.type === snmp.ObjectType.OctetString) vbs[oids[vb.oid]] = vb.value.toString();
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
async function get_all(target, comm, options, oids, reportError) {
    return new Promise(async (resolve, reject) => {
        let session = snmp.createSession(target, comm, options);
        let _oids = Object.keys(oids);
        let resp = {};
        resp.tag = {};
        resp.field = {};
        session.get(_oids, async (error, varbinds) => {
            if (error) {
                resp = {"tag": {"SnmpError": {"oids_get": error}}};
                if (reportError === 'log') {
                    console.error(JSON.stringify({...resp.tag, "host": target}));
                    resp = undefined;
                }
            } else {
                for (const vb of varbinds) {
                    if (!(snmp.isVarbindError(vb))) {
                        let mib = oids[vb.oid];
                        let type = "tag" in mib && mib.tag ? "tag" : "field";
                        let name = mib.name;
                        resp[type][name] = await vb_transform(vb, mib);
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

function streePromisified(session, oid, maxRepetitions, mib, TypeResponse, maxIterations) {
    return new Promise(function (resolve, reject) {
        let i = 0;
        let response = TypeResponse === "array" ? [] : {};
        session.subtree(oid, maxRepetitions, async (varbinds) => {
            if (maxIterations && i++ > maxIterations)
                reject("maxIterations reached");
            for (let vb of varbinds)
                if (!snmp.isVarbindError(vb)) {
                    let value = await vb_transform(vb, mib);
                    if (TypeResponse === "array")
                        response.push(value);
                    else {
                        let index = vb.oid.substring(oid.length + 1);
                        response = {...response, [index]: value};
                    }
                }

        }, (error) => {
            if (error)
                reject(error);
            else
                resolve(response);
        });
    });
}

/*
Funcion para obtener datos por snmpwalk
*/
async function get_walk(target, comm, options, oids, TypeResponse, maxRepetitions, maxIterations, reportError) {
    let resp = {};
    let oiderror = {};
    try {
        const session = snmp.createSession(target, comm, options);
        for await (const oid of Object.keys(oids)) {
            let mib = oids[oid];
            let type = "tag" in mib && mib.tag ? "tag" : "field";
            let value = await streePromisified(session, oid, maxRepetitions, mib, TypeResponse, maxIterations).catch(error => {
                oiderror.SnmpError = "SnmpError" in oiderror ? {...oiderror.SnmpError, ...{[oids[oid].name]: error.toString()}} : {[oids[oid].name]: error.toString()};
            });
            resp[type] = {...resp[type], ...{[mib.name]: value}};
        }
        session.close();
    } catch (error) {
        resp = {"tag": {"SnmpError": error}};
        if (reportError === 'log') {
            console.error(JSON.stringify(resp.tag));
            resp = undefined;
        }
    } finally {
        if (oiderror && "SnmpError" in oiderror) {
            if (reportError === 'log') {
                console.error(JSON.stringify({...oiderror, "host": target}));
            } else {
                resp.tag = "tag" in resp ? {...resp.tag, ...oiderror} : oiderror;
            }
        }
        return resp;
    }
}

/*
Funciones a Exportar
*/
module.exports = {
    get_table,
    get_oids,
    get_all,
    read_config,
    get_walk
};