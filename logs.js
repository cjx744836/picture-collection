const MAX = 1000;
class Logs {
    constructor() {
        this.buf = [];
    }
    saveLog(data) {
        this.buf.unshift({
            err: data,
            time: formatTime(Date.now())
        });
        if(this.buf.length > MAX) {
            this.buf.pop();
        }
    }
    getLogs() {
        return this.buf;
    }
    clearLogs() {
        this.buf = [];
    }
}

function formatTime(timestamp, format) {
    var time;
    if(!isNaN(timestamp)) {
        time = new Date(Number(timestamp));
    } else {
        time = new Date();
        if(typeof timestamp === 'string' && typeof format === 'undefined') {
            format = timestamp;
        }
    }
    var key = {
        Y: time.getFullYear() < 10 ? '0' + time.getFullYear() : time.getFullYear(),
        M: time.getMonth() + 1 < 10 ? '0' + (time.getMonth() + 1) : time.getMonth() + 1,
        D: time.getDate() < 10 ? '0' + time.getDate() : time.getDate(),
        h: time.getHours() < 10 ? '0' + time.getHours() : time.getHours(),
        m: time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes(),
        s: time.getSeconds() < 10 ? '0' + time.getSeconds() : time.getSeconds(),
        d: time.getDay()
    };
    var _f = function(format) {
        return format.replace(/[YMDhmsd]/g, function(a) {
            return key[a];
        });
    };
    return typeof format === 'string' ? _f(format) : _f('Y-M-D h:m:s');
}

module.exports = new Logs();