
const express = require('express');
const router = express.Router();
const service = require('../../api/service');

router.get('/api/service',service);

module.exports = router;