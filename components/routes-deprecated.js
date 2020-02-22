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
router.use(subdomain('auth'),login);

router.use('/api/login',loginRedis);
//const loginRedisSST = require('../api/login-redis-SSTV1');
router.use('/api/login',loginRedisSST);
router.use('/api/register',register);
router.use('/api/table',table);
router.use('/api/service',service);
router.use('/api/settings',settings);
router.use('/api/changepassword',changepassword);
router.use('/reset_password',resetpassword);
router.use('/api/verify/resend',requestnewtoken);
router.use('/verify',emailverification);
router.use('/api/request-unlock-token',requestUnlockAccountToken);
router.use('/api/unlock',unlockaccount);
router.use('/api/delete-account',deleteaccount);
router.use('/api/token-exchange',tokenexchange);
router.use('/api/logout',logout);
router.use('/api/book',booking);
router.use('/requesttoken',requestnewtoken);
router.use('/api/webhooks',webhooks);

const checkout = require('../!STRIPE/checkout');
router.use('/checkout',checkout);
module.exports = router;