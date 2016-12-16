"use strict"

if (module.parent === null) {
    var net = require('net');

    const PROTOCOL = require('./server_module/protocol.js');

    var host = '127.0.0.1';
    var port = 3030;
    var clients = {};  // 客户端

    var server = net.createServer(socket => {
        socket.on('data', data => {
            processData(data, socket);
        }).on('error', err => {
            // 当某一个链接断开后，处理
            // 判断是哪个链接断开，并记录下来
            var offline = '';
            for (let key in clients) {
                if (clients.hasOwnProperty(key)) {
                    if (clients[key].socket === socket) {
                        offline = key;
                    }
                }
            }

            // 向其他在线用户发送下线信息
            for (let key in clients) {
                if (clients.hasOwnProperty(key)) {
                    if (key !== offline) {
                        clients[key].socket.write(JSON.stringify({ protocol_type: PROTOCOL.PROTOCOL_OFFLINE, offlineIp: clients[offline].ip, name: clients[offline].name }));
                    }
                }
            }
            // 清楚下线用户
            process.nextTick(() => { delete clients[offline] });

        });
    });

    // 开始监听
    server.listen({
        host: host, port: port
    }, () => {
        var address = server.address();
        console.log('opened server on %j', address);
    });


    // 处理来自客户端的数据
    function processData(data, socket) {
        // console.log(typeof data);
        // console.log(data.toString());
        let d = JSON.parse(data.toString());
        switch (d.protocol_type) {
            case PROTOCOL.PROTOCOL_CONNECTION:
                connect({ ip: d.sourceIp, name: d.name }, socket);
                break;
            case PROTOCOL.PROTOCOL_P2P:
                p2p({ data: d.data, sourceIp: d.sourceIp, targetIp: d.targetIp });
                break;
            case PROTOCOL.PROTOCOL_BROADCAST:
                broadcast({ sourceIp: d.sourceIp, data: d.data });
                break;
            case PROTOCOL.PROTOCOL_CUR:
                sendCur(socket);
                break;
            case PROTOCOL.PROTOCOL_SEND:
                sendfile(d);
                break;
            case PROTOCOL.PROTOCOL_RECEIVE:
                receiveFile(d);
                break;
        }
    }


    // 接收文件
    function receiveFile(data) {
        if (clients.hasOwnProperty(data.targetIp)) {

            clients[data.targetIp].socket.write(JSON.stringify(
                {
                    sourceIp: data.sourceIp, name: clients[data.sourceIp].name, protocol_type: PROTOCOL.PROTOCOL_RECEIVE,
                    purpose: data.purpose, result: data.result,data:data.data
                }
            ));

        } else {
            clients[data.sourceIp].socket.write(JSON.stringify({ protocol_type: PROTOCOL.PROTOCOL_ERROR, data: '目标用户未在线'}));
        }

    }

    // 发送文件
    function sendfile(data) {
        if (clients.hasOwnProperty(data.targetIp)) {

            clients[data.targetIp].socket.write(JSON.stringify(
                {
                    sourceIp: data.sourceIp, data: data.data, name: clients[data.sourceIp].name, protocol_type: PROTOCOL.PROTOCOL_RECEIVE,
                    size: data.size, fileSize: data.fileSize, purpose: data.purpose, result: data.result
                }
            ));
        } else {
            clients[data.sourceIp].socket.write(JSON.stringify({ protocol_type: PROTOCOL.PROTOCOL_ERROR, data: '目标用户未在线' }));
        }
    }

    // 发送当前信息
    function sendCur(socket) {
        let backData = { sourceIp: 'server', protocol_type: PROTOCOL.PROTOCOL_INFO };
        backData['data'] = getOnlineInfo();
        socket.write(JSON.stringify(backData));
    }
    // 连接处理  // 存储客户端
    function connect(obj, socket) {
        clients[obj.ip] = { ip: obj.ip, name: obj.name, socket: socket };
        // console.log(clients);
        let backData = { sourceIp: 'server', protocol_type: PROTOCOL.PROTOCOL_INFO };
        backData['data'] = getOnlineInfo();
        socket.write(JSON.stringify(backData));
    }

    // 获得当前在线列表的信息
    function getOnlineInfo() {
        let list = [];
        for (let key in clients) {
            list.push({ ip: clients[key].ip, name: clients[key].name });
        }
        return list;
    }

    // 分发信息
    function broadcast(data) {
        for (let key in clients) {
            if (key !== data.sourceIp) {
                clients[key].socket.write(JSON.stringify({ name: clients[key].name, protocol_type: PROTOCOL.PROTOCOL_BROADCAST, data: data.data, sourceIp: data.sourceIp }));
            }
        }
    }

    // 点对点数据处理
    function p2p(data) {
        // console.log(data);
        if (clients.hasOwnProperty(data.targetIp)) {
            clients[data.targetIp].socket.write(JSON.stringify({ sourceIp: data.sourceIp, data: data.data, name: clients[data.sourceIp].name, protocol_type: PROTOCOL.PROTOCOL_P2P }));
        } else {
            clients[data.sourceIp].socket.write(JSON.stringify({ protocol_type: PROTOCOL.PROTOCOL_ERROR, data: '目标用户未在线' }));
        }
    }
}

