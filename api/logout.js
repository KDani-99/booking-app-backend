const express = require('express');
const router = express.Router();
const csrf = require('../components/csrf');

router.post('/',(req,res)=>
{
    if(Object.keys(req.body).length > 0)
    {
        return res.status(400).json(RESPONSES.invalid_request).end();
    }
    logout(req,res);
});
function logout(req,res)
{
    req.session.regenerate(function()
    {
        res.clearCookie('token');
        res.clearCookie('_XCSRF');
        csrf.generate(req,res);
        return res.status(200).end();
    });
}
module.exports = router;