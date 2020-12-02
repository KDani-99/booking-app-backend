const express = require('express');
const router = express.Router();
const emailverification = require('../../api/emailverification');
const unlockaccount = require('../../api/unlockaccounts');

router.use('/api/verify',emailverification);
router.use('/api/unlock',unlockaccount);

module.exports = router;