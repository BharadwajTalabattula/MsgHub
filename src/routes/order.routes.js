const express = require('express');
const router = express.Router();
const { getAll, getOne, updateStatus, getStats } = require('../controllers/order.controller');

router.get('/stats', getStats);     // Dashboard stats
router.get('/', getAll);              // List orders (with filters)
router.get('/:id', getOne);              // Get order + chat history
router.patch('/:id/status', updateStatus); // Update order status

module.exports = router;