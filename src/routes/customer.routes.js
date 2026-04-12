// src/routes/customer.routes.js
const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

// List customers
router.get('/', async (req, res) => {
  try {
    const { businessId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = businessId ? { businessId } : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { orders: true, conversations: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ customers, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer + all conversations + orders
router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        orders: { orderBy: { createdAt: 'desc' } },
        conversations: {
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer details
router.patch('/:id', async (req, res) => {
  try {
    const { name, email, address } = req.body;
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { name, email, address },
    });
    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;