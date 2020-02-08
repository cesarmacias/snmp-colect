/*jslint node: true */
'use strict';

const snmp = require("net-snmp");
const async = require("async");
const fs = require("fs");
const args = require('minimist')(process.argv.slice(2));

function feedCb(varbinds) {
    let self = this;
    for (let i = 0; i < varbinds.length; i++) {
        if (snmp.isVarbindError(varbinds[i]))
            console.error(snmp.varbindError(varbinds[i]).toString);
        else {
            let index = varbinds[i].oid.substring(self.mib.oid.length + 1);
            let value = varbinds[i].value;
            let type = "field";
            if (varbinds[i].type == snmp.ObjectType.OctetString)
                if ("type" in self.mib && self.mib.type === "hex")
                    value = varbinds[i].value.toString("hex")
                else
                    value = varbinds[i].value.toString();
            if (varbinds[i].type == snmp.ObjectType.Counter64) {
                value = 0;
                for (let x of varbinds[i].value.values()) {
                    value *= 256;
                    value += x;
                }
            }
            if ("tag" in self.mib && self.mib.tag) type = "tag";
            if (!(index in self.resp)) self.resp[index] = {};
            if (!("tag" in self.resp[index])) self.resp[index].tag = {};
            if (!("field" in self.resp[index])) self.resp[index].field = {};
            self.resp[index][type][self.mib.name] = value;
        }
    }
}

function read_config(file, inh) {
    let promise = new Promise((resolve, reject) => {
        let config;
        try {
            let rawdat = fs.readFileSync(file);
            config = JSON.parse(rawdat);
        } catch {
            reject(new Error("No se puede leer el archivo: " + file));
        }
        inh.forEach((k) => {
            if (!(k in config)) reject(new Error("Falta el parametro: " + k));
        });
        if ("options" in config)
            if ("version" in config.options)
                if (config.options.version == "1")
                    config.options.version = snmp.Version1;
                else
                    config.options.version = snmp.Version2c;
        if (!("maxRepetitions" in config)) configmaxRepetitions = 20;
        resolve(config);
    });
    return promise;
}

function get_table(target, comm, options, oids, max, limit) {
    let promise = new Promise((resolve, reject) => {
        let obj = {};
        let session = snmp.createSession(target, comm, options);
        async.eachLimit(oids, limit, (oid, callback) => {
            session.subtree(oid.oid, max, feedCb.bind({ mib: oid, resp: obj }), (error) => {
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
    return promise;
}

function snmp_get(target, comm, options, oids) {
    let promise = new Promise((resolve, reject) => {
        let session = snmp.createSession(target, comm, options);
        session.get(Object.keys(oids), (error, varbinds) => {
            let resp = {};
            if (error) {
                console.error("get|" + target + "|all|" + error.toString());
            } else {
                resp = varbinds.reduce((vbs, vb) => {
                    if (!(snmp.isVarbindError(vb))) {
                        vbs[oids[vb.oid]] = vb.value;
                        if (vb.type == snmp.ObjectType.OctetString) vbs[oids[vb.oid]] = vb.value.toString();
                    }
                    return vbs;
                }, {});
            }
            session.close();
            resolve(resp);
        });
    });
    return promise;
}

if ("config" in args) {
    let expect = ["hosts", "community", "table"];
    read_config(args.config, expect)
        .then(async (conf) => {
            let func_array = conf.hosts.map(async (target) => {
                const inh = ("inh_oids" in conf) ? await snmp_get(target, conf.community, conf.options, conf.inh_oids) : false;
                let result = [];
                conf.table.forEach(async (table) => {
                    if ("options" in table) {
                        if (!("measurement" in table.options)) {
                            console.error(new Error("no declarado measurement"));
                            return;
                        }
                        if ("time" in table.options && table.options.time)
                            table.options.pollertime = Date.now() / 1000;
                    } else {
                        console.error(new Error("no ha declarado options"));
                        return;
                    }
                    const part = await get_table(target, conf.community, conf.options, table.oids, conf.maxRepetitions, conf.limit);
                    for (let k in part) {
                        let doc = part[k];
                        if ("index" in table.options && table.options.index) doc.tag.index = k;
                        if ("pollertime" in table.options) doc.pollertime = table.options.pollertime;
                        doc.tag.agent_host = target;
                        doc.measurement_name = table.options.measurement;
                        if (inh)
                            for (let i in inh)
                                doc.tag[i] = inh[i];
                        console.log(JSON.stringify(doc));
                    }
                    result.push(part);
                });
                return result;
            });
            await Promise.all(func_array);
        })
        .catch(error => console.error(error.toString()));
} else
    console.error(new Error("--config no definido"));
