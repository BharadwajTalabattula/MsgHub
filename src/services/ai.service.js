// // src/services/ai.service.js


// const Anthropic = require('@anthropic-ai/sdk');

// const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// // Build system prompt for the AI based on business + conversation stage


// function buildSystemPrompt(business, stage){
//     return `
//     You are an AI customer support assistant for "${business.name}".
    
//     Your job is to:
//     1. Greet customers warmly
//     2. Understand what they want to order
//     3. Collect order details step by step: item name, quantity, delivery address
//     4. Confirm the order by summarizing it
//     5. Thank them and give an order confirmation

//     Current conversation stage: ${stage}

//     Stage instructions:
//     - GREETING: Greet the customer, ask how you can help
//     - COLLECTIING_ORDER: Ask what items they want and quantity
//     - CONFIRMING_ORDER: Summarize the order and ask for confirmation(yes/no)
//     - COMPLETED: Thank them, give order number, say team will contact them

//     Rules:
//     - Keep replies short and friendly (max 3 sentences)
//     - Only ask ONE question at a time
//     - If customer asks something unrelated to ordering, politely redirect
//     - Detect when a customer confirms an order (words like "yes", "confirm", "ok", "haan", "sari")
//     - If customer says "agent" or "human" or "help", respond that you'll connect them to a team member

//     IMPORTANT - Respond in JSON format ONLY:
//     {
//     "reply": "your message to customer",
//     "nextStage": "GREETING|COLLECTING_ORDER|COLLECTING_ADDRESS|CONFIRMING_ORDER|COMPLETED|HUMAN_HANDOFF",
//     "orderData":{
//     "items": "extracted items string or null",
//     "address": "extracted address or null",
//     "confirmed": true/false
//     }
// }
// `.trim();

// }

// /**
//  * Get AI reply for a customer message
//  * @param {object} business - Business record
//  * @param {object} conversation - Conversation record with stage
//  * @param {array} history - Previous messages [{role, content}]
//  * @param {string} userMessage - Latest message from customer
//  */


// async function getAIReply(business, conversation, history, userMessage){
//     const systemPrompt = buildSystemPrompt(business, conversation.stage);

//     // Build message history for Clause (last 10 messages for context)

//     const recentHistory = history.slice(-10).map((m)=>({
//         role: m.role === 'USER' ? 'user' : 'assistant',  
//         content: m.content,
//     }));


//     // Add current user message
//     recentHistory.push({ role: 'user', content: userMessage });

//     const response = await client.message.create({
//         model: 'clause-sonnect-4-20250514',
//         max_tokens: 512,
//         syatem: systemPrompt, 
//         messages: recentHistory,  
//     });

//     const rawText = response.content[0].text.trim();

//     // Parse JSON response

//     try{
//         //Strip markdown code fences if present
//         const clean = rawText.replace(/```json|```/g,'').trim();
//         return JSON.parse(clean);
//     }catch{
//         return{
//             reply: rawText,
//             nextStage: conversation.stage,
//             orderData: {
//                 items: null,
//                 address: null,
//                 confirmed: false
//             },
//         };
//     }
// }

// module.exports = { getAIReply };


// Simple rule-based replies for testing (no AI API needed)
async function getAIReply(business, conversation, history, userMessage) {
    const msg = userMessage.toLowerCase().trim();
  
    let reply = '';
    let nextStage = conversation.stage;
    let orderData = { items: null, address: null, confirmed: false };
  
    if (nextStage === 'GREETING') {
      reply = `Hi! Welcome to ${business.name} 👋\nWhat would you like to order today?`;
      nextStage = 'COLLECTING_ORDER';
  
    } else if (nextStage === 'COLLECTING_ORDER') {
      orderData.items = userMessage;
      reply = `Got it! You want: *${userMessage}*\n\nPlease share your delivery address 📍`;
      nextStage = 'COLLECTING_ADDRESS';
  
    } else if (nextStage === 'COLLECTING_ADDRESS') {
      orderData.address = userMessage;
      reply = `Perfect! Let me confirm your order:\n\n📦 Items: ${history.find(m => m.role === 'USER')?.content || userMessage}\n📍 Address: ${userMessage}\n\nType *YES* to confirm ✅`;
      nextStage = 'CONFIRMING_ORDER';
  
    } else if (nextStage === 'CONFIRMING_ORDER') {
      if (msg.includes('yes') || msg.includes('confirm') || msg.includes('ok') || msg.includes('haan')) {
        reply = `✅ Order confirmed! Our team will contact you shortly.\n\nThank you for ordering from ${business.name}! 🎉`;
        nextStage = 'COMPLETED';
        orderData.confirmed = true;
      } else {
        reply = `No problem! What would you like to change?`;
        nextStage = 'COLLECTING_ORDER';
      }
  
    } else if (nextStage === 'COMPLETED') {
      reply = `Your order is already placed! Our team will contact you soon.\n\nFor new order type *NEW*`;
      if (msg.includes('new')) nextStage = 'GREETING';
    }
  
    return { reply, nextStage, orderData };
  }
  
  module.exports = { getAIReply };