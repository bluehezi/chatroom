"use strict"

const fs = require('fs');
const path = require('path');

module.exports = function (configFile) {
    this.config = configFile;
    this.readConfig = function () {
        var data = fs.readFileSync(this.config);
        data = data && data.toString();
        data = JSON.parse(data);
        var index = data.prohibitIp.indexOf(data.host);
        index !== -1 ? data.prohibitIp.splice(index,1) : null;
        return data;
    }
};