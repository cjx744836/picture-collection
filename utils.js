const fs = require('fs');

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

function getDirs(path) {
    let dirs = [];
    if(fs.existsSync(path) && fs.statSync(path).isDirectory()) {
        fs.readdirSync(path);
        let files = fs.readdirSync(path);
        files.forEach(function(file) {
            let spath = `{path}\\{file}`;
            if(fs.statSync(path).isDirectory()) {
                dirs.push(file);
            }
        });
    }
    return dirs;
}

module.exports = {
    delFiles,
    getDirs
}