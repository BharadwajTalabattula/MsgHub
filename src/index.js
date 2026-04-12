require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const app = express();
app.set('trust proxy', 1); // ← add this line
const PORT = process.env.PORT || 3000;


//------------------security & Middleware ----------------------
app.use(helmet());
app.use(cors());
// Logs everything hitting the server
app.use(morgan(process.env.NODE_ENV === 'production'? 'combined' : 'dev'));

// Rate limiting - protect against abuse

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 200,
    message: {
        error: 'Too many requests, please try again later.'
    },
})

app.use('/api', limiter);

// Parse JSON - Important: Webhook needs raw body for signature verification
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------ Routes ------------------------------------------
 app.use('/api', routes);


// Root

app.get('/', (req, res)=>{
    res.json({
        name:'WhatsApp AI Bot API',
        Version: '1.0.0',
        status: 'running',
        docs: '/api/health'
    })

})

// 404
app.use((req, res)=>{
    res.status(404).json({
        error: `Route ${req.method} ${req.path} not found`
    })
})

// Global error handler
app.use((err, req, res, next)=>{
    console.error('[Error]', err);
    res.status(err.status || 500).json({error: err.message || 'Internal server error'});
})

app.listen(PORT, () => {
    console.log(`WhatsApp AI Bot running on port ${PORT}`);
    console.log(`ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Webhook URL: ${process.env.APP_URL}/api/webhook\n`);

    // Keep Render free tier alive (ping every 14 minutes)
    if (process.env.NODE_ENV === 'production') {
        setInterval(() => {
            const url = process.env.APP_URL + '/api/health';
            require('https').get(url, (res) => {
                console.log(`[Keep-alive] ${res.statusCode}`);
            }).on('error', (e) => {
                console.warn('[Keep-alive] failed:', e.message);
            });
        }, 14 * 60 * 1000);
    }
});

module.exports = app;