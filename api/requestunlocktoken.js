const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {verifyToken,generateToken} = require('../components/jwt');
const {HASH_KEY,SALT_KEY} = require('../keys/keys');
const RESPONSES = require('../responses/responses.json');
const {unlockAccountRequestTokens:UnlockAccountRequestTokensModel} = require('../models/unlock-account-req-tokens');
const {unlockTokens:UnlockTokensModel} = require('../models/unlock-tokens');
const cryptoRandomString = require('crypto-random-string');

router.post('/',async(req,res)=>
{
    if(Object.keys(req.body).length > 0)
    {
        return res.status(400).json(RESPONSES.invalid_request).end();
    }

    if(!req.headers.authorization)
        return res.status(400).json(RESPONSES.authorization_missing).end();

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

    if('user' in _verifyToken === false || 'token' in _verifyToken === false || 'exp' in _verifyToken === false)
    {
        return res.status(400).json(RESPONSES.invalid_token).end();
    }
        
    var preparedToken = crypto.createHash('sha256',HASH_KEY).update(_verifyToken.token).update(SALT_KEY).digest('hex');
    
    var checkToken = await UnlockAccountRequestTokensModel.findOne({
        userID:escape(_verifyToken.user),
        token:preparedToken
    }).select('userID expire_ts -_id');
    
    if(checkToken)
    {
        var currentTime = new Date().getTime();
        if(checkToken.expire_ts < currentTime)
        {
            return res.status(400).json(RESPONSES.token_expired).end();
        }

        var checkOldToken = await UnlockTokensModel.findOne({
           userID:escape(_verifyToken.user) 
        }).select('record_ts -_id');

        if(checkOldToken)
        {
            if(checkOldToken.record_ts + (60 * 5 * 1000) > currentTime)
            {
                return res.status(400).json(RESPONSES.unlock_token_timeout).end();
            }
            var deleteOldUnlockToken = await UnlockTokensModel.deleteMany({
                userID:escape(_verifyToken.user)
            });
            if(!deleteOldUnlockToken)
                return res.status(400).json(RESPONSES.unexpected_error).end();
            
        }

        var code = cryptoRandomString({length:36,type:'url-safe'});
        var iat = Math.floor(currentTime / 1000);

        var token = generateToken({
            token:code,
            iat,
            exp:iat+(60 * 60 * 24)
        });

        var preparedUnlockToken = crypto.createHash('sha256',HASH_KEY).update(code).update(SALT_KEY).digest('hex');

        var saveToken = new UnlockTokensModel({
            userID:checkToken.userID,
            token:preparedUnlockToken,
            record_ts:currentTime,
            expire_ts:currentTime + (60 * 60 * 24 * 1000)
        });
        // set up counter to stop infinity eg. 
        // SEND TOKEN TO EMAIL
        console.log('\x1b[37m%s\x1b[32m%s\x1b[37m%s\x1b[32m%s\x1b[37m', '[',' EMAIL SENT ',']',` ${token}`);
        await saveToken.save();
        
        return res.status(200).json({status:'successful'}).end();
    }
    else
    {
        return res.status(400).json(RESPONSES.invalid_token).end();
    }

    
});

module.exports = router;