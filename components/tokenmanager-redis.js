const crypto = require('crypto');
const {user:UserModel} = require('../models/user');
const {encrypt,decrypt} = require('./encryption');
const BufferNew = require('safe-buffer').Buffer
const {generateToken} = require('./jwt');
const cryptoRandomString = require('crypto-random-string');
const {TokenClient:RedisClient,getValue:GetRedisValue} = require('../components/redis');
const {HASH_KEY,SALT_KEY,CONFIG} = require('../keys/keys');

async function generateAccessToken(userID)
{
    return new Promise(async (resolve,reject)=>
    {
        try
        {
            var token = cryptoRandomString({length:36,type:'url-safe'});
            var time = Math.floor(new Date().getTime() / 1000);
            var jwt = generateToken(
                {
                    user:userID,
                    token,
                    iat:time,
                    exp:time + (60 * 60) - 1
                }
            );
            RedisClient.set(userID,
                    crypto.createHash('sha256',HASH_KEY).update(token).update(SALT_KEY).digest('hex'),
            'EX',(CONFIG.token_life.access_token || 3600),(error)=>{
                if(error)
                {
                    console.log(error)
                  return reject(false);  
                }
                return resolve(jwt);
            });      
        }
        catch(exception)
        {
            return reject(false);
        }

    });
}
async function generateRefreshToken(userID)
{
    return new Promise(async(resolve,reject)=>
    {
        try
        {
            var token = cryptoRandomString({length:40,type:'url-safe'});
            var time = Math.floor(new Date().getTime() / 1000);
            var jwt = generateToken(
                {
                    user:userID,
                    token,
                    iat:time,
                    exp:time + (60 * 60 * 24 * 30) // 1 month
                }
            );
            var updateToken = await UserModel.updateOne({ID:escape(userID)},{$set:{refresh_token:encrypt(token)}});
            if(!updateToken)
                return reject(false);
            return resolve(jwt);
        }
        catch(exception)
        {
            return reject(false);
        } 
    });
}
async function invalidateAccessToken(userID)
{
    return new Promise((resolve,reject)=>
    {
        RedisClient.del(userID,(error)=>{
            if(error)
                return reject(false);
            return resolve(true);
        });
    });
}
async function invalidateRefreshToken(ID)
{
    return new Promise(async(resolve,reject)=>
    {
        try
        {
            var invalidateToken = await UserModel.updateOne({ID},{$unset:{refresh_token:1}});
            if(!invalidateToken)
                return reject(false);
    
            return resolve(true);
        }
        catch(exception)
        {
            return reject(false);
        }
    });
}
async function validateRefreshToken(refresh_token,ID)
{
    return new Promise(async(resolve,reject)=>
    {
        
        try
        {
            var isValidToken = await UserModel.findOne({ID}).select('refresh_token');
            if(isValidToken)
            {
                if(typeof isValidToken.refresh_token === 'undefined')
                    return reject(false);
                var decryptedToken = decrypt(isValidToken.refresh_token);
                if(decryptedToken.length === refresh_token.length && crypto.timingSafeEqual(BufferNew.from(decryptedToken),BufferNew.from(refresh_token)))
                    return resolve(true);
                else
                    return reject(false); 
            }
            else
            {
                return reject(false); 
            }
        }
        catch(exception)
        {
            return reject(false); 
        }
        
    });
}
async function validateAccessToken(access_token,id)
{
    return new Promise(async(resolve,reject)=>
    {
        try
        {
            var isValidToken = await GetRedisValue(id);
            if(!isValidToken)
                return reject(false);
            var preparedToken = crypto.createHash('sha256',HASH_KEY).update(access_token).update(SALT_KEY).digest('hex');
            if(preparedToken.length !== isValidToken.length)
                return reject(false);
            if(!crypto.timingSafeEqual(BufferNew.from(preparedToken),BufferNew.from(isValidToken)))
                return reject(false);
            
            return resolve(true);
        }
        catch(exception)
        {
            return reject(false);
        }
    });
}
module.exports = {
    generateAccessToken,
    generateRefreshToken,
    validateAccessToken,
    validateRefreshToken,
    invalidateAccessToken,
    invalidateRefreshToken
};