const express = require('express');
const router = express.Router();

//const login = require('../api/login-DEPRECATED');
const loginRedis = require('../api/login-redis');

const register = require('../api/register');
const emailverification = require('../api/emailverification');
const requestnewtoken = require('../api/requestnewtoken');
const requestUnlockAccountToken = require('../api/requestunlocktoken');
const unlockaccount = require('../api/unlockaccounts');
const table = require('../api/table');
const service = require('../api/service');
const changepassword = require('../api/changepw');
const resetpassword = require('../api/resetpw');
const settings = require('../api/settings');
const deleteaccount = require('../api/delete-account');
const tokenexchange = require('../api/token-exchange');
const logout = require('../api/logout');
const {router:booking} = require('../api/booking');
const webhooks = require('../!STRIPE/webhooks');

/* FEATURE TEST */
const subdomain = require('express-subdomain');

const auth_router = express.Router();
auth_router.post('/api/table',table);
auth_router.post('/api/service',service);
auth_router.post('/api/settings',settings);
auth_router.post('/api/changepassword',changepassword);
auth_router.post('/api/delete-account',deleteaccount);
auth_router.use('/api/verify/resend',requestnewtoken);
auth_router.use('/api/request-unlock-token',requestUnlockAccountToken);
router.use(subdomain('auth',auth_router));

const content_get_router = express.Router(); // content network accepts GET requests
content_get_router.get('/api/service',service);
router.use(subdomain('content',content_get_router));

const v_router = express.Router(); // v_router accepts GET requests that has to pass tokens and does not require cookies -> should they?
v_router.use('/api/verify',emailverification);
v_router.use('/api/unlock',unlockaccount);
router.use(subdomain('v',v_router));

/* FEATURE TEST END */

router.use('/api/login',loginRedis);
router.use('/api/register',register);
router.use('/reset_password',resetpassword);

router.use('/api/token-exchange',tokenexchange);
router.use('/api/logout',logout); // do not requires tokens, session identified? -> no, but CSRF token should be used here
router.use('/api/book',booking); // CSRF

// set up proxy to only allow stripe to access this route
router.use('/api/webhooks',webhooks);

const checkout = require('../!STRIPE/checkout');
router.use('/checkout',checkout);
module.exports = router;