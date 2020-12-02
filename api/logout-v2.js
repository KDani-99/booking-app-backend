const express = require('express');
const router = express.Router();
const {validateRefreshToken,invalidateAccessToken,invalidateRefreshToken} = require('../components/tokenmanager-redis');
const {verifyToken} = require('../components/jwt');
const csrf = require('../components/csrf');

router.post('/',async(req,res)=>
{
    if(Object.keys(req.body).length > 0)
    {
        return res.status(400).json(RESPONSES.invalid_request).end();
    }

    if(typeof req.cookies['refresh_token'] !== 'undefined')
    {
        var _verifyRefreshToken = await verifyToken(req.cookies['refresh_token'],true)
        .catch(error=>
        {
            // leave it empty
        });  
        if(!_verifyRefreshToken || !_verifyRefreshToken.token || !_verifyRefreshToken.user)
        {
            if(req.cookies['access_token'] !== 'undefined')
            {
                var _verifyAccessToken = await verifyToken(req.cookies['access_token'])
                .catch(error=>
                {
                    // leave it empty 
                });
                if(!_verifyAccessToken)
                {
                    logout(req,res);
                    return;
                }
                var _invalidateAccessToken = await invalidateAccessToken(_verifyAccessToken.user)
                .catch(error=>
                {
                    res.status(400).json(RESPONSE.unexpected_error).end();
                });
                if(!_invalidateAccessToken)
                    return;
            }
            logout(req,res);
            return;
        }
        else
        {
            var _validateRefreshToken = await validateRefreshToken(_verifyRefreshToken.token,_verifyRefreshToken.user)
            .catch(error=>
            {
                // leave empty
            });
            if(!_validateRefreshToken)
            {
                var _invalidateAccessToken = await invalidateAccessToken(_verifyRefreshToken.user)
                .catch(error=>
                {
                    res.status(400).json(RESPONSE.unexpected_error).end();
                });
                if(!_invalidateAccessToken)
                    return;
                logout(req,res);
                return;
            }
            else
            {
                var _invalidateRefreshToken = await invalidateRefreshToken(_verifyRefreshToken.user)
                .catch(error=>
                {
                    res.status(400).json(RESPONSE.unexpected_error).end();
                });
                if(!_invalidateRefreshToken)
                    return;
                var _invalidateAccessToken = await invalidateAccessToken(_verifyRefreshToken.user)
                .catch(error=>
                {
                    res.status(400).json(RESPONSE.unexpected_error).end();
                });
                if(!_invalidateAccessToken)
                    return;
                logout(req,res);
                return;
            }

        }
    }
    if(typeof req.cookies['refresh_token'] === 'undefined' && typeof req.cookies['access_token'] !== 'undefined')
    {
        var _verifyAccessToken = await verifyToken(req.cookies['access_token'])
        .catch(error=>
        {
            // leave it empty 
        });
        if(!_verifyAccessToken)
        {
            logout(req,res);
            return;
        }
        var _invalidateAccessToken = await invalidateAccessToken(_verifyAccessToken.user)
        .catch(error=>
        {
            // error ? - if no access token exists
            res.status(400).json(RESPONSE.unexpected_error).end();
        });
        if(!_invalidateAccessToken)
            return;
        logout(req,res);
        return;
    }
    logout(req,res);
});
function logout(req,res)
{
    req.session.destroy(function()
    {
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        res.clearCookie('_XCSRF');
        return res.status(200).end();
    });
}
module.exports = router;