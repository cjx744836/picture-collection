const http = require('http');
const https = require('https');
let reqTIMEOUT = 3000;
const resTIMEOUT = 10000;
const fs = require('fs');
let rawData = Buffer.alloc(0);
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

function parseURL(url) {
    let o = new URL(url), b = {};
    b.root = o.protocol + '//' + o.host;
    b.protocol = o.protocol;
    let c = o.pathname.split('/');
    if(c[c.length - 1] !== '') {
        c.pop();
    }
    b.relative = b.root + ((c.length > 0 ) ? c.join('/') : '/');
    return b;
}

function parsePath(c, url) {
    let d = [];
    for(let it of c) {
        if(it === '/' || /^(#|javascript)/i.test(it)) continue;
        if(/^http/i.test(it)) d.push(it);
        else if(/^\/\//.test(it)) d.push(url.protocol + it);
        else if(/^\//.test(it)) d.push(url.root + it);
        else d.push(url.relative + it);
    }
    return d;
}

function parseHTML(html, tag, attr) {
    let index = 0, s = 0, str = '', c = [], len = html.length, char;
    function put() {
        c.push(str);
        str = '';
        s = 0;
    }
    while(1) {
        if(index === len) break;
        char = html[index++];
        switch (char) {
            case '\r': case '\n':
                break;
            case `<`:
                if(s === 0) {
                    s = 1;
                    str = '';
                } else if(s === 3 || s === 4 || s === 5 || s === 6) {
                    str += char;
                }
                break;
            case `>`:
                if(s === 4 || s === 5) {
                    str += char;
                }  else if(s === 6) {
                    put();
                } else {
                    s = 0;
                    str = '';
                }
                break;
            case ` `:
                if(s === 1) {
                    if(str.toLowerCase() === tag.toLowerCase()) {
                        s = 2;
                    } else {
                        s = 0;
                    }
                    str = '';
                } else if(s === 2 && str === attr) {
                    s = 3;
                    str = '';
                } else if(s === 6) {
                    put();
                } else if(s === 4 || s === 5) {
                    str += char;
                } else {
                    str = '';
                }
                break;
            case `=`:
                if(s === 2 && str === attr) {
                    s = 3;
                    str = '';
                } else if(s === 3 || s === 4 || s === 5 || s === 6) {
                    str += char;
                } else {
                    str = '';
                }
                break;
            case `'`:
                if(s === 3) {
                    s = 5;
                    str = '';
                } else if(s === 5) {
                    put();
                } else if(s === 4 || s === 6) {
                    str += char;
                }
                break;
            case `"`:
                if(s === 3) {
                    s = 4;
                    str = '';
                } else if(s === 4) {
                    put();
                } else if(s === 5 || s === 6) {
                    str += char;
                }
                break;
            default:
                str += char;
                if(s === 3) {
                    s = 6;
                }
                break;
        }
    }
    return c;
}


function getHref(html, url) {
    return parsePath(parseHTML(html, 'a', 'href'), parseURL(url));
}

function getImg(html, url) {
    return parsePath(parseHTML(html, 'img', 'src'), parseURL(url));
}

function getImgProp(html, url, prop) {
    return parsePath(parseHTML(html, 'img', prop), parseURL(url));
}

function get(url, options) {
    return new Promise((resolve, reject) => {
        let tid = 0;
        adapter = isHttps(url) ? https : http;
        rawData = Buffer.alloc(0);
        req = adapter.request(url, options, function(res) {
            clearTimeout(tid);
            let resId = 0;
            let code = res.statusCode;
            if(code >= 300 && code < 400) {
                if(res.headers.location) {
                    options.credirect = options.credirect ? options.credirect + 1 : 1;
                    if(options.credirect > 5) {
                        return reject(new Error(`Redirect Max`));
                    }
                    if(res.headers.location.indexOf('http') > -1) {
                        url = res.headers.location;
                    } else {
                        return reject(new Error('Invalid URL'));
                    }
                    return get(url, options).then(res => resolve(res)).catch(err => reject(err));
                } else {
                    return reject(new Error(`Redirect Failed`));
                }
            } else {
                if(code === 200) {
                    rawData = Buffer.alloc(0);
                    resId = setTimeout(() => {
                        res.destroy();
                        rawData = undefined;
                        reject(new Error('Response Timeout'));
                    }, resTIMEOUT);
                    let m;
                    res.on('data', chunk => {
                        rawData = Buffer.concat([rawData, chunk], rawData.length + chunk.length);
                    });
                    res.on('end', () => {
                        clearTimeout(resId);
                        resolve({data: rawData, url: url, type: res.headers['content-type']});
                        rawData = undefined;
                    });
                    res.on('error', e => {
                        if(res.destroyed) return;
                        reject(e);
                    });
                } else {
                    reject(new Error(`Not Found`));
                }
            }
        });
        tid = setTimeout(() => {
            req.destroy();
            reject(new Error(`Request Timeout`));
        }, reqTIMEOUT);
        req.on('error', (e) => {
            if(req.destroyed) return;
            reject(e);
        });
        req.end();
    });
}

let urls = [];
let index = 0;
const MAX = 100000;

function add(u) {
    if(urls.length > MAX) return;
    u.forEach(d => {
        if(urls.indexOf(d) === -1) {
            urls.push(d);
        }
    });
}

function parse(delay, prop) {
    if(index === urls.length) return process.send({over: 1});
    let url = urls[index++];
    options.credirect = 0;
    get(url, options).then(res => {
        let text = res.data.toString();
        let imgs = [];
        add(getHref(text, res.url));
        imgs = imgs.concat(getImg(text, res.url));
        if(prop) {
            imgs = imgs.concat(getImgProp(text, res.url, prop));
        }
        process.send({imgUrl: imgs, sUrl: res.url});
        setTimeout(() => {
            parse(delay, prop);
        }, delay);
    }).catch(err => {
        setTimeout(() => {
            parse(delay, prop);
        }, delay);
    });
}

process.on('message', arg => {
   if(!arg.url) return;
   urls.push(arg.url);
   parse(arg.delay, arg.prop);
});