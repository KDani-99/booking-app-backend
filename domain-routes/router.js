const express = require('express');
const router = express.Router();
const subdomain = require('express-subdomain');

/* Routes & Domains */
const auth_router = require('./auth/auth');
const content_router = require('./content/content');
const v_router = require('./v/v');

const loginRedis = require('../UPDATE201907111036PM/login');

const register = require('../api/register');
const resetpassword = require('../api/resetpw');
const logout = require('../api/logout');
const booking = require('../api/booking/booking');
const webhooks = require('../!STRIPE/webhooks');

router.use(subdomain('auth',auth_router));
router.use(subdomain('content',content_router));
router.use(subdomain('v',v_router));

router.get('/api',(req,res,next)=>
{
    return res.status(200).end();
});

router.use('/api/login',loginRedis);
router.use('/api/register',register);
router.use('/reset_password',resetpassword);

router.use('/api/book',booking); // CSRF
router.use('/api/logout',logout); // CSRF

// set up proxy to only allow stripe to access this route
router.use('/api/webhooks',webhooks);

router.all('*',(req,res,next)=>
{
    return res.status(404).json({status:'error',code:'invalid_route'}).end();
});
module.exports = router;