const request = require('./request');
const utils = require('./utils');
const path = require('path');
const fs = require('fs');
const controller = require('./controller');
let urls = [];
let index = 0;
const MAX = 100000;
let hostMap = {};
let regNum = /\[\d+-\d+\]/;
let regNumV = /\[(\d+)-(\d+)\]/;
let regCha = /\[[a-z]-[a-z]\]/i;
let regChaV = /\[([a-z])-([a-z])\]/i;
let samePath = 0;


function parsePath(c, url) {
    let d = [];
    for(let it of c) {
        if(/^(#|javascript)/i.test(it)) continue;
        else d.push(new URL(it, url).href);
    }
    return d;
}

function parseHTML(html, tag, attr) {
    let b, c = [];
    let reg = new RegExp(`<${tag}\\s+.*?${attr}\\s*=\\s*(\'|")?([^\'"]+)(\'|")?(?:\\s*|\\/|>)`, 'gim');
    while(b = reg.exec(html)) {
        c.push(b[2]);
    }
    return c;
}

/*function parseHTML(html, tag, attr) {
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
                } else if(s === 4 || s === 5 || s === 6) {
                    str += char;
                } else if(s === 3) {
                    s = 6;
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
                    s = str.toLowerCase() === tag.toLowerCase() ? 2 : 0;
                    str = '';
                } else if(s === 2 && str.toLowerCase() !== attr.toLowerCase()) {
                    str = '';
                } else if(s === 6) {
                    put();
                } else if(s === 4 || s === 5) {
                    str += char;
                }
                break;
            case `=`:
                if(s === 2 && str.toLowerCase() === attr.toLowerCase()) {
                    s = 3;
                    str = '';
                } else if(s === 4 || s === 5 || s === 6) {
                    str += char;
                } else if(s === 3) {
                    s = 6;
                    str += char;
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
}*/

function getBase(html) {
    return parseHTML(html, 'base', 'href');
}

function getHref(html, url) {
    return parsePath(parseHTML(html, 'a', 'href'), url);
}

function getImg(html, url) {
    return parsePath(parseHTML(html, 'img', 'src'), url);
}

function getImgProp(html, url, prop) {
    return parsePath(parseHTML(html, 'img', prop), url);
}

function isSamePath(u1, u2) {
    u1 = u1.replace(/[^/]+$/, '');
    u2 = u2.replace(/[^/]+$/, '');
    return u1 === u2;
}

function add(u, host) {
    if(urls.length > MAX) return;
    u.forEach(d => {
        if(urls.indexOf(d) === -1 && new URL(d).host === host) {
            if(samePath && !isSamePath(d, urls[0])) return;
            urls.push(d);
        }
    });
}

function parse(delay, ops, prop, otherops, only) {
    if(index === urls.length) return process.send({over: 1});
    let url = urls[index++];
    request(url, ops, otherops).then(res => {
        let text = res.data.toString();
        let imgs = [];
        let base = getBase(text);
        if(base.length) {
            res.url = new URL(base[0], res.url).href;
        }
        let host = new URL(res.url).host;
        if(!only) {
            if(host !== new URL(url).host) {
                process.send({err: `[parser] - 非采集指定模式下，页面跳转后域名与输入域名不同不采集`, url: res.url});
                return delayParse(delay, ops, prop, otherops, only);
            } else {
                add(getHref(text, res.url), host);
            }
        }
        imgs = imgs.concat(getImg(text, res.url));
        if(prop) {
            imgs = imgs.concat(getImgProp(text, res.url, prop));
        }
        let sid = utils.genHash(host);
        if(!hostMap[host]) {
            hostMap[host] = 1;
            let dir = path.resolve(__dirname, 'img', host);
            if(!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            controller.saveHost(sid, host);
        }
        process.send({imgUrl: imgs, sUrl: res.url, sid, dir: host});
        delayParse(delay, ops, prop, otherops, only);
    }).catch(err => {
        if(urls.length === 1) {
            process.send({err: `${err.message}`, code: 0, url: err.url});
        } else {
            process.send({err: `[parser] - ${err.message}`, code: 1, url: err.url});
        }
        delayParse(delay, ops, prop, otherops, only);
    });
}

function delayParse(delay, ops, prop, otherops, only) {
    setTimeout(() => {
        parse(delay, ops, prop, otherops, only);
    }, delay);
}

process.on('message', arg => {
   if(!arg.url) return;
   if(arg.only) {
       arg.url.split(',').forEach(url => {
          parseURL(url.trim());
       });
   } else {
       urls.push(arg.url);
   }
   samePath = arg.samePath;
   let ops = {headers: {}};
   if(arg.cookie) ops.headers.cookie = arg.cookie;
   if(arg.openReferer) ops.headers.referer = arg.referer;
   parse(arg.delay, ops, arg.prop, arg.otherops, arg.only);
});


function parseURL(url) {
    if(!url) return;
    try {
        new URL(url);
    } catch (e) {
        return process.send({err: `[parser] - 不是一个有效的网址，缺少http://或者域名中使用了类似于[1-9]的范围选择符`, url: url});
    }
    if(regNum.test(url) || regCha.test(url)) {
        urls = urls.concat(genURL(url));
    } else {
        urls.push(url);
    }
}

function genURL(url) {
    let m, i, l, c = [], b = [], n, char = false;
    if(regNum.test(url)) {
        m = url.match(regNumV);
        i = Number(m[1]);
        l = Number(m[2]);
    } else if(regCha.test(url)) {
        m = url.match(regChaV);
        i = m[1].charCodeAt(0);
        l = m[2].charCodeAt(0);
        char = true;
    }
    if(m) {
        n = m[0].length;
        for(; i <= l; i++) {
            b.push(url.substr(0, m.index) + (char ? String.fromCharCode(i) : i) + url.substr(m.index + n));
        }
        b.forEach(d => {
            c = c.concat(genURL(d));
        });
    } else {
        c.push(url);
    }
    return c;
}
