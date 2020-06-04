const fs = require('fs');

function delFiles(path) {
    if(fs.existsSync(path)) {
        if(fs.statSync(path).isDirectory()) {
            let files = fs.readdirSync(path);
            files.forEach(function(file) {
                let sPath = path + '\\' + file;
                delFiles(sPath);
            });
        } else {
            fs.unlinkSync(path);
        }
    }
}

module.exports = {
    delFiles
}