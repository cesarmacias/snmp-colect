/*jslint node: true */
'use strict';

const snmp = require("net-snmp");
const fs = require("fs");
const async = require("async");
const addr = require("ip-address");

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
            resp = oid.conversion === "ipv4" ? await addr_convert(value) : value;
        }
        resolve(resp);
    });
}

/* Funcion para procesar los datos obtenidos de un snmpwalk a un dispositivo, los valores los asocia a "field" o "tag"
 *  * */
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

/* Funcion para leer la configuracion para el proceso de poleo snmp, fuente un archivo JSON
  */
async function read_config(file, inh) {
    return new Promise((resolve, reject) => {
        let config;
        try {
            let rawdat = fs.readFileSync(file, 'utf8');
            config = JSON.parse(rawdat);
        } catch (error) {
            reject(error);
        }
        inh.forEach((k) => {
            if (!(k in config)) reject(new Error("Falta el parametro: " + k));
        });
        if ("options" in config)
            if ("version" in config.options)
                if (config.options.version === "1")
                    config.options.version = snmp.Version1;
                else
                    config.options.version = snmp.Version2c;
        if (!("maxRepetitions" in config)) config.maxRepetitions = 20;
        if (!("limit" in config)) config.limit = 3; //se debe eliminar esta configuracion
        if (!("time" in config)) config.time = true;
        resolve(config);
    });
}

/* Funcion para obtener datos tipo tabla (indice compartido) por SNMP
 */
async function get_table(target, comm, options, oids, max, limit) {
    return new Promise((resolve, reject) => {
        let obj = {};
        let session = snmp.createSession(target, comm, options);
        async.eachLimit(oids, limit, (oid, callback) => {
            session.subtree(oid.oid, max, feedCb.bind({mib: oid, resp: obj}), (error) => {
                if (error)
                    console.error("table|" + target + "|" + oid.oid + "|" + error.toString());
                callback();
            });
        }, function (error) {
            session.close();
            if (error) {
                console.error(error.toString());
                reject(new Error("SNMP error host: " + target));
            }
            resolve(obj);
        });
    });
}

/* Funcion para obtener datos snmpget para ser heredados en las tablas
 *  * */
async function get_oids(target, comm, options, oids) {
    return new Promise((resolve) => {
        let session = snmp.createSession(target, comm, options);
        session.get(Object.keys(oids), (error, varbinds) => {
            let resp = {};
            if (error) {
                console.error("get|" + target + "|oids|" + error.toString());
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

/* Funcion para obtener varios datos por snmpget, desde un array de OIDS
 * * */
async function get_all(target, comm, options, oids) {
    return new Promise(async (resolve, reject) => {
        let session = snmp.createSession(target, comm, options);
        let _oids = Object.keys(oids);
        let resp = {};
        resp.tag = {};
        resp.field = {};
        session.get(_oids, async (error, varbinds) => {
            if (error) {
                reject(error);
            } else {
                for (const vb of varbinds) {
                    if (!(snmp.isVarbindError(vb))) {
                        let mib = oids[vb.oid];
                        let type = "tag" in mib && mib.tag ? "tag" : "field";
                        let name = mib.name;
                        resp[type][name] = await vb_transform(vb, mib);
                    }
                }
                resolve(resp);
            }
            session.close();
        });
    });
}

/*
Funcion para que snmp.subtree trabaje con promesas
 */

function streePromisified(session, oid, maxRepetitions, mib, maxIterations) {
    return new Promise(function (resolve, reject) {
        let i = 0;
        let response = [];
        session.subtree(oid, maxRepetitions, async (varbinds) => {
            if (maxIterations && i++ > maxIterations)
                reject(new Error("maxIterations reached"));
            for (let vb of varbinds)
                if (!snmp.isVarbindError(vb))
                    response.push(await vb_transform(vb, mib));
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
async function get_walk(target, comm, options, oids, maxrep, maxIterations) {
    try {
        const session = snmp.createSession(target, comm, options);
        const maxRepetitions = maxrep || 30;
        let resp = {};
        resp.tag = {};
        resp.field = {};
        for await (const oid of Object.keys(oids)) {
            try {
                let mib = oids[oid];
                let type = "tag" in mib && mib.tag ? "tag" : "field";
                resp[type][mib.name] = await streePromisified(session, oid, maxRepetitions, mib, maxIterations);
            } catch (error) {
                if ("error" in resp.tag)
                    resp.tag.error[oids[oid].name] = error.toString();
                else {
                    resp.tag.error = {};
                    resp.tag.error[oids[oid].name] = error.toString();
                }
            }
        }
        session.close();
        return resp;
    } catch (error) {
        console.error(error.toString());
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