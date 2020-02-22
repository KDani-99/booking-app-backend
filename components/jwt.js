const jwt = require('jsonwebtoken');
const {JWT_KEY} = require('../keys/keys');

/**
 * @param  {object} object token properties
 * @example
 * 
 * var token = generateToken({token:'ab49f035e7c3w',exp:(1569658767 + 60 * 60 * 24),iat:1569658767});
 * // => JWT token
 * 
 * @return {string}     signed JWT token
 */
function generateToken(object)
{
    return jwt.sign(object,JWT_KEY);
}

/**
 * @param  {string} token JWT token
 * @param {boolean} ignoreExpiration (optional - default = false)
 * @example
 * 
 * var verifiedToken = await verifyToken('ey...');
 * // => If valid, returns JWT token, otherwise false
 * 
 * @return {string}     valid JWT token
 */
async function verifyToken(token,ignoreExpiration = false)
{
    return new Promise((resolve,reject)=>
    {
        if(typeof token !== 'string')
            return reject({status:'failed',code:'invalid_token'});
        
        jwt.verify(token,JWT_KEY,{ignoreExpiration},async(error,result)=>
        {
           if(error)
           {
               if(error.name === 'TokenExpiredError')
                    return reject({status:'failed',code:'token_expired'});
               return reject({status:'failed',code:'invalid_token'});
           }
           return resolve(result);
        });
    });
}

module.exports = {
    generateToken,
    verifyToken
};