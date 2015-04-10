"use strict";
var nconf = require('nconf');
nconf.argv().env().file({file: '../config.json'});
console.log("nconf:", nconf.get("port"));
module.exports = nconf;