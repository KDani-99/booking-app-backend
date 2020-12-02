const redis = require('redis');
const chalk = require('chalk');
const {REDIS_KEY} = require('../keys/keys');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const SessionClient = redis.createClient();

SessionClient.auth(REDIS_KEY);

SessionClient.select(4);

SessionClient.on('error',(error)=>{
    console.log('[',chalk.hex('#f44336').bold('REDIS ERROR'),']',`${error}`);
    process.exit();
});
SessionClient.on('ready',()=>{
    console.log('[',chalk.hex('#03A9F4').bold('COMPONENT LOADED'),']',chalk.hex('#03A9F4').bold('Redis session client connected'))
});

var SessionStore = new RedisStore(
{
    client:SessionClient,
    ttl:60*60, // 1 hour - on touch => +1 hour (reset)
    disableTouch:false
});

module.exports = SessionStore;