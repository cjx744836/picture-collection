const http = require('http');
const https = require('https');
let reqTIMEOUT = 5000;
let resTIMEOUT = 60000;

let options = {
    method: 'get',
    headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
    },
    rejectUnauthorized: false
};
let redirect_count = 0;
let retry = 0;

function isHttps(host) {
    return /^https/.test(host);
}

function get(url, options) {
    return new Promise((resolve, reject) => {
            let adapter = isHttps(url) ? https : http;
            let err = '', data = '', redirect = '';
            let rawData = Buffer.alloc(0);
            let req = adapter.request(url, options, function(res) {
                let code = res.statusCode;
                if(code >= 300 && code < 400) {
                    if(res.headers.location) {
                        redirect_count++;
                        if (redirect_count > 5) return err = new Error(`重定向次数太多 ${url}`);
                        redirect = new URL(res.headers.location, url);
                    } else {
                        err = new Error(`重定向失败 ${url}`);
                    }
                } else {
                    if(code !== 200) return err = new Error(`错误状态码 ${code} ${url}`);
                    res.setTimeout(resTIMEOUT, () => {
                        res.destroy();
                        err = new Error(`响应超时 ${url}`);
                    });
                    res.on('data', chunk => {
                        rawData = Buffer.concat([rawData, chunk], rawData.length + chunk.length);
                    });
                    res.on('end', () => {
                        data = {data: rawData, url: url, type: res.headers['content-type']};
                    });
                    res.on('error', e => {
                        if(res.destroyed) return;
                        err = {message: `${e.message} ${url}`};
                    });
                }
            });
        req.setTimeout(reqTIMEOUT, () => {
            req.destroy();
            err = new Error(`请求超时 ${url}`);
        });
        req.on('error', (e) => {
            if(req.destroyed) return;
            err = {message: `${e.message} ${url}`};
        });
        req.on('close', () => {
            if(redirect) return get(redirect, options).then(res => resolve(res)).catch(err => reject(err));
            if(err) return reject(err);
            resolve(data);
        });
        req.end();
    });
}

function merge(o, s) {
    let k1 = Object.keys(s);
    let k2 = Object.keys(o);
    k1.forEach(key => {
       if(k2.indexOf(key)) {
           if(typeof s[key] === 'object') {
               merge(o[key], s[key]);
           } else {
               o[key] = s[key];
           }
       } else {
           o[key] = s[key];
       }
    });
}

module.exports = function(url, ops, timeout) {
    redirect_count = 0;
    reqTIMEOUT = timeout.reqTimeout || reqTIMEOUT;
    resTIMEOUT = timeout.resTimeout || resTIMEOUT;
    merge(options, ops);
    return get(url, options);
};
