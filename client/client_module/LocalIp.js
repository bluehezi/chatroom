"use strict"
// 获得本机ip地址
function getLocalIp() {
    var os = require('os');
    let iptable = [];
    let ifaces = os.networkInterfaces();
    let ips = ifaces['WLAN'] || ifaces['以太网'];
    ips.forEach(function (details, alias) {
        if (details.family === 'IPv4') {
            iptable.push(details.address);
        }
    });
    return iptable;
}

module.exports = {
    getLocalIp
};

