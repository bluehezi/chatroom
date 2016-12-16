// 封装命令行输入模块
"use strict"

// 导入模块
const readline = require('readline');
function ReadLine() {
    this._init();

}

ReadLine.prototype = {
    _init: function () {
        this.rl = readline.createInterface(process.stdin, process.stdout);
    },
    input:
    // param1 名字输入后，回调
    // param2 输入command后，回调
    function (func1, func2) {
        // input your name
        this.rl.question('What is your name? ', (answer) => {
            console.log('Welcome ', answer);
            if (answer.trim()) {
                try {
                    // 执行 回调函数func1
                    func1(answer.trim());
                } catch (err) {
                    // 如果有错误，则退出
                    console.log(err);
                    process.exit(0);
                }
                this.selfPrompt(answer.trim(), func2);
            } else {
                console.log("没有名字请走开");
                this.rl.close();
            }
        });
    },
    selfPrompt:// 输入信息
    function (name, func) {
        let command = '';
        // 设置提示
        this.rl.setPrompt(name + ': ');
        this.rl.prompt();

        this.rl.on('line', (line) => {
            if (line.trim()) {
                command = line.trim();
                func(command);
            }
            this.rl.prompt();
        }).on('close', () => {
            console.log('Have a great day!');
            process.exit(0);
        });
    },
    prompt:function(){
        this.rl.prompt();
    },
    setPromptSelf(mess){
        this.rl.setPrompt(mess);
        this.prompt();
    }

};






// 如果没有被引用，则执行
if (module.parent === null) {
    new ReadLine().input((command) => {
        console.log(command);
    },(command)=>{
        console.log(command);
    });
} else { // 如果被引入，则导出
    module.exports = new ReadLine();
}



