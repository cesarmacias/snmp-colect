/*jslint node: true */
"use strict";

import poller from "./snmp.js";

import readline from "readline";

import fs from "fs";

const args = require( "minimist" )( process.argv.slice( 2 ) );
//const reg_filter = /^(?!000308|0005ca|0090ea|002697)[0-9a-f]{6}/;

//const val2 = "CmtsCmMac";

const rl = readline.createInterface( {
    input: process.stdin,
    output: process.stdout,
    terminal: false,
} );

function filterOids_get(oids_get, vendorName) {
    let keyNames = Object.keys( oids_get );
    let oids = {};
    keyNames.forEach( (key) => {
        if (!oids_get[key].vendor || oids_get[key].vendor.includes( vendorName ))
            oids[key] = oids_get[key];
    } );
    return oids;
}

async function poller_cm(target, obj, conf) {
    let all = "oids_walk" in conf ? {...conf.oids_get, ...conf.oids_walk} : conf.oids_get;
    poller
        .get_bulk( target, conf.community, conf.options, all, Object.keys( conf.oids_get ).length )
        .then( (data) => {
            if ("field" in obj && "field" in data)
                obj.field = {...obj.field, ...data.field};
            if ("tag" in obj && "tag" in data)
                obj.tag = {...obj.tag, ...data.tag};
        } )
        .catch( () => {
            if ("tag" in obj) obj.tag.CmSnmpError = true;
        } )
        .finally( () => {
            console.log( JSON.stringify( obj ) );
        } );
}

async function run() {
    let expect = ["options", "community", "oids_get", "iterable", "filtered", "filter", "vendorfile"];
    poller
        .read_config( args.config, expect )
        .then( async (conf) => {
            const rawdata = fs.readFileSync( conf.vendorfile );
            const vendorList = JSON.parse( rawdata );
            const reg_filter = new RegExp( conf.filter );
            rl.on( "line", (line) => {
                let doc = JSON.parse( line );
                let host = doc.tag[conf.iterable];
                let macAddress = doc.tag[conf.filtered];
                if (
                    host &&
                    host !== "0.0.0.0" &&
                    macAddress &&
                    reg_filter.test( macAddress )
                ) {
                    let vendor = vendorList.find( (vendorItem) => {
                        return (
                            vendorItem.oui.findIndex( (ouiItem) => {
                                return ouiItem === macAddress.substring( 0, 6 );
                            } ) !== -1
                        );
                    } );
                    let vendorName = vendor ? vendor.vendor : "";
                    let confOids_getFiltered = {
                        ...conf,
                        oids_get: filterOids_get( conf.oids_get, vendorName ),
                    };
                    poller_cm( host, doc, confOids_getFiltered );
                } else {
                    if ("tag" in doc) doc.tag.CmPollerError = true;
                    console.log( JSON.stringify( doc ) );
                }
            } );
        } )
        .catch( (error) => {
            console.error( error );
        } );
}

if ("config" in args) {
    run();
}
