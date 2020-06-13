const crypto = require('crypto');
const request = require('./request');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const controller = require('./controller');

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
   if(!arg.url) return process.send({err: `[collection] - [${arg.index}] - 等待parser解析图片地址【原因：图片地址重复或没有解析到图片地址或需要指定img属性】`, code: 0});
   let ops = {headers: {}};
   if(arg.openReferer) ops.headers.referer = arg.referer;
   if(arg.cookie) ops.headers.cookie = arg.cookie;
   request(arg.url.imgUrl, ops, arg.otherops).then(res => {
        if(!isValidType(res.type)) return process.send({err: `[colloection] - [${arg.index}] - 图片类型错误`, url: res.url});
        if(res.data.length < arg.size) return process.send({err: `[colloection] - [${arg.index}] - 图片大小过滤`, url: res.url});
        let hash = utils.genHash(res.data);
        let ext = getType(res.type);
       let data = {
           sid: arg.url.sid,
           id: hash,
           filesize: res.data.length,
           filename: hash + ext,
           surl: arg.url.sUrl
       };
       controller.saveFile(data);
       fs.writeFileSync(path.resolve(__dirname, 'img', arg.url.dir, hash + ext), res.data);
        process.send({hash: hash, imgUrl: `/${arg.url.dir}/${hash}${ext}`, sUrl: arg.url.sUrl, size: res.data.length, create_time: Date.now()});
   }).catch(err => {
      process.send({err: `[colloection] - [${arg.index}] - ${err.message}`, url: err.url});
   });
});
