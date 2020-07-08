/*jslint node: true */
'use strict';

const poller = require('./snmp.js');
const args = require('minimist')(process.argv.slice(2));

async function run() {
    let expect = ["hosts", "options", "community"];
    poller.read_config(args.config, expect)
        .then(async (conf) => {
            let func_array = conf.hosts.map(async (target) => {
                if (conf.time)
                    conf.pollertime = Date.now() / 1000;
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
            });
            await Promise.all(func_array);
        })
        .catch(error => console.error(error.toString()));
}

if ("config" in args) {
    run();
}