const http = require('http');
const https = require('https');
let reqTIMEOUT = 5000;
const resTIMEOUT = 10000;
const fs = require('fs');
let rawData = Buffer.alloc(0);
const crypto = require('crypto');

let options = {
    method: 'get',
    headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
    }
};
let adapter, req;

function isHttps(host) {
    return /^https/.test(host);
}

function get(url, options) {
    return new Promise((resolve, reject) => {
        let tid = 0;
        adapter = isHttps(url) ? https : http;
        req = adapter.request(url, options, function(res) {
            clearTimeout(tid);
            let resId = 0;
            let code = res.statusCode;
            if(code >= 300 && code < 400) {
                if(res.headers.location) {
                    options.credirect = options.credirect ? options.credirect + 1 : 1;
                    if(options.credirect > 5) {
                        return reject(new Error(`Redirect Max ${url}`));
                    }
                    if(res.headers.location.indexOf('http') > -1) {
                        url = res.headers.location;
                    } else {
                        return reject(new Error(`Invalid URL ${url}`));
                    }
                    return get(url, options).then(res => resolve(res)).catch(err => reject(err));
                } else {
                    return reject(new Error(`Redirect Failed ${url}`));
                }
            } else {
                if(code === 200) {
                    let rawData = Buffer.alloc(0);
                    resId = setTimeout(() => {
                        res.destroy();
                        rawData = undefined;
                        reject(new Error(`Response Timeout ${url}`));
                    }, resTIMEOUT);
                    let m;
                    res.on('data', chunk => {
                        rawData = Buffer.concat([rawData, chunk], rawData.length + chunk.length);
                    });
                    res.on('end', () => {
                        clearTimeout(resId);
                        resolve({data: rawData, url: url, type: res.headers['content-type']});
                    });
                    res.on('error', e => {
                        if(res.destroyed) return;
                        reject(e);
                    });
                } else {
                    reject(new Error(`Not Found ${code} ${url}`));
                }
            }
        });
        tid = setTimeout(() => {
            req.destroy();
            reject(new Error(`Request Timeout ${url}`));
        }, reqTIMEOUT);
        req.on('error', (e) => {
            if(req.destroyed) return;
            reject(e);
        });
        req.end();
    });
}

function genHash(data) {
    return crypto.createHash('sha1').update(data).digest().toString('hex');
}

function isValidType(type) {
    return /image/i.test(type);
}

function getType(type) {
    if(type.indexOf('jpeg') > -1) return '.jpg';
    if(type.indexOf('gif') > -1) return '.gif';
    if(type.indexOf('png') > -1) return '.png';
    if(type.indexOf('svg') > -1) return '.svg';
    if(type.indexOf('webp') > -1) return '.webp';
    return '.jpg';
}



process.on('message', arg => {
   if(!arg.url) return process.send({err: `No Url`, code: 0});
   options.headers.referer = arg.referer;
   options.credirect = 0;
   get(arg.url.imgUrl, options).then(res => {
        if(res.data.length > arg.size && isValidType(res.type)) {
            let hash = genHash(res.data);
            let ext = getType(res.type);
            fs.writeFileSync(__dirname + '/img/' + hash + ext, res.data);
            process.send({url: res.url, hash: hash, filename: hash + ext, sUrl: arg.url.sUrl, size: res.data.length});
        } else {
            process.send({err: `File Size Or Type Error ${res.url}`});
        }
   }).catch(err => {
      process.send({err: err.message});
   });
});