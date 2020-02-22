const slowDown = require("express-slow-down");
const redis = require('redis');
const RedisStore = require('rate-limit-redis');
const {REDIS_KEY} = require('../keys/keys');
const chalk = require('chalk');

const redisClient = redis.createClient();
redisClient.auth(REDIS_KEY);

redisClient.select(2);

redisClient.on('error',(error)=>
{
    console.log('[',chalk.hex('#f44336').bold('ERROR'),']',`${error}`);
    logservice.logError(error);
    process.exit();
});
redisClient.on('ready',()=>
{
    console.log('[',chalk.hex('#03A9F4').bold('COMPONENT LOADED'),']',chalk.hex('#03A9F4').bold('Redis speed limiter client connected'))
});

var redisStore = new RedisStore(
    {
        client:redisClient,
        expiry:30
    }
);

const GET_LIMIT = slowDown({
    store:redisStore,
    windowMs: 2.5 * 60 * 1000, // 2.5 minutes
    delayAfter: 40,
    delayMs: 250,
    maxDelayMs:3000
});
const DEFAULT_LIMIT = slowDown({
    store:redisStore,
    windowMs: 2.5 * 60 * 1000, // 2.5 minutes
    delayAfter: 35,
    delayMs: 250,
    maxDelayMs:2500
});
const SECURE_LIMIT = slowDown({
    store:redisStore,
    windowMs: 2.5 * 60 * 1000, // 2.5 minutes
    delayAfter: 15,
    delayMs: 250,
    maxDelayMs:2500
});
const SETTINGS_LIMIT = slowDown({
    store:redisStore,
    windowMs: 0.5 * 60 * 1000, // 0.5 minutes
    delayAfter: 2,
    delayMs: 250,
    maxDelayMs:1250
});
const TOKEN_LIMIT =  slowDown({
    store:redisStore,
    windowMs: 0.5 * 60 * 1000, // 0.5 minutes
    delayAfter: 2,
    delayMs: 750,
    maxDelayMs:2000
});

module.exports = {
    GET_LIMIT,
    DEFAULT_LIMIT,
    SECURE_LIMIT,
    SETTINGS_LIMIT,
    TOKEN_LIMIT
};