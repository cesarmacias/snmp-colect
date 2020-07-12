/*jslint node: true */
"use strict";

const readline = require("readline");
const poller = require("../Poller/snmp.js");
const events = require("events");
const snmp = require("net-snmp");

const conf = {
    "maxRepetitions": 10,
    "community": "public",
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

let stop = 0;
const ee = new events.EventEmitter();

async function process_target(target, comm, opt, oids, masrep, maxite) {
    try {
        let obj = {"tag": {"host": target}, "field": {}};
        let data = await poller.get_walk(target, comm, opt, oids, masrep, maxite);
        obj.field = {...obj.field, ...data.field};
        obj.tag = {...obj.tag, ...data.tag};
        console.log(JSON.stringify(obj));
        if (stop++ >= cnt)
            ee.emit('stop', stop);
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
    await events.once(rl, 'close');
    await events.once(ee, 'stop');
}

start();