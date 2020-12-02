const express = require('express');
const requestnewtoken = require('../../api/requestnewtoken');
const requestUnlockAccountToken = require('../../api/requestunlocktoken');
const table = require('../../api/table');
const service = require('../../api/service');
const changepassword = require('../../api/changepw');
const settings = require('../../api/settings');
const deleteaccount = require('../../api/delete-account');
const userinfo = require('../../api/userinfo');

const router = express.Router();
router.use('/api/table',table);
router.use('/api/service',service);
router.use('/api/settings',settings);
router.use('/api/changepassword',changepassword);
router.use('/api/delete-account',deleteaccount);
router.use('/api/verify/resend',requestnewtoken);
router.use('/api/request-unlock-token',requestUnlockAccountToken);
router.use('/api/user',userinfo);

module.exports = router;