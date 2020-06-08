let mysql = require('mysql');
let connection;
function connect() {
    connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : '123456',
        database : 'db_picture_collection'
    });
    connection.connect();
    connection.on('error', err => {
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            connect();
        }
    });
}
connect();
function query(sql) {
    return new Promise((resolve, reject) => {
        connection.query(sql, (err, results) => {
            err ? reject(err) : resolve(results);
        })
    }).catch(err => {
        return {errCode: 'sql error'};
    });
}

module.exports = query;