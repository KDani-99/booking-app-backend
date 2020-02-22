const {ValidateToken} = require('../UPDATE201907111036PM/token');
const RESPONSES = require('../responses/responses.json');

async function authorize(session,headers)
{
    return new Promise(async (resolve,reject)=>
    {
        try
        {
            if(!headers.authorization)
            {
               return reject(RESPONSES.authorization_missing);
            }

            var splitted = headers.authorization.split(' ');
            if(splitted.length !== 2 || splitted[0].toUpperCase() !== 'BEARER' || splitted[1].length <= 1 || !session || !session.user)
                return reject(RESPONSES.invalid_request);
            var _validateToken = await ValidateToken(session,splitted[1])
            .catch(error=>{
                // invalid token
                // do not return
            });
            
            if(!_validateToken)
            {
                return reject(RESPONSES.invalid_token);
            }
    
            return resolve({user:session.user});
        }
        catch(exception)
        {
            return reject(RESPONSES.authorization_missing);
        }

    });
}

module.exports = authorize;