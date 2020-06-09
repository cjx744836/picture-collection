const ws = require('nodejs-websocket');
const {fork} = require('child_process');
const childManager = require('./childmanager');
const controller = require('./controller');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const port = 3002;
let imageURL = [], size;
let max_process = 8;
let delay = 0;
let index = 0;
const MAX = 100000;
let one = false;
let sid = 0;
let cookie = '';
let otherops = {
        resTimeout: 60000,
        reqTimeout: 5000,
        retry: 3
    };

ws.createServer(connection => {
    if(one) {
        connection.on('error', err => {});
        connection.sendText(JSON.stringify({err: '只可以连接一个', once: 1}));
        return connection.close();
    }
    one = true;
    connection.on('error', err => {
        childManager.killAll();
    });
    connection.on('text', data => {
        let o = JSON.parse(data);
        if(o.stop) {
            childManager.killAll();
        } else {
            childManager.onOver(() => {
                connection.sendText(JSON.stringify({end: 1}));
                reset();
            });
            size = o.size * 1024 || 0;
            max_process = Number(o.process) || 8;
            delay = o.delay || 0;
            cookie = o.cookie;
            otherops.reqTimeout = Number(o.reqTimeout) || 5000;
            otherops.resTimeout = Number(o.resTimeout) || 60000;
            otherops.retry = Number(o.retry) || 3;
            let url = new URL(o.url);
            let dir = path.resolve(__dirname, 'img', url.host);
            sid = utils.genHash(url.host);
            if(!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            controller.saveHost(sid, url.host);
            createParser(o.url, o.prop, connection, o.referer, url.protocol + '//' + url.hostname);
            for(let i = 0; i < max_process; i++) {
                createImageCollection(connection, url.protocol + '//' + url.hostname, i, o.referer, url.host);
            }
        }
    });
    connection.on('close', code => {
       one = false;
    });
}).listen(port);

function reset() {
    imageURL = [];
    index = 0;
}

function createParser(url, prop, connection, openReferer, referer) {
    let child = fork('./parser.js', {windowsHide: true});
    child.send({url, delay, prop, cookie, otherops, openReferer, referer});
    childManager.add(child);
    child.once('kill', () => {
        childManager.kill(child);
    });
    child.on('message', arg => {
        if(arg.over) {
            childManager.kill(child);
            return childManager.over();
        }
        if(arg.err) {
            if(arg.code === 0)
            return childManager.onOver(() => {
               connection.sendText(JSON.stringify({err: arg.err}));
            });
            return controller.saveLog(arg.err + ` <a href="${arg.url}" target="_blank">${arg.url}</a>`);
        }
        arg.imgUrl.forEach(d => {
            if(!imageURL.some(b => b.imgUrl === d)) {
                imageURL.length < MAX && imageURL.push({imgUrl: d, sUrl: arg.sUrl});
            }
        });
    });
}

function getImageURL() {
    if(index === MAX) return childManager.killAll();
    if(imageURL[index]) return imageURL[index++];
    return '';
}

function createImageCollection(connection, referer, i, openReferer, dir) {
    let child = fork('./collection.js', {windowsHide: true});
    let killed = false, over = false;
    childManager.add(child);
    child.once('kill', () => {
        killed = true;
        childManager.kill(child);
    });
    child.once('over', () => {
        over = true;
    });
    child.on('message', arg => {
        if(arg.err) {
            if(arg.code === 0) {
                if(over) return childManager.kill(child);
                return delaySend(3000);
            }
            controller.saveLog(arg.err + ` <a href="${arg.url}" target="_blank">${arg.url}</a>`);
        } else {
            let filename = `${arg.hash}${arg.ext}`;
            let data = {
                    sid,
                    id: arg.hash,
                    filesize: arg.size,
                    filename: filename,
                    surl: arg.sUrl
                };
            controller.saveFile(data);
            connection.sendText(JSON.stringify({imgUrl: '/' + dir + '/' + filename, sUrl: arg.sUrl, size: arg.size, id: arg.hash}));
        }
        delaySend(delay);
    });
    function delaySend(delay) {
        setTimeout(() => {
            send();
        }, delay);
    }
    function send() {
        !killed && child.send({url: getImageURL(), size: size, referer, openReferer, dir, cookie, otherops})
    }
    delaySend(delay + i * 1000);
}