const express = require('express');
const { APS_SAMPLE_ENVIRONMENT } = require('../config.js');

let router = express.Router();

router.get('/api/state', async function (req, res, next) {
    res.json({
        mode: APS_SAMPLE_ENVIRONMENT
    });
});

module.exports = router;
