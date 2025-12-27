const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambiar_en_produccion';
const CAFES_POR_RECOMPENSA = 4;

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hcccbpcabuwsvtpzhagu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_oG2UHGfhubM4l-8l7jwhjw_TaQM0xjm';

// Crear cliente de Supabase
// Usar service_role key para el backend (bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Servir archivos estáticos (después de las rutas de API)
app.use(express.static('public'));

// Middleware de autenticación
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token not provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// ========== RUTAS PÚBLICAS ==========

// Registro de cliente
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Verificar si el email ya existe
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
            return res.status(500).json({ error: 'Database error' });
        }

        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Crear usuario
        const qrCode = crypto.randomUUID();
        const hashedPassword = await bcrypt.hash(password, 10);

        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                name,
                email,
                password: hashedPassword,
                qr_code: qrCode
            })
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ error: 'Error creating user' });
        }

        // Generar token
        const token = jwt.sign(
            { id: newUser.id, email, type: 'user' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                qr_code: newUser.qr_code
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login de cliente
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, type: 'user' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                qr_code: user.qr_code
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Registro de comerciante
app.post('/api/merchant/register', async (req, res) => {
    try {
        const { name, email, password, business_name } = req.body;

        if (!name || !email || !password || !business_name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Verificar si el email ya existe
        const { data: existingMerchant, error: checkError } = await supabase
            .from('merchants')
            .select('id')
            .eq('email', email)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            return res.status(500).json({ error: 'Database error' });
        }

        if (existingMerchant) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { data: newMerchant, error: insertError } = await supabase
            .from('merchants')
            .insert({
                name,
                email,
                password: hashedPassword,
                business_name
            })
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ error: 'Error creating merchant' });
        }

        const token = jwt.sign(
            { id: newMerchant.id, email, type: 'merchant' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'Merchant registered successfully',
            token,
            merchant: {
                id: newMerchant.id,
                name: newMerchant.name,
                email: newMerchant.email,
                business_name: newMerchant.business_name
            }
        });
    } catch (error) {
        console.error('Merchant register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login de comerciante
app.post('/api/merchant/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data: merchant, error } = await supabase
            .from('merchants')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !merchant) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, merchant.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: merchant.id, email: merchant.email, type: 'merchant' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            merchant: {
                id: merchant.id,
                name: merchant.name,
                email: merchant.email,
                business_name: merchant.business_name
            }
        });
    } catch (error) {
        console.error('Merchant login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== RUTAS PROTEGIDAS - CLIENTES ==========

// Obtener perfil del cliente
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    if (req.user.type !== 'user') {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, name, email, qr_code')
            .eq('id', req.user.id)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Obtener estadísticas
        const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('type')
            .eq('user_id', req.user.id);

        if (transError) {
            return res.status(500).json({ error: 'Error calculating statistics' });
        }

        const purchases = transactions.filter(t => t.type === 'purchase').length;
        const rewards = transactions.filter(t => t.type === 'reward').length;
        const currentPoints = purchases % CAFES_POR_RECOMPENSA;
        const canRedeem = purchases >= CAFES_POR_RECOMPENSA && currentPoints === 0;

        res.json({
            ...user,
            stats: {
                totalPurchases: purchases,
                totalRewards: rewards,
                currentPoints,
                canRedeem,
                cafesForReward: CAFES_POR_RECOMPENSA - currentPoints
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generar QR code del cliente
app.get('/api/user/qrcode', authenticateToken, async (req, res) => {
    if (req.user.type !== 'user') {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('qr_code')
            .eq('id', req.user.id)
            .single();

        if (error || !user) {
            return res.status(500).json({ error: 'Database error' });
        }

        QRCode.toDataURL(user.qr_code, { errorCorrectionLevel: 'H' }, (err, url) => {
            if (err) {
                return res.status(500).json({ error: 'Error generating QR' });
            }
            res.json({ qr_code: url, qr_data: user.qr_code });
        });
    } catch (error) {
        console.error('QR code error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Obtener historial de transacciones
app.get('/api/user/history', authenticateToken, async (req, res) => {
    if (req.user.type !== 'user') {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('History query error:', error);
            return res.status(500).json({ error: 'Error getting history' });
        }

        // Obtener nombres de negocios para cada transacción
        const merchantIds = [...new Set(transactions.map(t => t.merchant_id))];
        const { data: merchants, error: merchantsError } = await supabase
            .from('merchants')
            .select('id, business_name')
            .in('id', merchantIds);

        if (merchantsError) {
            console.error('Merchants query error:', merchantsError);
        }

        // Crear un mapa de merchant_id -> business_name
        const merchantMap = {};
        if (merchants) {
            merchants.forEach(m => {
                merchantMap[m.id] = m.business_name;
            });
        }

        // Formatear datos para mantener compatibilidad
        const formattedTransactions = transactions.map(t => ({
            id: t.id,
            user_id: t.user_id,
            merchant_id: t.merchant_id,
            type: t.type,
            points: t.points,
            created_at: t.created_at,
            business_name: merchantMap[t.merchant_id] || 'Unknown'
        }));

        res.json(formattedTransactions);
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== RUTAS PROTEGIDAS - COMERCIANTES ==========

// Escanear QR y obtener información del cliente
app.post('/api/merchant/scan', authenticateToken, async (req, res) => {
    if (req.user.type !== 'merchant') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { qr_code } = req.body;

    if (!qr_code) {
        return res.status(400).json({ error: 'QR code is required' });
    }

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, name, email, qr_code')
            .eq('qr_code', qr_code)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Obtener estadísticas del cliente
        const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('type')
            .eq('user_id', user.id);

        if (transError) {
            return res.status(500).json({ error: 'Error calculating statistics' });
        }

        const purchases = transactions.filter(t => t.type === 'purchase').length;
        const rewards = transactions.filter(t => t.type === 'reward').length;
        const currentPoints = purchases % CAFES_POR_RECOMPENSA;
        const canRedeem = purchases >= CAFES_POR_RECOMPENSA && currentPoints === 0;

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            stats: {
                totalPurchases: purchases,
                totalRewards: rewards,
                currentPoints,
                canRedeem,
                cafesForReward: CAFES_POR_RECOMPENSA - currentPoints
            }
        });
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Registrar compra
app.post('/api/merchant/purchase', authenticateToken, async (req, res) => {
    if (req.user.type !== 'merchant') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const { data: transaction, error: insertError } = await supabase
            .from('transactions')
            .insert({
                user_id,
                merchant_id: req.user.id,
                type: 'purchase',
                points: 1
            })
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ error: 'Error registering purchase' });
        }

        // Verificar si puede canjear recompensa
        const { data: transactions, error: countError } = await supabase
            .from('transactions')
            .select('id')
            .eq('user_id', user_id)
            .eq('type', 'purchase');

        if (countError) {
            return res.status(500).json({ error: 'Error verifying points' });
        }

        const canRedeem = transactions.length % CAFES_POR_RECOMPENSA === 0;

        res.json({
            message: 'Purchase registered successfully',
            transaction_id: transaction.id,
            canRedeem
        });
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Canjear recompensa (café gratis)
app.post('/api/merchant/redeem', authenticateToken, async (req, res) => {
    if (req.user.type !== 'merchant') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        // Verificar que el cliente tiene suficientes puntos
        const { data: transactions, error: countError } = await supabase
            .from('transactions')
            .select('id')
            .eq('user_id', user_id)
            .eq('type', 'purchase');

        if (countError) {
            return res.status(500).json({ error: 'Error verifying points' });
        }

        const purchases = transactions.length;
        const canRedeem = purchases >= CAFES_POR_RECOMPENSA && 
                         (purchases % CAFES_POR_RECOMPENSA) === 0;

        if (!canRedeem) {
            return res.status(400).json({ 
                error: 'Not enough points to redeem',
                currentPoints: purchases % CAFES_POR_RECOMPENSA,
                needed: CAFES_POR_RECOMPENSA - (purchases % CAFES_POR_RECOMPENSA)
            });
        }

        const { data: transaction, error: insertError } = await supabase
            .from('transactions')
            .insert({
                user_id,
                merchant_id: req.user.id,
                type: 'reward',
                points: 0
            })
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ error: 'Error redeeming reward' });
        }

        res.json({
            message: 'Reward redeemed successfully',
            transaction_id: transaction.id
        });
    } catch (error) {
        console.error('Redeem error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Ruta catch-all para servir el frontend (SPA)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Supabase URL: ${SUPABASE_URL}`);
    if (process.env.NODE_ENV === 'production') {
        console.log(`Application deployed in production`);
    } else {
        console.log(`Access from: http://localhost:${PORT}`);
    }
});
