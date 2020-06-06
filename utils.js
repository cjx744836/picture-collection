const fs = require('fs');

function delFiles(path, s, a) {
    if(!a) {
        _delFiles(path, s);
    } else {
        if(fs.existsSync(path)) {
            fs.readdirSync(path);
            let files = fs.readdirSync(path);
            files.forEach(function(file) {
                let sPath = path + '\\' + file;
                _delFiles(sPath, s);
            });
        }
    }
}

function _delFiles(path, s) {
    if(fs.existsSync(path)) {
        if(fs.statSync(path).isDirectory()) {
            let files = fs.readdirSync(path);
            files.forEach(function(file) {
                let sPath = path + '\\' + file;
                _delFiles(sPath, s);
            });
            s && fs.rmdirSync(path);
        } else {
            fs.unlinkSync(path);
        }
    }
}

module.exports = {
    delFiles
}