const request = require('./request');

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

function getHref(html, url) {
    return parsePath(parseHTML(html, 'a', 'href'), parseURL(url));
}

function getImg(html, url) {
    return parsePath(parseHTML(html, 'img', 'src'), parseURL(url));
}

function getImgProp(html, url, prop) {
    return parsePath(parseHTML(html, 'img', prop), parseURL(url));
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
    request(url).then(res => {
        let text = res.data.toString();
        let imgs = [];
        add(getHref(text, res.url));
        imgs = imgs.concat(getImg(text, res.url));
        if(prop) {
            imgs = imgs.concat(getImgProp(text, res.url, prop));
        }
        process.send({imgUrl: imgs, sUrl: res.url});
        delayParse(delay, prop);
    }).catch(err => {
        delayParse(delay, prop);
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