const crypto = require('crypto');
const cryptoRandomString = require('crypto-random-string');

function generate(req,res)
{
    var token = cryptoRandomString({length:25,type:'url-safe'});
    req.session.csrf = token;
    res.cookie('_XCSRF',token,{ sameSite: true, httpOnly: false, secure:false, maxAge:365*60*60*24*1000 });
}
const middleware = (req,res,next)=>
{
    try
    {
        var header_token = req.headers['x-csrf-token'];
        var session_token = req.session.csrf;
        if(typeof session_token === 'string' && typeof header_token === 'string')
        {
            if(header_token !== session_token)
                return next({code:'EBADCSRFTOKEN'});
            return next(null,true);
        }
        else
            return next({code:'EBADCSRFTOKEN'});
    }
    catch(exception)
    {
        return next({code:'EBADCSRFTOKEN'});
    }
}
module.exports = {
    generate,
    middleware
}