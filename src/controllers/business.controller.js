const prisma = require('../config/db');


// Register a new business
async function register(req, res){
    try{
        const { name, waPhoneNumber, waPhoneId, wabaId, accessToken, aiPersona } = req.body;
        if (!name || !waPhoneNumber || !waPhoneId || !wabaId || !accessToken ){
            return res.status(400).json({ error: 'Missing required fields: name, waPhoneNumber, waPhoneId, wabaId, accessToken '})

        }

        const business = await prisma.business.create({
            data: { name, waPhoneNumber, waPhoneId, wabaId, accessToken, aiPersona },
        })

        res.status(201).json({ success: true, business });
    } catch (error){
        if (error.code === 'P2002' ){
            return res.status(409).json({ error: 'A business with this phone number or Phone ID already exists'});
        }
        res.status(500).json({ error: error.message });
    }
}


// Get all businesses

async function getAll(req, res){
    try{
        const businesses = await prisma.business.findMany({
            select: { id: true, name: true, waPhoneNumber: true, isActive: true, createdAt: true},
            orderBy: { createdAt: 'desc' },
        });
        res.json({ businesses });
    } catch (error){
        res.status(500).json({ error: error.message });
    }
}

// Get single business with stats

async function getOne(req, res){
    try{
        const { id } = req.params;
        const business = await prisma.business.findUnique({
            where: { id },
            include: {
                _count: { select: { customers: true, orders: true, conversations: true } },
            },
        });
        if (!business) return res.status(404).json({ error: 'Business not found'});
        res.json({ business });
    } catch (error){
        res.status(500).json({ error: error.message });
    }
}

// Update business AI persona or settings

async function update ( req, res){
    try{
        const { id } = req. params;
        const { name, aiPersona, isActive, accessToken } = req.body;

        const business = await prisma.business.update({
            where: { id },
            data: { name, aiPersona, isActive, accessToken },
        });
        res.json({ success: true, business });
    } catch ( error){
        res.status(500).json({ error: error.message });
    }
}

module.exports = { register, getAll, getOne, update };