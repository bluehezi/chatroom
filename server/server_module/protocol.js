class Protocol {
    constructor() {
        this.PROTOCOL_CONNECTION = 'connection'; // 连接    // {sourceIp:localIp,protocol_type:"connection",name:'岳志辉'} 
        this.PROTOCOL_BROADCAST = 'broadcast';   // 广播    // {sourceIp:localIp,protocol_type:"broadcast",name:'岳志辉',data:'xxxx'}
        this.PROTOCOL_P2P = 'p2p';   // 点对点
        this.PROTOCOL_INFO = 'info';  // 连接后服务器返回
        this.PROTOCOL_CUR = 'cur';  // 获取当前在线信息
        this.PROTOCOL_OFFLINE = 'offline'; // 下线用户通知
        this.PROTOCOL_ERROR = 'error'; //错误信息

        this.PROTOCOL_SEND = 'send';   // 发送文件
        this.PROTOCOL_RECEIVE = 'receive';  // 接收文件
    }
}

let s = Symbol.for('protocol');
global[s] = global[s] || new Protocol();

module.exports = global[s];