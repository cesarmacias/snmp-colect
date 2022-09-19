#!/usr/bin/env node
/* eslint-disable no-mixed-spaces-and-tabs */
"use strict";

const readline = require("readline");
const poller = require("./snmp.js");
const args = require("minimist")(process.argv.slice(2));
const fs = require("fs");
const throat = require("throat");
const merge = require("deepmerge");

async function filter_vendor(vendorList, mac, oids_get) {
  let vendor = vendorList.find((vendorItem) => {
    return (
      vendorItem.oui.findIndex((ouiItem) => {
        return ouiItem === mac.substring(0, 6);
      }) !== -1
    );
  });
  let vendorName = vendor ? vendor.vendor : "";
  let keyNames = Object.keys(oids_get);
  let oids = {};
  for (let key of keyNames) {
    if (!oids_get[key].vendor || oids_get[key].vendor.includes(vendorName))
      oids[key] = oids_get[key];
  }
  return oids;
}

async function process_target(
  target,
  comm,
  opt,
  user,
  oids,
  vendorList,
  mac,
  maxRepetitions,
  maxIterations
) {
  let session = await poller.create_session(target, opt, comm, user);
  let test = await poller.snmp_test(
    target,
    comm,
    JSON.parse(JSON.stringify(opt))
  );
  if (test === undefined) {
    try {
      let obj = {};
      if ("get" in oids && oids.get) {
        let filterOids =
          vendorList && mac
            ? await filter_vendor(vendorList, mac, oids.get)
            : oids.get;
        let part = await poller.get_all(target, session, filterOids);
        obj = merge(obj, part);
      }
      if ("walk" in oids && oids.walk) {
        let filterOids =
          vendorList && mac
            ? await filter_vendor(vendorList, mac, oids.walk)
            : oids.walk;
        let part = await poller.get_walk(
          target,
          session,
          filterOids,
          "array",
          maxRepetitions,
          maxIterations
        );
        obj = merge(obj, part);
      }
      session.close();
      return obj;
    } catch (error) {
      return { tag: { CmError: error.message } };
    }
  } else {
    return { snmperror: { host: test } };
  }
}

async function run(file) {
  try {
    let vendorList, regExp;
    let filter = false;
    const expect = ["options", "community", "iterable"];
    const conf = await poller.read_config(file, expect);
    if ("vendorfile" in conf) {
      const rawdata = fs.readFileSync(conf.vendorfile, "utf8");
      vendorList = JSON.parse(rawdata);
    }
    if ("filtered" in conf && "filter" in conf) {
      regExp = new RegExp(conf.filter);
      filter = true;
    }
    const ConLimit = "ConLimit" in conf ? conf.ConLimit : 3000;
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    let oids;
    if ("oids_get" in conf) {
      oids =
        "oids_walk" in conf
          ? { get: conf.oids_get, walk: conf.oids_walk }
          : { get: conf.oids_get };
    } else {
      oids = { walk: conf.oids_walk };
    }
    rl.on(
      "line",
      throat(ConLimit, async (line) => {
        let obj = JSON.parse(line);
        const target = obj.tag[conf.iterable];
        const MacAddr = "filtered" in conf ? obj.tag[conf.filtered] : undefined;
        let result = {};
        if (target && target !== "0.0.0.0") {
          if (filter) {
            if (MacAddr && regExp.test(MacAddr)) {
              result = await process_target(
                target,
                conf.community,
                conf.options,
                conf.user,
                oids,
                vendorList,
                MacAddr,
                conf.maxRepetitions,
                conf.maxIterations
              );
            } else {
              obj.tag.CmError = "Not Cable Modem";
            }
          } else {
            result = await process_target(
              target,
              conf.community,
              conf.options,
              conf.user,
              oids,
              vendorList,
              MacAddr,
              conf.maxRepetitions,
              conf.maxIterations
            );
          }
        } else {
          obj.tag.CmError = "Not IP";
        }
        obj = merge(obj, result);
        if ("measurement" in conf) {
          obj.measurement_name = conf.measurement;
        }
        console.log(JSON.stringify(obj));
      })
    );
  } catch (error) {
    console.error(error);
  }
}

if ("config" in args) {
  run(args.config).catch((error) => {
    console.error(error);
  });
} else {
  console.error("Not defined --config");
}
