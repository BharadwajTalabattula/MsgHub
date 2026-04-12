// src/controllers/order.controller.js
const prisma = require('../config/db');

// Get all orders (optionally filtered by business)
async function getAll(req, res) {
  try {
    const { businessId, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (businessId) where.businessId = businessId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          business: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get single order
async function getOne(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        business: { select: { id: true, name: true } },
        conversation: { include: { messages: { orderBy: { createdAt: 'asc' } } } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update order status
async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Dashboard stats
async function getStats(req, res) {
  try {
    const { businessId } = req.query;
    const where = businessId ? { businessId } : {};

    const [total, pending, confirmed, delivered, customers, conversations] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      prisma.order.count({ where: { ...where, status: 'CONFIRMED' } }),
      prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.customer.count({ where: businessId ? { businessId } : {} }),
      prisma.conversation.count({ where: businessId ? { businessId } : {} }),
    ]);

    res.json({ stats: { orders: { total, pending, confirmed, delivered }, customers, conversations } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getAll, getOne, updateStatus, getStats };


// ─── Customer Controller ──────────────────────────────────────────────────────
// src/controllers/customer.controller.js — inline here for brevity