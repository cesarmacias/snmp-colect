/*jslint node: true */
'use strict';

const snmp = require("net-snmp");

const options = {
    "maxRepetitions": 3,
    "community": "MTA521t3lm3X*wr",
    "snmpOpt": {
        "version": snmp.Version2c,
        "retries": 5,
        "timeout": 1000,
        "port": 161
    }
};

const hosts = [
    "10.36.143.179",
    "10.36.224.168",
    "10.36.135.64",
    "10.36.213.51",
    "10.36.197.98",
    "10.36.168.94"
];

const oids = [
    "1.3.6.1.4.1.4115.1.20.1.1.3.42.1.22",
    "1.3.6.1.4.1.4115.1.20.1.1.3.42.1.6"
];

function tablePromisified(host, oid, options) {
    return new Promise(function (resolve, reject) {
        const session = snmp.createSession(host, options.community, options.snmpOpt);
        session.table(oid, options.maxRepetitions, function (error, table) {
            if (error) {
                reject(error.toString());
            } else {
                resolve(table);
            }
        });
    });
}

async function start() {
    try {
        for (const target of hosts) {
            for await (const oid of oids) {
                let table = await tablePromisified(target, oid, options);
                console.log(table);
            }
        }
    } catch (error) {
        console.log(error);
    }
}

start();