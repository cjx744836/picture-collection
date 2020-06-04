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
    utils.delFiles(__dirname + '/img');
    res.end('clear success');
});

server.get('*', (req, res) => {
   res.end('404');
});

server.listen(port);



