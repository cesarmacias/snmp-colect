/*jslint node: true */
'use strict';

const readline = require('readline');
const poller = require('./snmp.js');
const args = require('minimist')(process.argv.slice(2));

const reg_filter = /^(?!000308|0005ca|0090ea|002697)[0-9a-f]{6}/;

var val2 = "CmtsCmMac";


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

async function poller_cm(target, obj, conf) {
    poller.get_all(target, conf.community, conf.options, conf.oids_get)
        .then((data) => {
            if ("field" in obj && "field" in data)
                obj.field = Object.assign(obj.field, data.field);
            if ("tag" in obj && "tag" in data)
                obj.tag = Object.assign(obj.tag, data.tag);
        })
        .catch(() => {
                if ("tag" in obj)
                    obj.tag.CmPollerError = true;
            }
        )
        .finally(() => {
                console.log(JSON.stringify(obj));
            }
        );
}

async function run() {
    let expect = ["options", "community", "oids_get", "iterable"];
    poller.read_config(args.config, expect)
        .then(async (conf) => {
            let val = conf.iterable;
            rl.on('line', (line) => {
                let doc = JSON.parse(line);
                if (doc.tag[val] && doc.tag[val] != "0.0.0.0" && doc.tag[val2] && reg_filter.test(doc.tag[val2])){
                    let host = doc.tag[val];
                    poller_cm(host, doc, conf);
                    //setTimeout(() => { poller_cm(host, doc, conf); }, 1000);
                } else {
                    if ("tag" in doc)
                        doc.tag.CmPollerError = true;
                    console.log(JSON.stringify(doc));
                }
            });
        })
        .catch((error) => {
            console.error(error);
        });
}

if ("config" in args)
    run();