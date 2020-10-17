/*jslint node: true */
'use strict';

const mysql = require("mysql");
const fs = require("fs");
const argv = require("minimist")(process.argv.slice(2));
const func = require("./tools.js");
/*
    FUNCTION TO RED CONFIG FILE - PREPARE THE LOOP FOR SEARCH
 */
async function main(confFile) {
    try {
        if (fs.existsSync(confFile)) {
            const strConf = fs.readFileSync(confFile, 'utf8');
            const config = JSON.parse(strConf);
            const connection = mysql.createConnection(config.dbOpt);
            connection.connect();
            await connection.query(config.sql, (err, rows) => {
                if (err) throw err;
                rows.forEach((obj) => {
                    console.log(JSON.stringify(func.ObjExpand(obj)));
                });
            });
            connection.end();
        } else throw new func.CustomError('Config', `File ${confFile} was not found.`);
    } catch (e) {
        console.error(e);
    }
}
/*
 STAR PROGRAM
 */
if ("config" in argv) {
    main(argv.config).catch(e => {
        console.error(e);
    });
} else {
    console.error("Not ARG --config with config file path");
}