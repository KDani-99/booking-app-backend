const crypto = require('crypto');
const BufferNew = require('safe-buffer').Buffer;
const TOKEN_KEY = 'TEST_KEY'; // CHANGE IT !!
const cryptoRandomString = require('crypto-random-string');

async function GenerateAuthToken(session,userID)
{
    return new Promise((resolve,reject)=>
    {
        try {

            var token = cryptoRandomString({length:20})+userID+(new Date().getTime().toString());
            session.token = token;
            session.user = userID;
            session.save((error)=>
            {
                if(error)
                    return reject(false);
                var signed = crypto.createHmac('sha256',TOKEN_KEY).update(token).digest('hex');

                return resolve(signed);
            });
            
        } catch(exception) {
            return reject(false);
        }

    });
}
async function ValidateToken(session,token)
{
    return new Promise(async(resolve,reject)=>
    {
        try {
            if(typeof session === 'undefined' || typeof session.token !== 'string')
                return reject(false);           
            var computedHash = crypto.createHmac('sha256',TOKEN_KEY).update(session.token).digest('hex');
            if(computedHash.length !== token.length)
                return reject(false);
            if(!crypto.timingSafeEqual(BufferNew.from(computedHash),BufferNew.from(token)))
                return reject(false);
            return resolve(true);
        } catch(exception) {
            return reject(false);
        }
    });
}
module.exports = {
    GenerateAuthToken,
    ValidateToken
};