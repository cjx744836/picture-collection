const request = require('./request');

function parsePath(c, url) {
    let d = [];
    for(let it of c) {
        if(/^(#|javascript)/i.test(it)) continue;
        else d.push(new URL(it, url).href);
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
}

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

let urls = [];
let index = 0;
const MAX = 100000;

function add(u, url) {
    if(urls.length > MAX) return;
    u.forEach(d => {
        if(urls.indexOf(d) === -1 && url.host === new URL(d).host) {
            urls.push(d);
        }
    });
}

function parse(delay, prop) {
    if(index === urls.length) return process.send({over: 1});
    let url = urls[index++];
    request(url).then(res => {
        let text = res.data.toString();
        let imgs = [];
        let base = getBase(text);
        if(base.length) {
            res.url = new URL(base[0], res.url).href;
        }
        add(getHref(text, res.url), new URL(res.url));
        imgs = imgs.concat(getImg(text, res.url));
        if(prop) {
            imgs = imgs.concat(getImgProp(text, res.url, prop));
        }
        process.send({imgUrl: imgs, sUrl: res.url});
        delayParse(delay, prop);
    }).catch(err => {
        delayParse(delay, prop);
        if(urls.length === 1) {
            process.send({err: '网站解析失败，请重试'});
        }
    });
}

function delayParse(delay, prop) {
    setTimeout(() => {
        parse(delay, prop);
    }, delay);
}

process.on('message', arg => {
   if(!arg.url) return;
   urls.push(arg.url);
   parse(arg.delay, arg.prop);
});