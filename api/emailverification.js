const express = require('express');
const router = express.Router();
const {verifyToken} = require('../components/jwt');
const {user:UserModel} = require('../models/user');
const {emailVerification:EmailVerificationModel} = require('../models/email-verification');
const RESPONSES = require('../responses/responses.json');

router.get('/',async(req,res)=>
{
    if(Object.keys(req.query).length !== 1)
    {
        return res.status(400).json({status:'failed',code:'invalid_request'}).end();
    }

    var status = await verifyToken(req.query.token)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });

    if(!status)
        return;

    if(typeof status.code !== 'string' || typeof status.user !== 'string')
    {
        return res.status(400).json(RESPONSES.invalid_token).end();
    }

    var result = await EmailVerificationModel.findOne(
        {
            userID:escape(status.user),
            code:escape(status.code)
        }
    );

    if(!result)
    {
        return res.status(400).json(RESPONSES.invalid_token).end();
    }
    var deleteResendTokens = await UserModel.updateOne(
        {
            ID:escape(status.user),  
        },
        {
            $unset:{
                emailConfirmationResendToken:1
            }
        }
    )
    if(!deleteResendTokens)
    {
        return res.status(400).json(RESPONSES.could_not_activate_user).end();
    }

    var deleteVerificationCode = await EmailVerificationModel.deleteMany({userID:escape(status.user),code:status.code});
    if(!deleteVerificationCode)
    {
        return res.status(400).json(RESPONSES.could_not_activate_user).end();
    }

    var activateUser = await UserModel.updateOne(
        {
            ID:escape(status.user)
        },
        {
            $set:{
                isVerified:true
            }
        }
    );
    if(!activateUser || activateUser.nModified !== 1)
    {
        return res.status(400).json(RESPONSES.could_not_activate_user).end();
    }
    return res.status(200).json({status:'successful'}).end();
});

module.exports = router;