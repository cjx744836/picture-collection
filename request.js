const http = require('http');
const https = require('https');
const zlib = require('zlib');
let reqTIMEOUT = 5000;
let resTIMEOUT = 60000;
let retry = 3;

let options = {
    method: 'get',
    headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
    },
    rejectUnauthorized: false
};
let redirect_count = 0;
let retry_count = 0;

function isHttps(host) {
    return /^https/.test(host);
}

function get(url, options) {
    return new Promise((resolve, reject) => {
            let adapter = isHttps(url) ? https : http;
            let err = '', data = '', redirect = '', timeout = '';
            let rawData = Buffer.alloc(0);
            let req = adapter.request(url, options, function(res) {
                let code = res.statusCode;
                if(code >= 300 && code < 400) {
                    if(res.headers.location) {
                        redirect_count++;
                        if (redirect_count > 5) return err = new Error(`重定向次数太多`);
                        redirect = new URL(res.headers.location, url);
                    } else {
                        err = new Error(`重定向失败`);
                    }
                } else {
                    if(code !== 200) return err = new Error(`错误状态码${code}`);
                    res.setTimeout(resTIMEOUT, () => {
                        res.destroy(new Error(`响应超时`));
                        timeout = 1;
                    });
                    res.on('data', chunk => {
                        rawData = Buffer.concat([rawData, chunk], rawData.length + chunk.length);
                    });
                    res.on('end', () => {
                        if(isZip(res.headers['content-encoding'])) rawData = zlib.unzipSync(rawData);
                        else if(isDeflate(res.headers['content-encoding'])) rawData = zlib.undeflateSync(rawData);
                        data = {data: rawData, url: url, type: res.headers['content-type']};
                    });
                    res.on('error', e => {
                        parseError(e);
                        err = {message: `${e.message}`};
                    });
                }
            });
        req.setTimeout(reqTIMEOUT, () => {
            req.destroy(new Error(`请求超时`));
            timeout = 1;
        });
        req.on('error', (e) => {
            parseError(e);
            err = {message: `${e.message}`};
        });
        req.on('close', () => {
            if(err) err.url = url;
            if(timeout) {
                retry_count++;
                if(retry_count < retry) return get(url, options).then(res => resolve(res)).catch(err => reject(err));
                return reject(err);
            }
            if(redirect) return get(redirect, options).then(res => resolve(res)).catch(err => reject(err));
            if(err) return reject(err);
            resolve(data);
        });
        req.end();
    });
}

function isZip(encoding) {
    return /zip/i.test(encoding);
}

function isDeflate(encoding) {
    return /deflate/i.test(encoding);
}

function parseError(e) {
    switch(e.code) {
        case 'ENOTFOUND':
            e.message = `无法解析域名`;
            break;
        case 'ECONNREFUSED':
            e.message = `服务器拒绝连接`;
            break;
        case 'ECONNRESET':
            e.message = `服务器断开连接`;
            break;
        case 'ETIMEDOUT':
            e.message = `连接超时`;
            break;
    }
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

module.exports = function(url, ops, otherops) {
    redirect_count = 0;
    retry_count = 0;
    reqTIMEOUT = otherops.reqTimeout || reqTIMEOUT;
    resTIMEOUT = otherops.resTimeout || resTIMEOUT;
    retry = otherops.retry || retry;
    merge(options, ops);
    return get(url, options);
};