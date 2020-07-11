/*jslint node: true */
"use strict";

const readline = require("readline");
const poller = require("../Poller/snmp.js");
const snmp = require("net-snmp");
const {once} = require('events');


const conf = {
    "maxRepetitions": 10,
    "community": "MTA521t3lm3X*wr",
    "maxIterations": 5,
    "options": {
        "version": snmp.Version2c,
        "retries": 2,
        "timeout": 1000,
        "port": 161,
        "backoff": 1,
        "backwardsGetNexts": false,
    }
};

const oids = {
    "1.3.6.1.4.1.4115.1.20.1.1.3.42.1.22": {"name": "rssi"},
    "1.3.6.1.4.1.4115.1.20.1.1.3.42.1.6": {"name": "mac", "type": "hex"}
};

async function process_target(target, comm, opt, oids, masrep, maxite) {
    try {
        let obj = {"tag": {"host": target}, "field": {}};
        let data = await poller.get_walk(target, comm, opt, oids, masrep, maxite);
        obj.field = {...obj.field, ...data.field};
        obj.tag = {...obj.tag, ...data.tag};
        console.log(JSON.stringify(obj));
    } catch (error) {
        console.error(error.toString());
    }
}

async function start() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
    });
    let cnt = 0;
    rl.on("line", (target) => {
        cnt++;
        process_target(target, conf.community, conf.options, oids, conf.maxRepetitions, conf.maxIterations);
    });
    await once(rl, 'close');
    console.error("lines: " + cnt);
}

start();