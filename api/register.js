const express = require('express');
const router = express.Router();
const {encrypt} = require('../components/encryption');
const {user:UserModel} = require('../models/user');
const {emailVerification:EmailVerificationModel} = require('../models/email-verification');
const {validateName,validateEmail,validatePassword} = require('../components/validation');
const {captchaValidation} = require('../components/captcha');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const {generateToken} = require('../components/jwt');
const {HASH_KEY,SALT_KEY} = require('../keys/keys');
const RESPONSES = require('../responses/responses.json');
const shortID = require('short-uuid');
const translator = shortID('abcdefghjklmnopqrstuvwxzy0123456789');
const {SendAccountVerifification} = require('../components/mailer');
const {CONFIG} = require('../keys/keys');
const csrf = require('../components/csrf');

router.post('/',csrf.middleware,async (req,res)=>
{
    if(Object.keys(req.body).length !== 4)
    {
        return res.status(400).json(RESPONSES.invalid_request).end();
    }
    /*var _captchaValidation = await captchaValidation(req.body.captcha,req.ip)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_captchaValidation)
        return;*/
    
    var _validateName = await validateName(req.body.name)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateName)
        return;

    var _validateEmail = await validateEmail(req.body.email)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.invalid_email).end();
    });
    if(!_validateEmail)
        return;

    var _validatePassword = await validatePassword(req.body.password)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validatePassword)
        return;

    var encryptedEmail = encrypt(escape(req.body.email));
    var prepapredEmail = crypto.createHash('sha256',HASH_KEY).update(escape(req.body.email)).update(SALT_KEY).digest('hex');

    var checkUser = await UserModel.findOne({emailHash:prepapredEmail});
    
    if(checkUser)
    {
        return res.status(400).json(RESPONSES.email_exists).end();
    }
    else
    {
        var code = crypto.randomBytes(16).toString('hex');
        var userID = translator.new();
        var time = new Date().getTime();
        var exp = Math.floor(time / 1000) + (60 * 60 * 24);
        console.log('new user ID '+userID)
        var emailVerificationCode = generateToken({
            user:userID,
            code,
            iat:time,
            exp
        });

        var preparedName,preparedPassword = null;
        preparedName = encrypt(escape(req.body.name));
        preparedPassword = bcrypt.hashSync(req.body.password,10);

        var newUser = new UserModel({
            ID:userID,
            name:preparedName,
            email:encryptedEmail,
            emailHash:prepapredEmail,
            password:preparedPassword,
            isVerified:false,
            isLocked:false,
            timestamp:time,
            subscription:{
                planID:'free',
                bonusTables:0
            }
        });
        await newUser.save();

        var verificationRecord = new EmailVerificationModel({
            userID,
            code,
            record_ts:time,
            expire_ts:time + (60 * 60 * 24 * 1000)
        });
        await verificationRecord.save();
        console.log(emailVerificationCode);

        SendAccountVerifification(req.body.email,req.body.name,`${CONFIG.backend_address}verify?token=${emailVerificationCode}`)
        .catch(error=>
        {
            // throw
            // resend email after restarting service or later, add to a waiting list
            console.log(error)
        });

        csrf.generate(req,res);
        return res.status(200).json({status:'successful'}).end();
    }
});

module.exports = router;
