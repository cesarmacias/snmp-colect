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

/* Funcion para procesar los datos obtenidos de un snmpwalk a un dispositivo, los valores los asocia a "field" o "tag"
 *  * */
async function feedCb(varbinds) {
    let self = this;
    for (let i = 0; i < varbinds.length; i++) if (snmp.isVarbindError(varbinds[i])) {
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
 *  * */
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
        if (!("limit" in config)) config.limit = 3;
        if (!("time" in config)) config.time = true;
        resolve(config);
    });
}

/* Funcion para obtener datos los datos tipo tabla (indice compartido) por SNMP
 *  * */
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
    return new Promise((resolve, reject) => {
        let session = snmp.createSession(target, comm, options);
        let _oids = Object.keys(oids);
        let resp = {};
        resp.tag = {};
        resp.field = {};
        session.get(_oids, (error, varbinds) => {
            if (error) {
                reject(error);
            } else {
                for (const vb of varbinds) {
                    if (!(snmp.isVarbindError(vb))) {
                        let type = "field";
                        if ("tag" in oids[vb.oid] && oids[vb.oid].tag)
                            type = "tag";
                        let name = oids[vb.oid].name;
                        let value = vb.value;
                        if (vb.type === snmp.ObjectType.OctetString) {
                            value = vb.value.toString();
                            if ("type" in oids[vb.oid] && oids[vb.oid].type === "hex")
                                value = vb.value.toString("hex");
                            if ("type" in oids[vb.oid] && oids[vb.oid].type === "regex") {
                                if ("regex" in oids[vb.oid] && "map" in oids[vb.oid]) {
                                    let arr = value.match(new RegExp(oids[vb.oid].regex));
                                    if (arr) {
                                        value = {};
                                        for (let i = 1, len = oids[vb.oid].map.length; i <= len; i++)
                                            value[oids[vb.oid].map[i - 1]] = arr[i];
                                    }
                                }
                            }
                        }
                        if (vb.type === snmp.ObjectType.Counter64) {
                            value = 0;
                            for (let x of vb.value.values()) {
                                value *= 256;
                                value += x;
                            }
                        }
                        resp[type][name] = value;
                    }
                }
                resolve(resp);
            }
            session.close();
        });
    });
}

module.exports = {
    get_table,
    get_oids,
    get_all,
    read_config
};