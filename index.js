const express = require('express');
const server = express();
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const port = 6001;
require('./socket');

server.use(express.static('js'));
server.use(express.static('img'));

server.get('/', (req, res) => {
    res.end(fs.readFileSync(path.resolve(__dirname, './index.html')));
});

server.get('/clear', (req, res) => {
    if(req.query.url) {
        try {
            utils.delFiles(path.resolve(__dirname, 'img', new URL(req.query.url).host), req.query.s);
        } catch (e) {
            return res.end('删除失败');
        }
    } else {
        utils.delFiles(path.resolve(__dirname, 'img'), req.query.s, 1);
    }
    res.end('删除成功');
});

server.get('*', (req, res) => {
   res.end('404');
});

server.listen(port);



