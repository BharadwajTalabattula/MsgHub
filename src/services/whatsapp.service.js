// sends messages via Meta WhatsApp Cloud API

const axios = require('axios');

const WA_API_BASE = 'https://graph.facebook.com/v19.0';


/**
 * Send a text message to a customer
 * @param {string} phoneNumberId - Meta Phone Number ID of the business
 * @param {string} accessToken   - Business permanent access token
 * @param {string} to            - Customer phone in E.164 format (e.g. +919876543210)
 * @param {string} text          - Message content 
 */

async function sendTextMessage(phoneNumberId, accessToken, to, text ){

    try{
        const response = await axios.post(
            `${WA_API_BASE}/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: {body: text, preview_url: false},
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    }catch(error){
        const err = error.response?.data || error.message;
        console.error('[WhatsApp] Send failed:', JSON.stringify(err));
        throw new Error ('Failed to send WhatsApp message');
    }
}


/**
 * Mark a message as read
 */

async function markMessageRead(phoneNumberId, accessToken, messageId){

    try{
        await axios.post(
            `${WA_API_BASE}/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );
    }catch{
        // Non-critical - don't throw
        console.warn('[WhatsApp] Could not mark message as read');
    }
}

/**
 * Parse incoming webhook payload and extract message info
 */

function parseIncomingMessage( body){
    try{
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;

        if(!value?.messages?.length) return null;

        const message = value.messages[0];
        const contact = value.contacts?.[0];
        const metadata = value.metadata;

        return{
            phoneNumberId: metadata.phone_number_id,
            from: message.from,
            customerName: contact?.profile?.name || 'Customer',
            messageId: message.id,
            text: message.type === 'text' ? message.text?.body : null,
            timestamp: message.timestamp,
        };
    }
        catch(err){
            console.error('[WhatsApp] Parse error:', err);
            return null;
        }
    }


module.exports = { sendTextMessage, markMessageRead, parseIncomingMessage };