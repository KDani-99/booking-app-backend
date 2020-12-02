const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {verifyToken} = require('../components/jwt');
const {user:UserModel} = require('../models/user');
const {unlockTokens:UnlockTokensModel} = require('../models/unlock-tokens');
const {unlockAccountRequestTokens:UnblockAccountRequestTokensModel} = require('../models/unlock-account-req-tokens');
const {HASH_KEY,SALT_KEY} = require('../keys/keys');
const RESPONSES = require('../responses/responses.json');

router.get('/',async(req,res)=>
{

    if(Object.keys(req.query).length > 1)
    {
        return res.status(400).json(RESPONSES.invalid_request).end();
    }

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

    var checkToken = await UnlockTokensModel.findOne({
        token:preparedToken
    }).select('expire_ts userID -_id');

    if(checkToken)
    {
        if(checkToken.expire_ts < new Date().getTime())
        {
            return res.status(400).json(RESPONSES.token_expired).end();
        }

        var unlockUser = await UserModel.updateOne(
            {
                ID:checkToken.userID
            },
            {
                $set:{
                    isLocked:false
                }
            }
        );
        
        if(!unlockUser || unlockUser.nModified !== 1)
            return res.status(400).json(RESPONSES.token_validation_failed).end();

        await UnlockTokensModel.deleteOne(
            {
                token:preparedToken
            }
        );

        await UnblockAccountRequestTokensModel.deleteMany({
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