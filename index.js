const express = require('express');
const bodyParser = require('body-parser');
const server = express();
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const port = 6001;
require('./socket');

server.use(express.static('js'));
server.use(express.static('img'));
server.use(bodyParser.json());

server.get('/', (req, res) => {
    res.end(fs.readFileSync(path.resolve(__dirname, './index.html')));
});

server.post('/clear', (req, res) => {
    if(req.body.dirs) {
        req.body.dirs.forEach(d => {
           utils.delFiles(path.resolve(__dirname, 'img', d), req.body.s);
        });
        return res.end('删除成功');
    }
    res.end('删除失败')
});

server.get('/dir', (req, res) => {
    let dirs = utils.getDirs(path.resolve(__dirname, 'img'));
    return res.send({
       dirs
    });
});

server.get('*', (req, res) => {
   res.end('404');
});

server.listen(port);



