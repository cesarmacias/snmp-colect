/*jslint node: true */
"use strict";

const readline = require("readline");
const poller = require("./snmp.js");
const args = require("minimist")(process.argv.slice(2));
const fs = require("fs");
const throat = require('throat');

async function filter_vendor(vendorList, mac, oids_get) {
    let vendor = await vendorList.find((vendorItem) => {
        return (
            vendorItem.oui.findIndex((ouiItem) => {
                return ouiItem === mac.substring(0, 6);
            }) !== -1
        );
    });
    let vendorName = vendor ? vendor.vendor : "";
    let keyNames = Object.keys(oids_get);
    let oids = {};
    for await (let key of keyNames) {
        if (!oids_get[key].vendor || oids_get[key].vendor.includes(vendorName))
            oids[key] = oids_get[key];
    }
    return oids;
}

async function process_target(target, comm, opt, oids, vendorList, mac, maxRepetitions, maxIterations) {
    try {
        let get = {};
        let walk = {};
        let obj = {};
        if ("get" in oids) {
            let filterOids = (vendorList && mac) ? await filter_vendor(vendorList, mac, oids.get) : oids.get;
            get = await poller.get_all(target, comm, opt, filterOids);
        }
        if ("walk" in oids) {
            let filterOids = (vendorList && mac) ? await filter_vendor(vendorList, mac, oids.walk) : oids.walk;
            walk = await poller.get_walk(target, comm, opt, filterOids, "array", maxRepetitions, maxIterations);
        }
        for (let k of ["tag", "field"]) {
            obj[k] = {...get[k], ...walk[k]};
        }
        return obj;
    } catch (error) {
        return {"tag": {"CmError": error.message}}
    }
}

async function run(file) {
    try {
        let vendorList, regExp;
        let filter = false;
        const expect = ["options", "community", "iterable"];
        const conf = await poller.read_config(file, expect);
        if ("vendorfile" in conf) {
            const rawdata = fs.readFileSync(conf.vendorfile);
            vendorList = JSON.parse(rawdata);
        }
        if ("filtered" in conf && "filter" in conf) {
            regExp = new RegExp(conf.filter);
            filter = true;
        }
        const ConLimit = "ConLimit" in conf ? conf.ConLimit : 1000;
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false,
        });
        const oids = {"get": conf.oids_get, "walk": conf.oids_walk};
        rl.on("line", throat(ConLimit, async (line) => {
            const obj = JSON.parse(line);
            const target = obj.tag[conf.iterable];
            const MacAddr = obj.tag[conf.filtered];
            let result = {};
            if (target && target !== "0.0.0.0") {
                if (filter) {
                    if (MacAddr && regExp.test(MacAddr)) {
                        result = await process_target(target, conf.community, conf.options, oids, vendorList, MacAddr, conf.maxRepetitions, conf.maxIterations);
                    } else {
                        obj.tag.CmError = "Not Cable Modem";
                    }
                } else {
                    result = await process_target(target, conf.community, conf.options, oids, vendorList, MacAddr, conf.maxRepetitions, conf.maxIterations);
                }
            } else {
                obj.tag.CmError = "Not IP";
            }
            for (let k of ["tag", "field"]) {
                if (result && k in result)
                    obj[k] = {...obj[k], ...result[k]};
            }
            console.log(JSON.stringify(obj));
        }));
    } catch (error) {
        console.error(error);
    }
}

if ("config" in args) {
    run(args.config);
}
