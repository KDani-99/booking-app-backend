const redis = require('redis');
const chalk = require('chalk');
const {REDIS_KEY} = require('../keys/keys');

const TokenClient = redis.createClient();

TokenClient.auth(REDIS_KEY);

TokenClient.select(0);

TokenClient.on('error',(error)=>{
    console.log('[',chalk.hex('#f44336').bold('REDIS ERROR'),']',`${error}`);
    process.exit();
});
TokenClient.on('ready',()=>{
    console.log('[',chalk.hex('#03A9F4').bold('COMPONENT LOADED'),']',chalk.hex('#03A9F4').bold('Redis token client connected'))
});

async function getValue(key)
{
    return new Promise((resolve,reject)=>
    {
        TokenClient.get(key,(error,result)=>
        {
            if(error)
                return reject(false);
            return resolve(result);
        });
        
    });
}
async function setValue(database,key,value,expiration)
{
    return new Promise(async(resolve,reject)=>
    {
       
        TokenClient.set(key,JSON.stringify(value),'EX',expiration,(error)=>
        {
            if(error)
                return reject(false);
            return resolve(true);
        });
        
    });
}

module.exports = {
    getValue,
    setValue,
    TokenClient,
};