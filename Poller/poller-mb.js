/*jslint node: true */
"use strict";

const readline = require("readline");
const poller = require("./snmp.js");
const args = require("minimist")(process.argv.slice(2));
const fs = require("fs");

const reg_filter = /^(?!000308|0005ca|0090ea|002697)[0-9a-f]{6}/;

var val2 = "CmtsCmMac";

const rl = readline.createInterface({
  input: fs.createReadStream("../snmp-colect/lst-cm.json"),
  output: process.stdout,
  terminal: false,
});

let rawdata = fs.readFileSync("../snmp-colect/vendor-list.json");
let vendorList = JSON.parse(rawdata);
console.log(vendorList);

function filterOids_get(oids_get, vendorName) {
  let keyNames = Object.keys(oids_get);
  let oids = {};
  keyNames.forEach((key) => {
    if (!oids_get[key].vendor || oids_get[key].vendor.includes(vendorName))
      oids[key] = oids_get[key];
  });

  return oids;
}

async function poller_cm(target, obj, conf) {
  poller
    .get_all(target, conf.community, conf.options, conf.oids_get)
    .then((data) => {
      if ("field" in obj && "field" in data)
        obj.field = Object.assign(obj.field, data.field);
      if ("tag" in obj && "tag" in data)
        obj.tag = Object.assign(obj.tag, data.tag);
    })
    .catch(() => {
      if ("tag" in obj) obj.tag.CmSnmpError = true;
    })
    .finally(() => {
      console.log(JSON.stringify(obj));
    });
}

async function run() {
  let expect = ["options", "community", "oids_get", "iterable"];
  poller
    .read_config(args.config, expect)
    .then(async (conf) => {
      let val = conf.iterable;
      rl.on("line", (line) => {
        let doc = JSON.parse(line);

        let host = doc.tag[val];
        let macAddress = doc.tag[val2];

        let vendor = vendorList.find((vendorItem) => {
          return (
            vendorItem.oui.findIndex((ouiItem) => {
              return ouiItem == macAddress.substring(0, 6);
            }) != -1
          );
        });

        if (
          host &&
          host !== "0.0.0.0" &&
          macAddress &&
          reg_filter.test(macAddress) &&
          vendor
        ) {
          let vendorName = vendor.vendor;
          conf.oids_get = filterOids_get(conf.oids_get, vendorName);
          poller_cm(host, doc, conf);
          //setTimeout(() => { poller_cm(host, doc, conf); }, 1000);
        } else {
          if ("tag" in doc) doc.tag.CmPollerError = true;
          console.log(JSON.stringify(doc));
        }
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

if ("config" in args) run();
