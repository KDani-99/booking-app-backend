const fs = require('fs');
const path = require('path');
const PATH = path.join(__dirname,'../','logs');
const ERROR_PATH = path.join(PATH,'ERROR');
const startTimestamp = new Date().getTime();

function logError(error) {
    let time = new Date();
    time = time.getFullYear() + '/' + (time.getMonth() + 1) + '/' + time.getDay() + ' ' + time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
    let formatted = `[ ${time} ] ${error}`;
    fs.writeFileSync(ERROR_PATH+'/'+startTimestamp+'.log',formatted);
}

module.exports = {
    logError
};