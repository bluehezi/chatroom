"use strict"


const fs = require('fs');
require('./proto.js');
const path = require('path');
const dbDir = path.join(__dirname, 'db'); // 数据库文件存放目录
const dbFile = 'record.blue';  // 数据库文件名称


function blueDb() {

    this.__init();
}
blueDb.prototype = {
    __init: function () {

    },
    create: function () {
        fs.stat(dbDir, (err, stat) => {
            if (err) {
                this.createDbDir(() => {
                    this.createDbFile(); // 创建数据库文件
                });
            } else {
                if (stat.isDirectory()) {
                    fs.stat(path.join(dbDir, dbFile), (err, stat) => {
                        if (err) {
                            this.createDbFile();  // 创建数据库文件
                        } else if (stat.isFile()) {
                            console.log('success'); // 已存在数据库文件
                        }
                    });
                }
            }
        });
    },
    //  重置
    init: function (func) {
        // fs.writeFile(path.join(dbDir, dbFile), JSON.stringify({ dbname: dbFile, record: [] }), err => {
        //     func && func(err);
        // });

        var err = null;
        try {
            fs.writeFileSync(path.join(dbDir, dbFile), JSON.stringify({ dbname: dbFile, record: [] }));
        } catch (error) {
            err = error;
        }
        func && func(err);
    },
    //查
    // 查询
    queryAll: function () {
        let data = fs.readFileSync(path.join(dbDir, dbFile));
        data = data && data.toString();
        return JSON.parse(data);
    },
    // 增
    // 追加数据     对象      追加成功后执行回调
    append: function (dataObj, func) {
        if (dataObj && typeof dataObj === 'object') {
            var data = this.queryAll();
            data.record.push(dataObj);
            let err = null;
            try {
                fs.writeFileSync(path.join(dbDir, dbFile), JSON.stringify(data));
            } catch (error) {
                err = error;
            }
            func && func(err);
            // fs.writeFile(path.join(dbDir, dbFile), JSON.stringify(data), (err) => {
            //     func && func(err);
            // });
        }
    },
    // 改          更改的对象信息  更改后回调
    change: function (objData, func) {
        func && func();
    },
    //删
    // 删除的对象信息   //删除后回调
    deleteData: function (objData, func) {
        func && func();
    },
    // 清除数据库所有数据
    clearDb: function (func) {
        // let data = fs.queryAll();
        // data.record = [];
        // fs.writeFile(path.join(dbDir, dbFile), JSON.stringify(data), (err) => {
        //     func && func(err);
        // });

        fs.writeFile(path.join(dbDir, dbFile), JSON.stringify({ dbname: dbFile, record: [] }), err => {
            func && func(err);
        });

        // var err = null;
        // try {
        //     fs.writeFileSync(path.join(dbDir, dbFile), JSON.stringify({ dbname: dbFile, record: [] }));
        // } catch (error) {
        //     err = error;
        // }
        // func && func(err);


    },
    createDbDir: function (func) {  // 创建文件目录
        fs.mkdir(dbDir, func);
    },
    // 创建数据库文件
    createDbFile: function () {                                 // 数据库的名字        //记录表
        fs.writeFile(path.join(dbDir, dbFile), JSON.stringify({ dbname: dbFile, record: [] }), (err) => {
            if (err) throw err;
            console.log('success');  // 创建成功
        });
    }
};



if (module.parent === null) {
    // 测试
    let recordBean = require('./bean/recordBean.js');
    let blue = new blueDb();
    blue.create();
    blue.append(new recordBean({data: 'hello world!', to: '127.0.0.1', from: '10.9.0.1', type: 'broadcast', nettype: 'tcp' }));
    // blue.clearDb(() => { console.log('清楚成功'); });
    // blue.init();
} else {
    module.exports = blueDb;
}