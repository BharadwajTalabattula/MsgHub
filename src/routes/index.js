const express = require('express');
const router = express.Router();

const webhookRoutes = require('./webhook.routes');
const businessRoutes = require('./business.routes');
const orderRoutes = require('./order.routes');
const customerRoutes = require('./customer.routes');

router.use('/webhook', webhookRoutes);
router.use('/businesses', businessRoutes);
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

module.exports = router;