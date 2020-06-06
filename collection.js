const crypto = require('crypto');
const request = require('./request');
const fs = require('fs');
const path = require('path');

function genHash(data) {
    return crypto.createHash('sha1').update(data).digest().toString('hex');
}

function isValidType(type) {
    return /image/i.test(type);
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
   let ops = {};
   if(arg.openReferer) {
       ops = {
           headers: {
               referer: arg.referer
           }
       }
   }
   request(arg.url.imgUrl, ops).then(res => {
        if(res.data.length > arg.size && isValidType(res.type)) {
            let hash = genHash(res.data);
            let ext = getType(res.type);
            fs.writeFileSync(path.resolve(__dirname, 'img', arg.dir, hash + ext), res.data);
            process.send({url: res.url, hash: hash, filename: arg.dir + '/' + hash + ext, sUrl: arg.url.sUrl, size: res.data.length});
        } else {
            process.send({err: `File Size Or Type Error ${res.url}`});
        }
   }).catch(err => {
      process.send({err: err.message});
   });
});
