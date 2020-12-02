const redis = require('redis');
const {REDIS_KEY} = require('../keys/keys');
const redisClient = redis.createClient();
const RateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const chalk = require('chalk');

redisClient.auth(REDIS_KEY);

redisClient.on('error',(error)=>
{
    console.log('[',chalk.hex('#f44336').bold('ERROR'),']',`${error}`);
    logservice.logError(error);
    process.exit();
});
redisClient.on('ready',()=>
{
    console.log('[',chalk.hex('#03A9F4').bold('COMPONENT LOADED'),']',chalk.hex('#03A9F4').bold('Redis rate limiter client connected'))
});

redisClient.select(1);

var limiter = new RateLimit({
    store: new RedisStore(
        {
            client:redisClient,
            expiry:30
        }
    ),
    max: 100,
    delayMs: 0
});

module.exports = limiter;