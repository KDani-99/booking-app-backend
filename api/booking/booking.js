const express = require('express');
const router = express.Router();
const RESPONSES = require('../../responses/responses.json');
const {captchaValidation} = require('../../components/captcha');
const csrf = require('../../components/csrf');
const book = require('./book');

router.post('/',csrf.middleware,async(req,res)=>
{
    if(Object.keys(req.body).length !== 7)
        return res.status(400).json(RESPONSES.invalid_request).end();
    
   /* var _captchaValidation = await captchaValidation(req.body.captcha,req.ip)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_captchaValidation)
        return;*/

    book(req.body,res);
});


module.exports = router;