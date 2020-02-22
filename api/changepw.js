const express = require('express');
const router = express.Router();
const auth = require('./auth');
const bcrypt = require('bcrypt');
const {validatePassword} = require('../components/validation');
const {user:UserModel} = require('../models/user');
const {password_confirmation:PasswordConfirmationModel} = require('../models/password-confirmation');
const {password_change_attempts:PasswordChangeAttemptModel} = require('../models/password-change-attempts');
const {generateToken,verifyToken} = require('../components/jwt');
const RESPONSES = require('../responses/responses.json');
const cryptoRandomString = require('crypto-random-string');
const crypto = require('crypto');
const {HASH_KEY,SALT_KEY} = require('../keys/keys');
const {SendPasswordChangeConfirmation} = require('../components/mailer');
const {decrypt} = require('../components/encryption');
const {CONFIG} = require('../keys/keys');

router.post('/',async(req,res)=>
{

    if(Object.keys(req.body).length !== 2)
        return res.status(400).json(RESPONSES.invalid_request).end();

    var _auth = await auth(req.session,req.headers)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_auth)
        return;

    var _validateNewPassword = await validatePassword(req.body.newPassword)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.error).end();
    });
    if(!_validateNewPassword)
        return;

    var _validateOldPassword = await validatePassword(req.body.oldPassword)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.invalid_password).end();
    });
    if(!_validateOldPassword)
        return;

    var checkLastPasswordChange = await UserModel.findOne(
        {
            ID:escape(_auth.user)
        }
    ).select('email name lastPassChangeRequest lastPassChange password -_id');
    
    if(!checkLastPasswordChange)
    {
        return res.status(400).json(RESPONSES.could_not_change_password).end();
    }
        
    var currentTime = new Date().getTime();

    if(typeof checkLastPasswordChange.lastPassChangeRequest !== 'undefined')
    {
        if(typeof checkLastPasswordChange.lastPassChangeRequest !== 'number')
        {
            return res.status(400).json(RESPONSES.could_not_change_password).end();  
        }               
        if(checkLastPasswordChange.lastPassChangeRequest + (60 * 1 * 1000) >= currentTime)           
            return res.status(400).json({...RESPONSES.password_change_timeout,remaining:Math.floor((((checkLastPasswordChange.lastPassChangeRequest + (60 * 1 * 1000)) - currentTime) / 1000))}).end();
        else
        {
            var invalidateOldTokens = await PasswordConfirmationModel.deleteMany({
                userID:escape(_auth.user)
            });
            if(!invalidateOldTokens)
                return res.status(400).json(RESPONSES.could_not_change_password).end();  
        }
    }

    if(typeof checkLastPasswordChange.lastPassChange !== 'undefined')
    {
        if(typeof checkLastPasswordChange.lastPassChange !== 'number')
        {
            return res.status(400).json(RESPONSES.could_not_change_password).end();  
        }               
        if(checkLastPasswordChange.lastPassChange + (60 * 60 * 2 * 1000) >= currentTime)
            return res.status(400).json({...RESPONSES.password_change_timeout,remaining:Math.floor((((checkLastPasswordChange.lastPassChange + (60 * 60 * 2 * 1000)) - currentTime) / 1000))}).end();
    }

    var checkAttemptCount = await PasswordChangeAttemptModel.countDocuments({
        userID:escape(_auth.user),
        recorded_ts: {
            $gte: new Date().getTime() - (300 * 1000)
        }
    });
    if(typeof checkAttemptCount !== 'number')
    {
        return res.status(400).json(RESPONSES.could_not_get_attempts).end();
    }

    if(checkAttemptCount >= 10)
        return res.status(400).json(RESPONSES.password_change_attempt_timeout).end();
    else
    {
        var deleteAttempts = await PasswordChangeAttemptModel.deleteMany({
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

    bcrypt.compare(req.body.oldPassword,checkLastPasswordChange.password,async(error,result)=>
    {
        
        if(error)
        {
            var newAttempt = new PasswordChangeAttemptModel({
                userID:escape(_auth.user),
                IP:req.ip,
                recorded_ts:currentTime
            }).save();

            if(!newAttempt)
                return res.status(400).json(RESPONSES.unexpected_error).end();

            return res.status(400).json(RESPONSES.invalid_password).end();
        }
        if(result === true)
        {
            var checkForSamePass = bcrypt.compareSync(req.body.newPassword,checkLastPasswordChange.password);
            if(checkForSamePass === true)
            {
                return res.status(400).json(RESPONSES.new_same_password).end();
            }
            var code = cryptoRandomString({length:36,type:'url-safe'});
            var expire_ts = currentTime + (60 * 60 * 24 * 1000);
            // mail this token
            var token = generateToken({
                token:code,
                iat:Math.floor(currentTime / 1000),
                exp:Math.floor(expire_ts / 1000)
            });
            console.log('PASSWORD CHANGE TOKEN',token)
            var preparedToken = crypto.createHash('sha256',HASH_KEY).update(code).update(SALT_KEY).digest('hex');
            var preparedPassword = bcrypt.hashSync(req.body.newPassword,10);

            var saveToken = new PasswordConfirmationModel({
                userID:escape(_auth.user),
                password:preparedPassword,
                token:preparedToken,
                recorded_ts:currentTime,
                expire_ts
            }).save();

            if(!saveToken)
            {
                return res.status(400).json(RESPONSES.could_not_change_password).end();
            }          

            var updateUser = await UserModel.updateOne(
                {
                    ID:escape(_auth.user)
                },
                {
                    $set:{
                        lastPassChangeRequest:currentTime
                    }
                }
            );
            if(!updateUser || updateUser.nModified !== 1)
            {
                return res.status(400).json(RESPONSES.could_not_change_password).end();
            }
            
            var decryptedName = '';
            var decryptedEmail = '';

            try
            {
                decryptedName = decrypt(checkLastPasswordChange.name);
                decryptedEmail = decrypt(checkLastPasswordChange.email);
            }
            catch(exception)
            {
                // should not prevent error from sending the email
            }
            SendPasswordChangeConfirmation(decryptedEmail,decryptedName,`${CONFIG.backend_address}api/changepassword/verify?token=${token}`);

            var response = {
                status:'successful'
            };
            if(typeof _auth.token === 'string')
                response.token = _auth.token;

            return res.status(200).json(response).end();
        }
        else
        {
            var newAttempt = new PasswordChangeAttemptModel({
                userID:escape(_auth.user),
                IP:req.ip,
                recorded_ts:currentTime
            }).save();

            if(!newAttempt)
                return res.status(400).json(RESPONSES.unexpected_error).end();

            return res.status(400).json(RESPONSES.invalid_password).end();
        }
    });

});
router.get('/verify',async(req,res)=>
{

    if(Object.keys(req.query) > 1)
        return res.status(400).json(RESPONSES.invalid_request).end();

    var _verifyToken = await verifyToken(req.query.token)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.invalid_token).end();
    });

    if(!_verifyToken)
        return;

    if('token' in _verifyToken === false || 'exp' in _verifyToken === false)
        return res.status(400).json(RESPONSES.invalid_request).end();
        

    var preparedToken = crypto.createHash('sha256',HASH_KEY).update(_verifyToken.token).update(SALT_KEY).digest('hex');

    var checkToken = await PasswordConfirmationModel.findOne({
        token:preparedToken
    }).select('expire_ts password userID -_id');

    if(checkToken)
    {
        if(checkToken.expire_ts < new Date().getTime())
        {
            return res.status(400).json(RESPONSES.token_expired).end();
        }

        var changePassword = await UserModel.updateOne(
            {
                ID:checkToken.userID
            },
            {
                $set:{
                    password:checkToken.password
                }
            }
        );
        
        if(!changePassword || changePassword.nModified !== 1)
            return res.status(400).json(RESPONSES.token_validation_failed).end();

        await PasswordConfirmationModel.deleteOne(
            {
                token:preparedToken
            }
        );

       await PasswordChangeAttemptModel.deleteMany({
            userID:escape(checkToken.userID)
        });

        return res.status(200).json({status:'successful'}).end();
    }
    else
    {
        return res.status(400).json(RESPONSES.invalid_token).end();
    }
});

module.exports = router;