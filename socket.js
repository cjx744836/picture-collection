const ws = require('nodejs-websocket');
const {fork} = require('child_process');
const childManager = require('./childmanager');
const fs = require('fs');
const path = require('path');
const port = 3002;
let imageURL = [], size;
let max_process = 8;
let maps = [];
let delay = 0;
let index = 0;
const max_length = 100000;

ws.createServer(connection => {
    connection.on('connect', code => {

    });
    connection.on('text', data => {
        let o = JSON.parse(data);
        if(o.stop) {
            childManager.killAll();
        } else {
            childManager.onOver(() => {
                connection.sendText(JSON.stringify({end: 1}));
            });
            imageURL = [];
            maps = [];
            index = 0;
            size = o.size * 1024 || 0;
            max_process = Number(o.process) || max_process;
            delay = o.delay || 0;
            createParser(o.url, o.prop, connection);
            let url = new URL(o.url);
            let dir = path.resolve(__dirname, 'img', url.host);
            if(!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            for(let i = 0; i < max_process; i++) {
                createImageCollection(connection, url.protocol + '//' + url.hostname, i, o.referer, url.host);
            }
        }
    });
    connection.on('error', err => {
        childManager.killAll();
    });
    connection.on('close', code => {

    });
}).listen(port);

function createParser(url, prop, connection) {
    let child = fork('./parser.js', {windowsHide: true});
    child.send({url, delay, prop});
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
            return childManager.onOver(() => {
               connection.sendText(JSON.stringify({err: arg.err}));
            });
        }
        arg.imgUrl.forEach(d => {
            if(!imageURL.some(b => b.imgUrl === d)) {
                imageURL.length < max_length && imageURL.push({imgUrl: d, sUrl: arg.sUrl});
            }
        });
    });
}

function getImageURL() {
    if(index === max_length) return childManager.killAll();
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
        } else if(maps.indexOf(arg.hash) === -1) {
            maps.push(arg.hash);
            connection.sendText(JSON.stringify({imgUrl: '/' + arg.filename, sUrl: arg.sUrl, size: arg.size}));
        }
        delaySend(delay);
    });
    function delaySend(delay) {
        setTimeout(() => {
            send();
        }, delay);
    }
    function send() {
        !killed && child.send({url: getImageURL(), size: size, referer, openReferer, dir})
    }
    delaySend(delay + i * 1000);
}