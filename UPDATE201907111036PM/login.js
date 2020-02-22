const express = require('express');
const router = express.Router();
const {user:UserModel} = require('../models/user');
const {login_attempts:LoginAttemptModel} = require('../models/login-attempts');
const {unlockAccountRequestTokens:UnblockAccountRequestTokensModel} = require('../models/unlock-account-req-tokens');
const {validateEmail} = require('../components/validation');
const bcrypt = require('bcrypt');
const {generateToken} = require('../components/jwt');
const {GenerateAuthToken} = require('./token');
const crypto = require('crypto');
const {HASH_KEY,SALT_KEY} = require('../keys/keys');
const RESPONSES = require('../responses/responses.json');
const cryptoRandomString = require('crypto-random-string');
const {SECURE_LIMIT} = require('../components/redis-slowdown');
const csrf = require('../components/csrf');

router.post('/',csrf.middleware,SECURE_LIMIT,async (req,res)=>
{
   /* if(Object.keys(req.body).length !== 3)
    {
        return res.status(400).json({status:'failed',code:'invalid_request'}).end();
    }
    var _captchaValidation = await captchaValidation(req.body.captcha,req.ip)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_captchaValidation)
        return;*/
    var _validateEmail = await validateEmail(req.body.email)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateEmail)
        return;

    var attemptCount = await LoginAttemptModel.countDocuments({
        IP:req.ip,
        timestamp: {
            $gte: new Date().getTime() - (300 * 1000) // 300 seconds
        }
    });
    
    if(typeof attemptCount !== 'number')
    {
        return res.status(400).json(RESPONSES.could_not_get_attempts).end();
    }

    if(attemptCount >= 10)
    {
        var oldestAttempt = await LoginAttemptModel.findOne({
            IP:req.ip
       }).sort('timestamp').select('timestamp -_id');
        
       if(!oldestAttempt)
       {
            return res.status(400).json(RESPONSES.could_not_get_attempts).end();
       }

       return res.status(400).json({...RESPONSES.too_many_attempts,remaining:Math.ceil((oldestAttempt.timestamp - (new Date().getTime() - (300 * 1000))) / 1000)}).end();
    }
    else if(attemptCount > 0)
    {
        var deleteAttempts = await LoginAttemptModel.deleteMany({
            IP:req.ip,
            timestamp: {
                $lt: new Date().getTime() - (300 * 1000)
            }
        });
        if(!deleteAttempts)
        {
            return res.status(400).json(RESPONSES.could_not_delete_attempts).end();
        }
    }

    var preparedEmail = crypto.createHash('sha256',HASH_KEY).update(escape(req.body.email)).update(SALT_KEY).digest('hex');
    
    var user = await UserModel.findOne({emailHash:preparedEmail}).select('ID password logins isVerified isLocked');
    if(!user)
    {
        var checkAttemptedUserCount = await LoginAttemptModel.countDocuments({email:preparedEmail});    
        
        if(typeof checkAttemptedUserCount !== 'number')
        {
            return res.status(400).json(RESPONSES.could_not_get_attempts).end();
        }
        
        if(checkAttemptedUserCount > 7)
        {
            var lockUser = await LockUser(preparedEmail)
            .catch(error=>
            {
                res.status(400).json(RESPONSES.unexpected_error).end();
            });
            if(!lockUser)
                return;
        }
        
        var addAttempt = await AddAttempt(preparedEmail,req.ip)
        .catch(error=>
        {
            res.status(400).json(RESPONSES.unexpected_error).end()
        });
        if(!addAttempt)
            return;

        return res.status(400).json(RESPONSES.invalid_credentials).end();
    }

    bcrypt.compare(req.body.password,user.password,async (error,result)=>
    {
        if(error)
        {
           /* var lockUser = await LockUser(preparedEmail)
            .catch(error=>
            {
                res.status(400).json(RESPONSES.unexpected_error).end();
            });
            if(!lockUser)
                return;*/
    
            var checkAttemptedUserCount = await LoginAttemptModel.countDocuments({email:preparedEmail});    
            
            if(!checkAttemptedUserCount)
            {
                return res.status(400).json(RESPONSES.could_not_get_attempts).end();
            }
                
            if(checkAttemptedUserCount > 7) // requires at least 7 attempt with the same name to be blocked
            {
                var lockUser = await LockUser(preparedEmail)
                .catch(error=>
                {
                    res.status(400).json(RESPONSES.unexpected_error).end();
                });
                if(!lockUser)
                    return;
            }

            var addAttempt = await AddAttempt(preparedEmail,req.ip)
            .catch(error=>
            {
                res.status(400).json(RESPONSES.unexpected_error).end()
            });
            if(!addAttempt)
                return;
            
            return res.status(400).json(RESPONSES.invalid_credentials).end();
        }
        if(result === true)
        {
            var currentTime = new Date().getTime();
            var code = cryptoRandomString({length:36,type:'url-safe'});
            var iat = Math.floor(currentTime / 1000);

            if(user.isVerified === false)
            {

                // temp token to request
                // only to request new tokens
                var token = generateToken({
                    user:escape(user.ID),
                    token:code,
                    iat,
                    exp:iat+(60 * 60 * 24) // valid for a day
                });

                var preparedToken = crypto.createHash('sha256',HASH_KEY).update(code).update(SALT_KEY).digest('hex');

                var saveToken = await UserModel.updateOne({
                    $set:{
                        emailConfirmationResendToken:{
                            token:preparedToken,
                            record_ts:currentTime,
                            expire_ts:currentTime+(60 * 60 * 24 * 1000)
                        }
                    }               
                });
                if(!saveToken)
                    return res.status(400).json(RESPONSES.unexpected_error).end();

                return res.status(400).json({...RESPONSES.unverified_account,token}).end();
            }
            else if(user.isLocked === true)
            {
                // invalidate old req token and add new
                // this token differs from auth token since it can only be used to request a new unlock token
                var deleteOldTokens = await UnblockAccountRequestTokensModel.deleteMany({userID:user.ID});
                if(!deleteOldTokens)
                {
                    return res.status(400).json(RESPONSES.unexpected_error).end();
                }        
        
                var token = generateToken({
                    user:escape(user.ID),
                    token:code,
                    iat,
                    exp:iat+(60 * 60 * 24) // valid for a day
                });
        
                var preparedToken = crypto.createHash('sha256',HASH_KEY).update(code).update(SALT_KEY).digest('hex');
        
                var unlockToken = new UnblockAccountRequestTokensModel({
                    userID:user.ID,
                    token:preparedToken,
                    record_ts:currentTime,
                    expire_ts:currentTime + (60 * 60 * 24 * 1000)
                });
                var saveToken = await unlockToken.save();
        
                if(!saveToken)
                    return res.status(400).json(RESPONSES.unlock_token_generation_failed).end();
                // send token via email
                return res.status(400).json({...RESPONSES.user_locked,token}).end();
                //return res.status(400).json(RESPONSES.user_locked).end();
            }       
            req.session.regenerate(async function(error)
            {
                var token = await GenerateAuthToken(req.session,user.ID)
                .catch(error=>
                {
                    res.status(400).json(RESPONSES.token_generation_failed).end();
                });
                if(!token)
                    return;

                var newLogin = {
                    ts:new Date().getTime(),
                    IP:req.ip
                };
                
                if(!user.logins || !Array.isArray(user.logins))
                {
                    user.logins = [newLogin];
                }
                else
                {
                    if(user.logins.length >=5 )
                    {
                        var oldestIndex = 0;
                        var temp = user.logins[oldestIndex].ts;
        
                        for(var i=0;i<user.logins.length;i++)
                        {
                            if(user.logins[i].ts < temp)
                            {
                                oldestIndex = i;
                                oldestIndex = user.logins[i].ts;
                            }                  
                        }
                        user.logins.splice(oldestIndex,1);
                    }
                
                    user.logins.push(newLogin);
                }
                
                await user.save();

            
                if(error)
                    return res.status(400).json(RESPONSES.session_regeneration_failed).end();
                    
               // res.cookie('access_token',access_token,{httpOnly:false,secure:false,path:'/',domain:'localhost',sameSite:true});
               // res.cookie('refresh_token',refresh_token,{httpOnly:true,secure:false,path:'/',domain:'localhost',sameSite:true});
               
                res.cookie('token',token,{httpOnly:false,secure:false,path:'/',sameSite:true});
                csrf.generate(req,res);
                return res.status(200).json({status:'successful'}).end();
            });
            return;
        }

        var checkAttemptedUserCount = await LoginAttemptModel.countDocuments({email:preparedEmail});    
        
        if(typeof checkAttemptedUserCount !== 'number')
        {
            return res.status(400).json(RESPONSES.could_not_get_attempts).end();
        }
            
        if(checkAttemptedUserCount > 7) // requires at least 7 attempt with the same name to be blocked
        {
            
            var lockUser = await LockUser(preparedEmail)
            .catch(error=>
            {
                res.status(400).json(RESPONSES.unexpected_error).end();
            });
            if(!lockUser)
                return;
        }
        

        var addAttempt = await AddAttempt(preparedEmail,req.ip)
        .catch(error=>
        {
            res.status(400).json(RESPONSES.unexpected_error).end()
        });
        if(!addAttempt)
            return;

        return res.status(400).json(RESPONSES.invalid_credentials).end();
    });

});

async function AddAttempt(email,IP)
{
    return new Promise(async(resolve,reject)=>
    {
        var attempt = new LoginAttemptModel({
            email,
            IP,
            timestamp:new Date().getTime()
        });
        
        var addAttempt = await attempt.save();

        if(!addAttempt)
        {
            return reject(false);
        }
        return resolve(true);
    });
}
async function LockUser(email)
{
    return new Promise(async(resolve,reject)=>
    {
        var lockUser = await UserModel.updateOne(
        {
            emailHash:email
        },
        {
            $set: {
                isLocked:true
            }
        });
        if(!lockUser)
            return reject(false);

        return resolve(true);
    })
}

module.exports = router;