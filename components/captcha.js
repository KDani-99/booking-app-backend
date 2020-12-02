const request = require('request');
const {CAPTCHA_KEY} = require('../keys/keys');

async function captchaValidation(captcha,remoteip)
{
    return new Promise((resolve,reject)=>
    {
        if(typeof captcha !== 'string' || captcha.length < 1)
            return reject({status:'failed',code:'captcha_validation_failed'});

        var options = {
            uri: `https://www.google.com/recaptcha/api/siteverify?secret=${CAPTCHA_KEY}&response=${captcha}&remoteip=${remoteip}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        request(options, function (error, response) {
            if(error)
            {
                return reject({status:'failed',code:'captcha_validation_failed'});
            }         
            try
            {
                var parsed = JSON.parse(response.body);
                if(parsed.success === true)
                {
                    return resolve(true);
                }
            }
            catch(exception)
            {
                return reject({status:'failed',code:'unkown_exception'});
            }
                
            return reject({status:'failed',code:'captcha_validation_failed'});
        });
    });
}

module.exports = {
    captchaValidation
};