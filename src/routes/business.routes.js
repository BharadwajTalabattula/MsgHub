// src/routes/business.routes.js
const express = require('express');
const router = express.Router();
const { register, getAll, getOne, update } = require('../controllers/business.controller');

router.post('/', register);          // Register new business
router.get('/', getAll);             // List all businesses
router.get('/:id', getOne);          // Get business + stats
router.patch('/:id', update);        // Update business settings

module.exports = router;