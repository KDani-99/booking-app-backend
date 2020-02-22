const express = require('express');
const router = express.Router();
const RESPONSES = require('../responses/responses.json');
const {validateEmail,validatePassword} = require('../components/validation');
const {user:UserModel} = require('../models/user');
const {HASH_KEY,SALT_KEY} = require('../keys/keys');
const {generateToken,verifyToken} = require('../components/jwt');
const cryptoRandomString = require('crypto-random-string');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const {GET_LIMIT} = require('../components/redis-slowdown');

router.post('/',async(req,res)=>
{

    // won't be resetted till the user clicks on email link
    // requires = {email:<email>,authenticty_token:<token>}
    if(typeof req.query.token === 'string')
    {

        if(Object.keys(req.body).length !== 2)
            return res.status(400).json(RESPONSES.invalid_request).end();

        if(typeof req.body.password !== 'string' || typeof req.body.password2 !== 'string')
            return res.status(400).json(RESPONSES.invalid_request).end();

        if(req.body.password !== req.body.password2)
            return res.status(400).json(RESPONSES.password_differs).end();

        var _validatePassword = await validatePassword(req.body.password)
        .catch(error=>
        {
            res.status(400).json(error).end();
        });
        if(!_validatePassword)
            return;

        var _verifyToken = await verifyToken(req.query.token)
        .catch(error=>
        {
            res.status(400).json(error).end();
        });

        if(!_verifyToken)
            return;

        if(typeof _verifyToken.exp !== 'number' || typeof _verifyToken.token !== 'string')
            return res.status(400).json(RESPONSES.invalid_token).end();

        var preparedToken = crypto.createHash('sha256',HASH_KEY).update(_verifyToken.token).update(SALT_KEY).digest('hex')
        
        var checkToken = await UserModel.findOne({
            'resetPasswordToken.token':preparedToken
        }).select('expire_ts ID lastPasswordReset -_id');

        
        if(checkToken)
        {
            if(checkToken.expire_ts < new Date().getTime())
            {
                return res.status(400).json(RESPONSES.token_expired).end();
            }

            if(checkToken.lastPasswordReset)
            {
                if(checkToken.lastPasswordReset + (60 * 2 * 1000) > new Date().getTime())
                    return res.status(400).json(RESPONSES.password_reset_timeout).end();
            }
            
            var newPassword = bcrypt.hashSync(req.body.password,10);

            var updatePassword = await UserModel.updateOne(
                {
                    ID:checkToken.ID
                },
                {
                    $set:{
                        password:newPassword,
                        lastPasswordReset:new Date().getTime()
                    },

                    $unset:{
                        resetPasswordToken:1
                    }
                }
            );

            if(!updatePassword || updatePassword.nModified !== 1)
                return res.status(400).json(RESPONSES.could_not_reset_password).end();

            return res.status(200).json({status:'successful'}).end();
        }
        else
        {
            return res.status(400).json(RESPONSES.invalid_token).end();
        }

    }
    else
    {
        if(Object.keys(req.body).length !== 1)
        {
            return res.status(400).json(RESPONSES.invalid_request).end();
        }
    
        var _validateEmail = await validateEmail(req.body.email)
        .catch(error=>
        {
            res.status(400).json(RESPONSES.invalid_email).end();
        });
    
        if(!_validateEmail)
            return;
    
        var preparedEmail = crypto.createHash('sha256',HASH_KEY).update(escape(req.body.email)).update(SALT_KEY).digest('hex');
    
        var findUser = await UserModel.findOne(
            {
                emailHash:preparedEmail
            }
        ).select('ID lastPasswordResetToken -_id');
    
        if(findUser)
        {
            // send token to email
            var currentTime = new Date().getTime();

            if(findUser.lastPasswordResetToken)
            {
                if(findUser.lastPasswordResetToken + (60 * 2 * 1000) > currentTime)
                    return res.status(400).json(RESPONSES.password_reset_timeout).end();
            }
            // do not allow same password?
            var token = cryptoRandomString({length:50,type:'url-safe'});
    
            var emailToken = generateToken({
                token,
                exp:Math.floor(currentTime / 1000) + 60 * 60 * 24,
                iat:Math.floor(currentTime / 1000)
            });
    
            // send email
    
            console.log('PW RESET LINK',emailToken);
    
            var insertToken = await UserModel.updateOne(
                {
                    ID:findUser.ID
                },
                {
                    $set:{
                        resetPasswordToken:{
                            token:crypto.createHash('sha256',HASH_KEY).update(token).update(SALT_KEY).digest('hex'),
                            record_ts:currentTime,
                            expire_ts:currentTime + (60 * 60 * 24 * 1000)
                        },
                        lastPasswordResetToken:currentTime
                    }
                }
            );
    
            if(!insertToken || insertToken.nModified !== 1)
                return res.status(400).json(RESPONSES.could_not_reset_password).end();
    
            return res.status(200).json({status:'successful'}).end();
        }
        else
        {
            return res.status(400).json(RESPONSES.account_not_found).end();
        }
    }

});
router.get('/',GET_LIMIT,async(req,res)=>
{

    if(Object.keys(req.query).length !== 1)
    {
        return res.status(400).json(RESPONSES.invalid_request).end();
    }

    // required = token

    var _verifyToken = await verifyToken(req.query.token)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });

    if(!_verifyToken)
        return;

    if(typeof _verifyToken.exp !== 'number' || typeof _verifyToken.token !== 'string')
        return res.status(400).json(RESPONSES.invalid_token).end();

    var preparedToken = crypto.createHash('sha256',HASH_KEY).update(_verifyToken.token).update(SALT_KEY).digest('hex')

    var checkToken = await UserModel.findOne({
        'resetPasswordToken.token':preparedToken
    }).select('resetPasswordToken.expire_ts ID -_id');

    if(checkToken)
    {
        if(checkToken.resetPasswordToken.expire_ts < new Date().getTime())
        {
            await UserModel.updateOne(
                {
                    ID:checkToken.ID
                },
                {
                    $unset:{
                        resetPasswordToken:1
                    }
                }
            );

            return res.status(400).json(RESPONSES.token_expired).end();
        }

        return res.status(200).json({status:'successful'}).end();
    }
    else
    {
        return res.status(400).json(RESPONSES.invalid_token).end();
    }
    
});
module.exports = router;