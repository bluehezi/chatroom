function recordBean(options) {
    this.time = (new Date()).format("yyyy-MM-dd hh:mm:ss.f");
    this.data = options.data;
    this.to = options.to;
    this.from = options.from;
    this.type = options.type;
    this.nettype = options.nettype;
}

module.exports = recordBean;

