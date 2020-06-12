const query = require('./sql');
const utils = require('./utils');
const path = require('path');
const MAX_LOG = 5000;
let logs_count = 0;

function saveHost(id, host) {
    let sql = `insert into tb_host (id, name) value('${id}', '${host}')`;
    query(sql);
}

function saveFile(data) {
    let sql = `insert into tb_file(id, sid, filename, filesize, surl) value('${data.id}', '${data.sid}', '${data.filename}', ${data.filesize}, '${data.surl}')`;
    query(sql);
}

async function delFiles(ids, s) {
    let dirs = [];
    let sql = `select name from tb_host where id in ('${ids.join()}')`;
    let data = await query(sql);
    if(data.errCode) return false;
    dirs = data.map(d => path.resolve(__dirname, 'img', d.name));
    if(s) {
        sql = `delete from tb_host where id in ('${ids.join('\',\'')}')`
    } else {
        sql = `delete from tb_file where sid in ('${ids.join('\',\'')}')`;
    }
    data = await query(sql);
    if(data.errCode) return false;
    dirs.forEach(dir => utils.delFiles(dir, s));
    return true;
}

async function getDirs() {
    let sql = `select id, name dir, (select count(sid) from tb_file where sid=b.id) num from tb_host b`;
    let data = await query(sql);
    if(data.errCode) return {dirs: []};
    return {dirs: data};
}

async function getList(ids) {
    let sql = `select id, CONCAT('/', (select name from tb_host where id=t.sid), '/', filename) imgUrl, filesize size, sUrl, create_time from tb_file t where sid in ('${ids.join('\',\'')}')`;
    let data = await query(sql);
    if(data.errCode) return {list: []};
    data.forEach(d => {
       d.create_time = new Date(d.create_time).getTime()
    });
    return {list: data};
}

async function delFile(ids) {
    let sql = `select CONCAT(t2.name, '/', t1.filename) dir from tb_file t1 LEFT JOIN tb_host t2 on t1.sid = t2.id where t1.id in ('${ids.join('\',\'')}')`;
    let dirs = [];
    let data = await query(sql);
    if(data.errCode) return false;
    dirs = data;
    sql = `delete from tb_file where id in ('${ids.join('\',\'')}')`;
    data = await query(sql);
    if(data.errCode) return false;
    dirs.forEach(d => utils.delFiles(path.resolve(__dirname, 'img', d.dir)));
    return true;
}

async function logs() {
    let sql = `select err, DATE_FORMAT(create_time, '%Y-%m-%d %H:%i:%s') time from tb_logs order by create_time desc limit 0,1000`;
    let data = await query(sql);
    if(data.errCode) return [];
    return data;
}

function clearLogs() {
    let sql = `delete from tb_logs`;
    query(sql);
}

function saveLog(err) {
    logs_count++;
    let sql = `insert into tb_logs(err) value('${err}')`;
    query(sql);
    if(logs_count > MAX_LOG) {
        sql = `delete from tb_logs ORDER BY create_time asc limit 3000`;
        query(sql);
        logs_count -= 3000;
    }
}

function clearCount() {
    logs_count = 0;
}

module.exports = {
    saveHost, saveFile, getDirs, delFiles, getList, delFile, logs, saveLog, clearLogs, clearCount
};