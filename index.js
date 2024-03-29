const express = require('express');
const bodyParser = require('body-parser');
const server = express();
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const controller = require('./controller');
const log = require('./logs');
const port = 6001;
require('./socket');

server.use(express.static('js'));
server.use(express.static('img'));
server.use(express.static('css'));
server.use(bodyParser.json());

server.get('/', (req, res) => {
    res.end(fs.readFileSync(path.resolve(__dirname, './index.html')));
});

server.post('/clear', async (req, res) => {
    if(req.body.ids) {
        let data = await controller.delFiles(req.body.ids, req.body.s);
        return res.end(data ? '删除成功' : '删除失败');
    }
    res.end('删除失败')
});

server.post('/loadImage', async (req, res) => {
   if(req.body.ids) {
       let data = await controller.getList(req.body.ids);
       return res.send(data);
   }
   res.send({list: []});
});

server.get('/logs', async (req, res) => {
   let data = log.getLogs();
   res.set('content-type', 'text/html');
   let html = `<ul style="font-size:14px;">`;
   data.forEach(d => {
       html += `<li>[${d.time}] - ${d.err}</li>`;
   });
   html += '</ul>';
   res.end(html);
});

server.get('/clearLogs', (req, res) => {
   log.clearLogs();
   res.end();
});

server.post('/pick', async (req, res) => {
    if(!req.body.file) return res.send({code: 1000})
    let srcPath = path.join(__dirname + '/img/' + req.body.file);
    let file = req.body.file;
    file = file.split('/');
    file.shift();
    file.shift();
    file = file.join('/')
    let destPath = path.join(__dirname, '../scandir/imgs/' + file)
    let d = await controller.copyFile(srcPath, destPath);
    d ? res.send({code: 0}) : res.send({code: 1000})
})

server.post('/del', async (req, res) => {
   if(req.body.ids) {
       let data = await controller.delFile(req.body.ids);
       if(data) return res.send({code: 0});
   }
   res.send({code: 1000});
});

server.get('/dir', async (req, res) => {
    let data = await controller.getDirs();
    res.send(data);
});

server.get('*', (req, res) => {
   res.end('404');
});

server.listen(port);



