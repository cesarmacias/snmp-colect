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
    "10.36.136.96",
    "172.20.17.64",
    "10.36.213.51",
    "10.36.197.98",
    "10.36.168.94"
];

const oids = [
    "1.3.6.1.4.1.4115.1.20.1.1.3.42.1.22",
    "1.3.6.1.4.1.4115.1.20.1.1.3.42.1.6"
];

function streePromisified(session, oid, maxRepetitions) {
    return new Promise(function (resolve, reject) {
        let resp = [];
        session.subtree(oid, maxRepetitions, (varbinds) => {
            for (let vb of varbinds) {
                if (snmp.isVarbindError(vb))
                    console.error(snmp.varbindError(vb));
                else
                    resp.push(vb.value);
            }
        }, (error) => {
            if (error)
                console.error(error.toString());
            else
                resolve(resp);
        });
    });
}

async function start() {
    try {
        for (const target of hosts) {
            console.log("debug0:" + target);
            const session = snmp.createSession(target, options.community, options.snmpOpt);
            for await (const oid of oids) {
                let table = await streePromisified(session, oid, options.maxRepetitions);
                console.dir(table);
            }
            console.log("debug1:" + target);
            session.close();
        }
    } catch (error) {
        console.error(error.toString());
    }
}

start();