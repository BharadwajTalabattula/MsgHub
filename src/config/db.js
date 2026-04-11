const  { PrismaClient } = require('@Prisma/client');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExist', async ()=>{
    await prisma.$disconnect();
});

module.exports = prisma;