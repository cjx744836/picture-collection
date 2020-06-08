const fs = require('fs');
const crypto = require('crypto');

function delFiles(path, s) {
    if(fs.existsSync(path)) {
        if(fs.statSync(path).isDirectory()) {
            fs.readdirSync(path);
            let files = fs.readdirSync(path);
            files.forEach(function(file) {
                let sPath = path + '\\' + file;
                delFiles(sPath, s);
            });
            s && fs.rmdirSync(path);
        } else {
            fs.unlinkSync(path);
        }
    }
}

function getFiles(path, dir) {
    let list = [];
    if(fs.existsSync(path) && fs.statSync(path).isDirectory()) {
        fs.readdirSync(path);
        let files = fs.readdirSync(path);
        files.forEach(function(file) {
            let spath = path + '\\' + file;
            if(!fs.statSync(spath).isDirectory()) {
                list.push(file);
            }
        });
    }
    return list;
}

function getFileNumber(path) {
    let count = 0;
    if(fs.existsSync(path) && fs.statSync(path).isDirectory()) {
        fs.readdirSync(path);
        let files = fs.readdirSync(path);
        files.forEach(function(file) {
            let spath = path + '\\' + file;
            if(!fs.statSync(spath).isDirectory()) {
                count++;
            }
        });
    }
    return count;
}

function getDirs(path) {
    let dirs = [];
    if(fs.existsSync(path) && fs.statSync(path).isDirectory()) {
        fs.readdirSync(path);
        let files = fs.readdirSync(path);
        files.forEach(function(file) {
            let spath = path + '\\' + file;
            if(fs.statSync(spath).isDirectory()) {
                dirs.push(file);
            }
        });
    }
    return dirs;
}

function genHash(data) {
    return crypto.createHash('sha1').update(data).digest().toString('hex');
}

module.exports = {
    delFiles,
    getFiles,
    getDirs,
    genHash
}