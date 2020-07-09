/*jslint node: true */
"use strict";

const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

rl.on( "line", (line) => {
    console.log(line);
} );
