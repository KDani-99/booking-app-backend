const express = require('express');
const router = express.Router();
const {emailVerification:EmailVerificationModel} = require('../models/email-verification');
const {user:UserModel} = require('../models/user');
const {verifyToken,generateToken} = require('../components/jwt');
const RESPONSES = require('../responses/responses.json');
const crypto = require('crypto');
const cryptoRandomString = require('crypto-random-string');
const {HASH_KEY,SALT_KEY} = require('../keys/keys');

router.post('/',async(req,res)=>
{
    
    if(Object.keys(req.body).length !== 0)
    {
        return res.status(400).json(RESPONSES.invalid_request).end();
    }
    if(!req.headers.authorization)
    {
       return res.status(400).json(RESPONSES.authorization_missing).end();
    }
    
    var splitted = req.headers.authorization.split(' ');
    if(splitted.length !== 2 || splitted[0].toUpperCase() !== 'BEARER' || splitted[1].length <= 1)
        return res.status(400).json(RESPONSES.invalid_request).end();

    var _verifyToken = await verifyToken(splitted[1])
    .catch(error=>
    {
        res.status(400).json(error).end();    
    });
    if(!_verifyToken)
        return;
    
    if(typeof _verifyToken.user !== 'string' || typeof _verifyToken.token !== 'string' || typeof _verifyToken.exp !== 'number')
        return res.status(400).json(RESPONSES.invalid_token).end();
    
    var preparedToken = crypto.createHash('sha256',HASH_KEY).update(_verifyToken.token).update(SALT_KEY).digest('hex');
    var currentTime = new Date().getTime();
    
    var validateToken = await UserModel.findOne({
        ID:escape(_verifyToken.user),
        ['emailConfirmationResendToken.token']:preparedToken
    }).select('emailConfirmationResendToken.exp_ts lastEmailVerificationToken -_id');

    if(validateToken)
    {

        if(validateToken.exp_ts < currentTime)
        {
            EmailVerificationModel.updateOne(
                {
                    ID:escape(_verifyToken.user)
                },
                {
                    $unset:{
                        emailConfirmationResendToken:1
                    }
                }
            );
            return res.status(400).json(RESPONSES.token_expired).end();
        }
            

        if(typeof validateToken.lastEmailVerificationToken === 'number' && (validateToken.lastEmailVerificationToken + (60 * 2 * 1000)) > currentTime)
            return res.status(400).json(RESPONSES.resend_email_token_timeout).end();

        var deleteVerificationCode = await EmailVerificationModel.deleteMany(
            {
                /*userID:escape(_verifyToken.user),
                code:_verifyToken.code */
                ['emailConfirmationResendToken.expire_ts']:{
                    $lt:currentTime
                }
                
            }
        );
        if(!deleteVerificationCode)
        {
            return res.status(400).json(RESPONSES.could_not_resend_verification).end();
        }

        var updateLastSendDate = await UserModel.updateOne({
            ID:escape(_verifyToken.user),
            $set:{
                lastEmailVerificationToken:currentTime
            }
        });
        if(!updateLastSendDate)
            return res.status(400).json(RESPONSES.could_not_resend_verification).end();

        var code = cryptoRandomString({length:36,type:'url-safe'});
        var iat = Math.floor(currentTime / 1000);

        var newToken = generateToken({
            token:code,
            iat,
            exp:iat+(60 * 60 * 24)
        });

        var verificationRecord = new EmailVerificationModel({
            userID:escape(_verifyToken.user),
            code:crypto.createHash('sha256',HASH_KEY).update(code).update(SALT_KEY).digest('hex'),
            record_ts:currentTime,
            expire_ts:currentTime + (60 * 60 * 24 * 1000)
        });
        await verificationRecord.save();       
        console.log('RESENT TOKEN',newToken);
        return res.status(200).json({status:'successful'}).end();
        // send {newToken} to email
    }
    else
        return res.status(400).json(RESPONSES.invalid_token).end();
    

});

module.exports = router;