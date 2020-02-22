const crypto = require('crypto');
const {user:UserModel} = require('../models/user');
const {encrypt,decrypt} = require('./encryption');
const BufferNew = require('safe-buffer').Buffer
const cryptoRandomString = require('crypto-random-string');

const NodeCache = require( "node-cache" );
const TokenCache = new NodeCache( 
    { 
        stdTTL: 600,
        checkperiod: 120 
    } 
);

async function generateAccessToken(ID)
{
    return new Promise(async (resolve,reject)=>
    {
        try
        {
            var token = cryptoRandomString({length:36,type:'url-safe'});
            /*var updateToken = await UserModel.update({$set:{access_token:token}});
            if(!updateToken)
                return reject(false);*/
            TokenCache.set(ID,{token,exp:Math.floor(new Date().getTime() / 1000) + 600},600,(error)=>
            {
                if(error)
                {
                    return reject(false);
                }
            });
            return resolve(token);
        }
        catch(exception)
        {
            return reject(false);
        }

    });
}
async function generateRefreshToken()
{
    return new Promise(async(resolve,reject)=>
    {
        try
        {
            var token = cryptoRandomString({length:36,type:'url-safe'});
            var updateToken = await UserModel.updateOne({$set:{refresh_token:encrypt(token)}});
            if(!updateToken)
                return reject(false);
            return resolve(token);
        }
        catch(exception)
        {
            return reject(false);
        } 
    });
}
async function invalidateAccessToken(access_token)
{
    return new Promise((resolve,reject)=>
    {
        TokenCache.del(access_token,(error)=>
        {
            if(error)
                return reject(false);
            return resolve(true);
        });
    });
}
async function invalidateRefreshToken(refresh_token,ID)
{
    // check wether token is valid or not
    return new Promise(async(resolve,reject)=>
    {
        try
        {
            var invalidateToken = await UserModel.updateOne({ID,refresh_token},{$unset:{refresh_token:1}});
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
            var isValidToken = TokenCache.get(id);
            if(!isValidToken)
                return reject(false);
            if(typeof isValidToken.exp !== 'number' || isValidToken.exp < Math.floor(new Date().getTime() / 1000) || typeof isValidToken.token !== 'string' || isValidToken.token.length !== access_token.length)
                return reject(false);
            if(!crypto.timingSafeEqual(BufferNew.from(access_token),BufferNew.from(isValidToken.token)))
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