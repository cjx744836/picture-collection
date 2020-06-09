const crypto = require('crypto');
const request = require('./request');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');

function isValidType(type) {
    return /image|octet-stream/i.test(type);
}

function getType(type) {
    if(type.indexOf('jpeg') > -1) return '.jpg';
    if(type.indexOf('gif') > -1) return '.gif';
    if(type.indexOf('png') > -1) return '.png';
    if(type.indexOf('svg') > -1) return '.svg';
    if(type.indexOf('webp') > -1) return '.webp';
    return '.jpg';
}

process.on('message', arg => {
   if(!arg.url) return process.send({err: `No Url`, code: 0});
   let ops = {headers: {}};
   if(arg.openReferer) ops.headers.referer = arg.referer;
   if(arg.cookie) ops.headers.cookie = arg.cookie;
   request(arg.url.imgUrl, ops, arg.otherops).then(res => {
        if(!isValidType(res.type)) return process.send({err: `pid[${process.pid}] 图片类型错误`, url: res.url});
        if(res.data.length < arg.size) return process.send({err: `pid[${process.pid}] 图片大小过滤`, url: res.url});
        let hash = utils.genHash(res.data);
        let ext = getType(res.type);
        fs.writeFileSync(path.resolve(__dirname, 'img', arg.dir, hash + ext), res.data);
        process.send({hash: hash, ext: ext, sUrl: arg.url.sUrl, size: res.data.length});
   }).catch(err => {
      process.send({err: `pid[${process.pid}] ${err.message}`, url: err.url});
   });
});
