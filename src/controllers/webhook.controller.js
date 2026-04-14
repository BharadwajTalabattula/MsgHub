// src/controllers/webhook.controller.js
// Handles all incoming WhatsApp messages + AI processing

const prisma = require('../config/db');
const { parseIncomingMessage, sendTextMessage, markMessageRead } = require('../services/whatsapp.service');
const { getAIReply } = require('../services/ai.service');

/**
 * GET /webhook — Meta verification handshake
 */
async function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[Webhook] Verified by Meta ✅');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Forbidden' });
}

/**
 * POST /webhook — Incoming messages from WhatsApp
 */
async function handleWebhook(req, res) {
  // Always acknowledge immediately (Meta expects < 5s response)
  res.status(200).json({ status: 'ok' });

  try {
    const parsed = parseIncomingMessage(req.body);
    // console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));
    // console.log("Parsed:", parsed);
    // if (!parsed || parsed.messageType !== 'text' || !parsed.text) return;

    if (!parsed) {
      console.log("❌ Parsing failed");
      return;
    }
    
    if (parsed.messageType !== 'text') {
      console.log("⚠️ Non-text message:", parsed.messageType);
      return;
    }

    const { phoneNumberId, from, customerName, messageId, text } = parsed;

    console.log("Sending reply to:", from);

    // 1. Find which business this phone number belongs to
    const business = await prisma.business.findUnique({
      where: { waPhoneId: phoneNumberId, isActive: true },
    });
    if (!business) {
      console.warn(`[Webhook] No active business for phoneNumberId: ${phoneNumberId}`);
      return;
    }

    // 2. Mark message as read (show blue ticks)
    await markMessageRead(phoneNumberId, business.accessToken, messageId);

    // 3. Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { phone_businessId: { phone: from, businessId: business.id } },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { phone: from, name: customerName, businessId: business.id },
      });
    } else if (!customer.name && customerName !== 'Customer') {
      // Update name if we now have it
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { name: customerName },
      });
    }

    // 4. Find or create active conversation
    let conversation = await prisma.conversation.findFirst({
      where: { customerId: customer.id, businessId: business.id, isActive: true },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { customerId: customer.id, businessId: business.id },
        include: { messages: true },
      });
    }

    // 5. Save incoming message to DB
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        customerId: customer.id,
        role: 'USER',
        content: text,
        waMessageId: messageId,
      },
    });

    // 6. Get AI reply
    const aiResponse = await getAIReply(
      business,
      conversation,
      conversation.messages,
      text
    );

    const { reply, nextStage, orderData } = aiResponse;

    // 7. Save AI reply to DB
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        customerId: customer.id,
        role: 'ASSISTANT',
        content: reply,
      },
    });

    // 8. Update conversation stage
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        stage: nextStage,
        lastMessageAt: new Date(),
        isActive: nextStage !== 'COMPLETED' && nextStage !== 'HUMAN_HANDOFF',
      },
    });

    // 9. Handle order creation/update
    if (nextStage === 'COMPLETED' && orderData?.confirmed) {
      await createOrUpdateOrder(business, customer, conversation, orderData);
    } else if (orderData?.items || orderData?.address) {
      // Partial order data — update if order exists
      await updatePartialOrder(business, customer, conversation, orderData);
    }

    // 10. Send reply back to customer
    await sendTextMessage(phoneNumberId, business.accessToken, from, reply);

    console.log(`[Bot] Replied to ${from}: "${reply.slice(0, 60)}..."`);
  } catch (error) {
    console.error('[Webhook] Error processing message:', error);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createOrUpdateOrder(business, customer, conversation, orderData) {
  const existing = await prisma.order.findUnique({
    where: { conversationId: conversation.id },
  });

  if (existing) {
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        status: 'CONFIRMED',
        items: orderData.items || existing.items,
        deliveryAddress: orderData.address || existing.deliveryAddress,
      },
    });
  } else {
    await prisma.order.create({
      data: {
        customerId: customer.id,
        businessId: business.id,
        conversationId: conversation.id,
        status: 'CONFIRMED',
        items: orderData.items,
        deliveryAddress: orderData.address,
      },
    });
  }
}

async function updatePartialOrder(business, customer, conversation, orderData) {
  const existing = await prisma.order.findUnique({
    where: { conversationId: conversation.id },
  });

  if (existing) {
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        items: orderData.items || existing.items,
        deliveryAddress: orderData.address || existing.deliveryAddress,
      },
    });
  } else {
    await prisma.order.create({
      data: {
        customerId: customer.id,
        businessId: business.id,
        conversationId: conversation.id,
        status: 'PENDING',
        items: orderData.items,
        deliveryAddress: orderData.address,
      },
    });
  }
}

module.exports = { verifyWebhook, handleWebhook };