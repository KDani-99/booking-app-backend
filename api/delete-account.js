const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('./auth');
const {user:UserModel} = require('../models/user');
const {generateToken,verifyToken} = require('../components/jwt');
const {decrypt} = require('../components/encryption');
const RESPONSES = require('../responses/responses.json');
const cryptoRandomString = require('crypto-random-string');
const shortID = require('short-uuid');
const translator = shortID('abcdefghjklmnopqrstuvwxzy0123456789!@#$%^&*()');
const {SendAccountDeletion} = require('../components/mailer');
const {HASH_KEY,SALT_KEY} = require('../keys/keys');
const {CONFIG} = require('../keys/keys')

router.post('/',async(req,res)=>
{
    if(Object.keys(req.body).length !== 0)
        return res.status(400).json(RESPONSES.invalid_request).end();
       
    var _auth = await auth(req.session,req.headers)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_auth)
        return;

    var getUserInfo = await UserModel.findOne(
        {
            ID:escape(_auth.user)
        }
    ).select('accountDeletion name email -_id');

    if(!getUserInfo || typeof getUserInfo.name !== 'string' || typeof getUserInfo.email !== 'string')
    {
        return res.status(400).json(RESPONSES.could_not_delete_account).end();
    }
        
    var time = new Date().getTime();
    
    if(getUserInfo.accountDeletion)
    {
        if(getUserInfo.accountDeletion.record_ts && (getUserInfo.accountDeletion.record_ts + (60 * 5 * 1000)) > time)
        {
            return res.status(400).json(RESPONSES.delete_account_timeout).end();
        }     
        if(typeof getUserInfo.accountDeletion.started === 'boolean' && getUserInfo.accountDeletion.started === true)
        {
            return res.status(400).json(RESPONSES.account_deletion_already_started).end();
        }        
    }

    var decryptedEmail;
    var decryptedName;

    try
    {
        decryptedEmail = decrypt(getUserInfo.email);
        decryptedName = decrypt(getUserInfo.name);
    }
    catch(exception)
    {
        return res.status(400).json(RESPONSES.could_not_delete_account).end();
    }

    if(!decryptedEmail || !decryptedName)
    {
        return res.status(400).json(RESPONSES.could_not_delete_account).end();
    }  
    
    var code = cryptoRandomString({length:20,type:'base64'});
    var code2 = translator.new();
    var preparedCode = crypto.createHash('sha256',HASH_KEY).update(code).update(code2).update(SALT_KEY).digest('hex');
    var iat = Math.floor(time / 1000);
    var token = await generateToken(
        {
            token:code+'-'+code2,
            iat,
            exp:iat+(60 * 60 * 24)
        }
    );

    var saveToken = await UserModel.updateOne(
        {
            ID:escape(_auth.user)
        },
        {
            $set:{
                accountDeletion:{
                    token:preparedCode,
                    expire_ts:time+(60 * 60 * 24 * 1000 ),
                    record_ts:time
                }
            }     
        }
    );

    if(!saveToken || saveToken.nModified !== 1)
    {

        return res.status(400).json(RESPONSES.could_not_delete_account).end();
    }

    SendAccountDeletion(decryptedEmail,decryptedName,`${CONFIG.backend_address}api/delete-account/verify?token=${token}`);

    return res.status(200).json({status:'successful'}).end();
    
});
router.post('/cancel',async(req,res)=>
{
    if(Object.keys(req.body).length > 0)
        return res.status(400).json(RESPONSES.invalid_request).end();

    var _auth = await auth(req.headers)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_auth)
        return;

    var cancelRemoval = await UserModel.updateOne(
        {
            ID:escape(_auth.user)
        },
        {
            $unset:{
                accountDeletion:1
            }
        }
    );

    if(!cancelRemoval)
    {
        return res.status(400).json(RESPONSES.could_not_cancel_removal).end();
    }   
    if(cancelRemoval.nModified === 0)
    {
        return res.status(200).json(RESPONSES.removal_process_not_started).end();
    }
    return res.status(200).json({status:'successful'}).end();

});
router.get('/verify',async(req,res)=>
{

    if(Object.keys(req.query).length !== 1)
        return res.status(400).json(RESPONSES.invalid_request).end();

    var _verifyToken = await verifyToken(req.query.token)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_verifyToken)
        return;

    if(!_verifyToken.token || !_verifyToken.exp)
        return res.status(400).json(RESPONSES.invalid_token).end();

    var splitted = _verifyToken.token.split('-');
    
    if(splitted.length !== 2)
        return res.status(400).json(RESPONSES.invalid_token).end();
    
    var preparedCode = crypto.createHash('sha256',HASH_KEY).update(splitted[0]).update(splitted[1]).update(SALT_KEY).digest('hex');

    var ts = new Date();
    var hours = ts.getHours();
    var minutes = ts.getMinutes();
    var seconds = ts.getSeconds();

    var delete_ts = (Math.floor(ts.getTime() / 1000) - (hours * 60 * 60 ) - (minutes * 60  ) - (seconds )) * 1000;
    // check wether process started when sending 
    var startProcess = await UserModel.updateOne(
        {
            'accountDeletion.token':preparedCode
        },
        {
            $set:{
                'accountDeletion.started':true,
                'accountDeletion.delete_ts':delete_ts
            },
            $unset:{
                'accountDeletion.token':1,
                'accountDeletion.expire_ts':1,
                'accountDeletion.record_ts':1
            }
        }
    );
    if(!startProcess || startProcess.nModified === 0)
        return res.status(400).json(RESPONSES.could_not_delete_account).end();
    
    return res.status(200).json({status:'successfulf'}).end();

});
module.exports = router;