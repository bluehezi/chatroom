"use strict"

if (module.parent === null) {

    const net = require('net');         // 导入网络模块
    const fs = require('fs');  // 导入文件模块
    const path = require('path');
    const zlib = require('zlib');  // 载入zlib模块
    const ci = require('./client_module/CommandInput.js'); // 导入命令行输入模块
    const recordBean = require('./client_module/bean/recordBean.js');
    const blueDb = require('./client_module/blue.js');   // 导入数据库模块
    // 初始化数据库
    const db = new blueDb();
    db.create();

    // 导入配置模块
    const configReader = new require('./client_module/configReader.js');
    const config = new configReader(path.join(__dirname, './client.config')).readConfig();

    const PROTOCOL = require('./client_module/protocol.js');

    //获取本地的ip地址
    const LocalIp = require('./client_module/LocalIp.js').getLocalIp()[0];
    // 配置
    const host = config.host;
    const port = config.port;

    fs.stat(config.fileReceiveDir, (err, stat) => {
        if (err) {
            fs.mkdir(config.fileReceiveDir);
        }
    });

    let sendFile = '';  // 发送文件
    let recFile = '';  // 接收文件
    let myName = '';
    let client = null;
    let ynflag = false;
    let fileSourceIp = '';
    // 命令行输入
    ci.input(name => {
        myName = name;
        client = connectServer(myName);
    }, command => {
        // b:127.0.0.1:data


        if (ynflag) {
            if (command === 'y') {
                // console.log('接收文件');
                client.write(JSON.stringify({
                    sourceIp: LocalIp,
                    targetIp: fileSourceIp,
                    protocol_type: PROTOCOL.PROTOCOL_RECEIVE,
                    result: true,
                    purpose: 'receive'
                }));
            } else {
                // console.log('不接收文件');
                client.write(JSON.stringify({
                    sourceIp: LocalIp,
                    targetIp: fileSourceIp,
                    protocol_type: PROTOCOL.PROTOCOL_RECEIVE,
                    result: false,
                    purpose: 'receive'
                }));
            }
            ynflag = false;
            ci.prompt();
        } else {

            // 命令处理
            let d = { sourceIp: LocalIp };

            // 获得当前在线信息
            if (command === 'c') {
                d['protocol_type'] = PROTOCOL.PROTOCOL_CUR;
                // 发送
                client.write(JSON.stringify(d), () => {
                    // 存入数据库
                    db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_CUR, data: '', from: LocalIp, to: host }));
                });
            } else if (command === 'e') {
                process.exit(0); // 退出
            } else if (command === 'lookrecord') {
                let records = db.queryAll().record;
                if (!records.length) {
                    console.log('当前无记录');
                } else {
                    records.forEach((v, i) => {
                        logRecord(v);
                    });
                }
            } else {
                var arr = [];
                var reg = /(\w+):([^:]+):(.+)/;
                if (reg.test(command)) {
                    command.replace(reg, function () {
                        arr.push(arguments[1]);
                        arr.push(arguments[2]);
                        arr.push(arguments[3]);
                    });
                    switch (arr[0]) {
                        case 'b':  // 广播
                            if (arr[1] === '*') {
                                // 发送
                                d['protocol_type'] = PROTOCOL.PROTOCOL_BROADCAST;
                                d['data'] = arr[2];
                                client.write(JSON.stringify(d), () => {
                                    // 存入数据库
                                    db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_BROADCAST, data: `${LocalIp}(我)发送广播: ${arr[2]}`, from: LocalIp, to: arr[1] }));
                                });
                            } else {
                                console.log('输入语法无效');
                                ci.rl.prompt();
                            }
                            break;
                        case 'p':  // 点对点
                            // 发送
                            d['protocol_type'] = PROTOCOL.PROTOCOL_P2P;
                            d['data'] = arr[2];
                            d['targetIp'] = arr[1];
                            // 发送
                            client.write(JSON.stringify(d), () => {
                                // 存入数据库
                                db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_P2P, data: `${LocalIp}(我)向${arr[1]}发送单线信息: ${arr[2]}`, from: LocalIp, to: arr[1] }));
                            });
                            break;
                        case 's':  // 发送文件
                            fs.stat(arr[2], (err, stat) => {
                                if (err) {
                                    console.log('文件不存在');
                                    ci.prompt();
                                    return;
                                }
                                if (stat.size > 1 * 1024 * 1024) {
                                    console.log('文件大小超过1M,不能传送');
                                    ci.prompt();
                                    return;
                                } else {
                                    d['fileSize'] = stat.size;  // 文件大小
                                    d['purpose'] = 'ask';    // 目的:  询问
                                    d['result'] = false;  // 默认 不接收
                                    d['protocol_type'] = PROTOCOL.PROTOCOL_SEND;   // 发送文件类型
                                    d['targetIp'] = arr[1];
                                    d['data'] = path.basename(arr[2]);   // 文件基本名字
                                    if (path.isAbsolute(arr[2])) {
                                        sendFile = arr[2];
                                    } else {
                                        sendFile = path.join(__dirname,arr[2]);
                                    }

                                    client.write(JSON.stringify(d));  // 发送
                                }
                                // console.log(stat);
                            });

                            break;
                        default:
                            console.log('输入语法无效');
                            ci.rl.prompt();
                            break;
                    }
                } else {
                    console.log('输入语法无效');
                    ci.prompt();
                }
            }

        }
    });



    // 连接到服务器
    function connectServer(name) {
        // 连接cons
        const client = net.connect({ host, port }, () => {
            // 'connect' listener
            console.log('connected to server!');
            // 连接服务器后，向服务器发送注册信息
            let data = { sourceIp: LocalIp, protocol_type: PROTOCOL.PROTOCOL_CONNECTION, name: name };
            client.write(JSON.stringify(data), () => {
                // 存入数据库
                db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_CONNECTION, data: '连接服务器成功', from: LocalIp, to: host }));
            });
        });
        // 接收到的数据处理
        client.on('data', (data) => {
            processData(data);
        }).on('end', () => {
            console.log('disconnected from server');
        }).on('error', () => {
            console.log('连接错误: 服务器可能未启动，或者端口被占用,或者连接已断开');
            process.exit(0);
        });
        return client;
    }

    // 输出记录
    function logRecord(value) {

        let header = '----------------------------------------------------';
        let output = header + '\n';
        let temp = '';
        let flag = '';
        for (let key in value) {
            if (value.hasOwnProperty(key)) {
                temp = `${key} : ${value[key].trim()}`;
                if (key === 'data') {
                    flag = '';
                } else {
                    flag = '-';
                }
                // output += 
                let length = getStrRealityLength(temp);
                let j = 0;
                for (; j < Math.floor(length / (header.length - 4)); j++) {
                    output += '- ' + temp.substr(j * (header.length - 4), (j + 1) * (header.length - 4)) + ' ' + flag + '\n'
                }
                let ts = temp.substr(j * (header.length - 4));
                let arr = new Array(header.length + 1 - 4 - ts.length);
                output += '- ' + ts + arr.join(' ') + ' ' + flag + '\n'
            }

        }
        output += '----------------------------------------------------\n';
        console.log(output);
    }

    function getStrRealityLength(str) {
        let length = 0;
        for (let t of str) {
            length += t.charCodeAt(0) > 255 ? 2 : 1;
        }
        return length;
    }

    // 处理来自服务器的数据
    function processData(data) {
        let d = JSON.parse(data.toString());
        if (config.prohibitIp.indexOf(d.sourceIp) !== -1) {  // 拒绝限制ip的消息
            ci.setPromptSelf(myName + ": ");
            return;
        }
        switch (d.protocol_type) {
            case PROTOCOL.PROTOCOL_P2P:  // 处理p2p点对点信息
                p2p({ sourceIp: d.sourceIp, data: d.data, name: d.name });
                break;
            case PROTOCOL.PROTOCOL_BROADCAST: // 处理来自服务器的广播信息
                // {}
                broadcast({ sourceIp: d.sourceIp, data: d.data, name: d.name });
                break;
            case PROTOCOL.PROTOCOL_INFO: // 服务器当前信息

                var output = `当前在线: ${d.data.length}\r\n`;
                d.data.forEach((value, i) => {
                    output += `└─ (${value.ip}):${value.name}\r\n`;
                });
                // 输出在线主机信息
                console.log(output);
                // 存入数据库
                db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_INFO, data: output, from: host, to: LocalIp }));
                break;
            case PROTOCOL.PROTOCOL_OFFLINE:
                offline(d);
                break;
            case PROTOCOL.PROTOCOL_ERROR:
                processErr({ data: d.data });
                break;
            case PROTOCOL.PROTOCOL_RECEIVE:
                receiveFile(d);
                break;
        }
        ci.setPromptSelf(myName + ": ");
    }

    // 接收文件
    function receiveFile(data) {
        // console.log(data);
        fileSourceIp = data.sourceIp;  /// 记录文件来源ip
        if (data.purpose === 'ask') {
            // 是否接收文件
            console.log(`是否接收来自${data.sourceIp}(${data.name})的文件[${data.data},size:${data.fileSize}bytes]?(y/n) `);
            recFile = path.join(__dirname, config.fileReceiveDir, data.data);
            ynflag = true;
        } else if (data.purpose === 'receive') {
            // 接收文件
            if (data.result) {
                console.log('目标确认接收文件,正在发送...');
                // 发送文件

                let readStream = fs.createReadStream(sendFile);

                let contentBuffer = new Buffer(0);
                readStream.pipe(zlib.createGzip()).on('data', chunk => {
                    contentBuffer = Buffer.concat([contentBuffer, chunk]);
                }).on('end', () => {

                    // console.log(content);
                    client.write(JSON.stringify({
                        sourceIp: LocalIp,
                        targetIp: data.sourceIp,
                        protocol_type: PROTOCOL.PROTOCOL_RECEIVE,
                        data: contentBuffer.toJSON().data,
                        result: true,
                        purpose: 'yes'
                    }), () => {
                        console.log('文件发送成功');
                        // 存入数据库
                        db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_SEND, data: `${LocalIp}(我)向${data.sourceIp}发送文件${path.basename(sendFile)}成功`, from: LocalIp, to: data.sourceIp }));
                        ci.prompt();
                    });

                }).on('error', err => {
                    console.log('文件发送失败...');
                    //
                    // 存入数据库
                    db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_SEND, data: `${LocalIp}(我)向${data.sourceIp}发送文件${path.basename(sendFile)}失败`, from: LocalIp, to: data.sourceIp }));

                    return;
                });
                // fs.readFile(sendFile, (err, chunk) => {
                //     if (err) {
                //         console.log('文件发送失败...');
                //         return;
                //     }
                //     console.log(chunk.toString());
                //     client.write(JSON.stringify({
                //         sourceIp: LocalIp,
                //         targetIp: data.sourceIp,
                //         protocol_type: PROTOCOL.PROTOCOL_RECEIVE,
                //         data: chunk.toString(),
                //         result: true,
                //         purpose: 'yes'
                //     }), () => {
                //         console.log('文件发送成功');
                //         ci.prompt();
                //     });
                // });


            } else {
                console.log('目标拒绝接收文件');
            }
        } else if (data.purpose === 'yes') {  // 接收文件

            // fs.stat(recFile, (err, stat) => {
            // console.log("---"+data.data);

            // fs.createWritetream();

            let writeStream = fs.createWriteStream(recFile);
            writeStream.on('finish', () => {
                console.log('文件接收成功');
                // 存入数据库

                db.append(new recordBean({
                    nettype: 'tcp', type: PROTOCOL.PROTOCOL_RECEIVE,
                    data: `${data.sourceIp}向${LocalIp}(我)发送文件${path.basename(recFile)}成功`,
                    from: data.sourceIp, to: LocalIp
                }));
                ci.prompt();
            }).on('error', () => {
                console.log('文件接收失败');
                // 存入数据库
                db.append(new recordBean({
                    nettype: 'tcp', type: PROTOCOL.PROTOCOL_RECEIVE,
                    data: `${data.sourceIp}向${LocalIp}(我)发送文件${path.basename(recFile)}失败`,
                    from: data.sourceIp, to: LocalIp
                }));
                ci.prompt();
            });
            writeStream.write(zlib.gunzipSync(new Buffer(data.data)).toString(), () => {
                writeStream.end('');
            });


            // fs.writeFile(recFile, data.data, (err) => {
            //     if (err) {
            //         console.log('文件接收失败');
            //         return;
            //     }
            //     console.log('文件接收成功: ' + recFile);
            //     ci.prompt();
            // });

            // });

        }

    }

    // 处理来自服务器的信息
    function processErr(data) {
        console.log(data.data);
        // 存入数据库
        db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_ERROR, data: data.data, from: host, to: LocalIp }));
    }

    function p2p(data) {
        console.log(`来自${data.sourceIp}(${data.name})的专线信息: ${data.data}`);
        // 存入数据库
        db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_BROADCAST, data: `来自${data.sourceIp}(${data.name})的专线信息: ${data.data}`, from: data.sourceIp, to: LocalIp }));
    }

    function offline(d) {
        console.log(`${d.offlineIp}(${d.name})已下线`);
        // 存入数据库
        db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_OFFLINE, data: `${d.offlineIp}(${d.name})已下线`, from: host, to: LocalIp }));
    }

    function broadcast(data) {
        console.log(`收到来自${data.sourceIp}(${data.name}) 的广播消息: ${data.data}`);
        // 存入数据库
        db.append(new recordBean({ nettype: 'tcp', type: PROTOCOL.PROTOCOL_BROADCAST, data: `收到来自${data.sourceIp}(${data.name}) 的广播消息: ${data.data}`, from: data.sourceIp, to: '*' }));
    }
}
