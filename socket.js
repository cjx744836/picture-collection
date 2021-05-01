const ws = require('nodejs-websocket');
const {fork} = require('child_process');
const childManager = require('./childmanager');
const log = require('./logs');
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
            log.clearLogs();
            size = o.size * 1024 || 0;
            max_process = Number(o.process) || 8;
            delay = o.delay || 0;
            cookie = o.cookie;
            otherops.reqTimeout = Number(o.reqTimeout) || 5000;
            otherops.resTimeout = Number(o.resTimeout) || 60000;
            otherops.retry = Number(o.retry) || 3;
            let url = new URL(o.url);
            let obj = {
                url: o.url,
                prop: o.prop,
                openReferer: o.referer,
                referer: url.protocol + '//' + url.hostname,
                only: o.only,
                samePath: o.samePath
            };
            createParser(connection, obj);
            for(let i = 0; i < max_process; i++) {
                createImageCollection(connection, url.protocol + '//' + url.hostname, i, o.referer);
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

function createParser(connection, ops) {
    let child = fork('./parser.js', {windowsHide: true});
    let obj = Object.assign({
        delay,
        cookie,
        otherops,
    }, ops);
    child.send(obj);
    childManager.add(child);
    child.once('kill', () => {
        log.saveLog(`[parser] - 进程退出`);
        childManager.kill(child);
    });
    child.on('message', arg => {
        if(arg.over) {
            log.saveLog(`[parser] - 进程退出`);
            childManager.kill(child);
            return childManager.over();
        }
        if(arg.err) {
            if(arg.code === 0) {
                return childManager.onOver(() => {
                    connection.sendText(JSON.stringify({err: arg.err}));
                });
            }
            return log.saveLog(arg.err + ` - <a href="${arg.url}" target="_blank">${arg.url}</a>`);
        }
        log.saveLog(`[parser] - 解析图片${arg.imgUrl.length}个 - <a href="${arg.sUrl}" target="_blank">${arg.sUrl}</a>`);
        arg.imgUrl.forEach(d => {
            if(!imageURL.some(b => b.imgUrl === d)) {
                imageURL.length < MAX && imageURL.push({imgUrl: d, sUrl: arg.sUrl, dir: arg.dir, sid: arg.sid});
            }
        });
    });
}

function getImageURL() {
    if(index === MAX) return childManager.killAll();
    if(imageURL[index]) return imageURL[index++];
    return '';
}

function createImageCollection(connection, referer, i, openReferer) {
    let child = fork('./collection.js', {windowsHide: true});
    let killed = false, over = false;
    childManager.add(child);
    child.once('kill', () => {
        killed = true;
        log.saveLog(`[colloection] - [${i}] - 进程退出`);
        childManager.kill(child);
    });
    child.once('over', () => {
        over = true;
    });
    child.on('message', arg => {
        if(arg.err) {
            if(arg.code === 0) {
                if(over) {
                    log.saveLog(`[colloection] - [${i}] - 进程退出`);
                    return childManager.kill(child);
                }
                log.saveLog(arg.err);
                return delaySend(5000);
            }
            log.saveLog(arg.err + ` - <a href="${arg.url}" target="_blank">${arg.url}</a>`);
        } else {
            connection.sendText(JSON.stringify({imgUrl: arg.imgUrl, sUrl: arg.sUrl, size: arg.size, id: arg.hash, create_time: arg.create_time}));
        }
        delaySend(delay);
    });
    function delaySend(delay) {
        setTimeout(() => {
            send();
        }, delay);
    }
    function send() {
        !killed && child.send({url: getImageURL(), size: size, referer, openReferer, cookie, otherops, index: i})
    }
    delaySend(delay + i * 1000);
}