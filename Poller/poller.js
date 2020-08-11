/*jslint node: true */
'use strict';

const readline = require("readline");
const poller = require("./snmp.js");
const args = require("minimist")(process.argv.slice(2));
const fs = require("fs");
const throat = require('throat');
const addr = require("ip-address");

async function process_target(target, conf) {
    const inh = ("inh_oids" in conf) ? await poller.get_oids(target, conf.community, conf.options, conf.inh_oids) : false;
    let result = [];
    if ("table" in conf) {
        for (const table of conf.table) {
            if ("options" in table) {
                if (!("measurement" in table.options)) {
                    console.error(new Error("no declarado measurement"));
                    continue;
                }
            } else {
                console.error(new Error("no ha declarado options"));
                continue;
            }
            const part = await poller.get_table(target, conf.community, conf.options, table.oids, conf.maxRepetitions, conf.limit);
            for (let k in part) {
                let doc = part[k];
                if ("index" in table.options && table.options.index) doc.tag.index = k;
                if ("pollertime" in conf) doc.pollertime = conf.pollertime;
                doc.tag.agent_host = target;
                doc.measurement_name = table.options.measurement;
                if (inh)
                    for (let i in inh)
                        doc.tag[i] = inh[i];
                console.log(JSON.stringify(doc));
            }
            result.push(part);
        }
    }
    if ("oids_get" in conf && "measurement" in conf) {
        const doc = await poller.get_all(target, conf.community, conf.options, conf.oids_get);
        doc.measurement_name = conf.measurement;
        doc.tag.agent_host = target;
        if ("pollertime" in conf) doc.pollertime = conf.pollertime;
        if (inh)
            for (let i in inh) doc.tag[i] = inh[i];
        console.log(JSON.stringify(doc));
        result.push(doc);
    }
    return result;
}

async function start() {
    try {
        let expect = ["hosts", "options", "community"];
        let conf = await poller.read_config(args.config, expect);
        if (conf.time)
            conf.pollertime = Date.now() / 1000;
        if (typeof conf.hosts === 'string') {
            if (fs.existsSync(conf.hosts)) {
                const readInterface = readline.createInterface({
                    input: fs.createReadStream(conf.hosts),
                    output: process.stdout,
                    console: false
                });
                readInterface.on("line", throat(ConLimit, async (target) => {
                    if (typeof target === 'string') {
                        let ipv4 = new addr.Address4(target);
                        if (ipv4.isValid()) {
                            await process_target(target, conf);
                        }
                    }
                }));
            } else {
                cosole.error('The file of hosts does not exist');

            }
        } else if (typeof conf.hosts === 'object' && Array.isArray(conf.hosts)) {
            await Promise.all(conf.hosts.map(throat(ConLimit, async (target) => {
                if (typeof target === 'string') {
                    let ipv4 = new addr.Address4(target);
                    if (ipv4.isValid()) {
                        await process_target(target, conf);
                    }
                }
            })));
        }
    } catch (error) {
        console.error(error.toString());
    }
}

if ("config" in args) {
    start();
}