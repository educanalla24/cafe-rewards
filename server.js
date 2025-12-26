const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambiar_en_produccion';
const CAFES_POR_RECOMPENSA = 4;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Inicializar base de datos
// En producción, usar una ruta persistente si es necesario
const dbPath = process.env.DATABASE_PATH || './cafe_rewards.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error abriendo base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite en:', dbPath);
        initDatabase();
    }
});

// Inicializar tablas
function initDatabase() {
    db.serialize(() => {
        // Tabla de usuarios (clientes)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            qr_code TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla de comerciantes
        db.run(`CREATE TABLE IF NOT EXISTS merchants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            business_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla de transacciones (compras)
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            merchant_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('purchase', 'reward')),
            points INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (merchant_id) REFERENCES merchants(id)
        )`);

        // Índices para mejorar rendimiento
        db.run(`CREATE INDEX IF NOT EXISTS idx_user_id ON transactions(user_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_merchant_id ON transactions(merchant_id)`);
    });
}

// Middleware de autenticación
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
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
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Verificar si el email ya existe
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            if (row) {
                return res.status(400).json({ error: 'El email ya está registrado' });
            }

            // Crear usuario
            const userId = uuidv4();
            const qrCode = uuidv4();
            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(
                'INSERT INTO users (id, name, email, password, qr_code) VALUES (?, ?, ?, ?, ?)',
                [userId, name, email, hashedPassword, qrCode],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Error creando usuario' });
                    }

                    // Generar token
                    const token = jwt.sign(
                        { id: userId, email, type: 'user' },
                        JWT_SECRET,
                        { expiresIn: '30d' }
                    );

                    res.status(201).json({
                        message: 'Usuario registrado exitosamente',
                        token,
                        user: {
                            id: userId,
                            name,
                            email,
                            qr_code: qrCode
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Login de cliente
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            if (!user) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
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
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Registro de comerciante
app.post('/api/merchant/register', async (req, res) => {
    try {
        const { name, email, password, business_name } = req.body;

        if (!name || !email || !password || !business_name) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        db.get('SELECT id FROM merchants WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            if (row) {
                return res.status(400).json({ error: 'El email ya está registrado' });
            }

            const merchantId = uuidv4();
            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(
                'INSERT INTO merchants (id, name, email, password, business_name) VALUES (?, ?, ?, ?, ?)',
                [merchantId, name, email, hashedPassword, business_name],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Error creando comerciante' });
                    }

                    const token = jwt.sign(
                        { id: merchantId, email, type: 'merchant' },
                        JWT_SECRET,
                        { expiresIn: '30d' }
                    );

                    res.status(201).json({
                        message: 'Comerciante registrado exitosamente',
                        token,
                        merchant: {
                            id: merchantId,
                            name,
                            email,
                            business_name
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Login de comerciante
app.post('/api/merchant/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        db.get('SELECT * FROM merchants WHERE email = ?', [email], async (err, merchant) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            if (!merchant) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const validPassword = await bcrypt.compare(password, merchant.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
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
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ========== RUTAS PROTEGIDAS - CLIENTES ==========

// Obtener perfil del cliente
app.get('/api/user/profile', authenticateToken, (req, res) => {
    if (req.user.type !== 'user') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    db.get('SELECT id, name, email, qr_code FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Calcular puntos actuales
        db.get(
            `SELECT 
                COUNT(CASE WHEN type = 'purchase' THEN 1 END) as purchases,
                COUNT(CASE WHEN type = 'reward' THEN 1 END) as rewards
            FROM transactions 
            WHERE user_id = ?`,
            [req.user.id],
            (err, stats) => {
                if (err) {
                    return res.status(500).json({ error: 'Error calculando estadísticas' });
                }

                const currentPoints = (stats.purchases || 0) % CAFES_POR_RECOMPENSA;
                const canRedeem = (stats.purchases || 0) >= CAFES_POR_RECOMPENSA && 
                                 (stats.purchases || 0) % CAFES_POR_RECOMPENSA === 0;

                res.json({
                    ...user,
                    stats: {
                        totalPurchases: stats.purchases || 0,
                        totalRewards: stats.rewards || 0,
                        currentPoints,
                        canRedeem,
                        cafesForReward: CAFES_POR_RECOMPENSA - currentPoints
                    }
                });
            }
        );
    });
});

// Generar QR code del cliente
app.get('/api/user/qrcode', authenticateToken, (req, res) => {
    if (req.user.type !== 'user') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    db.get('SELECT qr_code FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }

        QRCode.toDataURL(user.qr_code, { errorCorrectionLevel: 'H' }, (err, url) => {
            if (err) {
                return res.status(500).json({ error: 'Error generando QR' });
            }
            res.json({ qr_code: url, qr_data: user.qr_code });
        });
    });
});

// Obtener historial de transacciones
app.get('/api/user/history', authenticateToken, (req, res) => {
    if (req.user.type !== 'user') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    db.all(
        `SELECT t.*, m.business_name 
         FROM transactions t
         JOIN merchants m ON t.merchant_id = m.id
         WHERE t.user_id = ?
         ORDER BY t.created_at DESC
         LIMIT 50`,
        [req.user.id],
        (err, transactions) => {
            if (err) {
                return res.status(500).json({ error: 'Error obteniendo historial' });
            }
            res.json(transactions);
        }
    );
});

// ========== RUTAS PROTEGIDAS - COMERCIANTES ==========

// Escanear QR y obtener información del cliente
app.post('/api/merchant/scan', authenticateToken, (req, res) => {
    if (req.user.type !== 'merchant') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { qr_code } = req.body;

    if (!qr_code) {
        return res.status(400).json({ error: 'QR code es requerido' });
    }

    db.get('SELECT id, name, email, qr_code FROM users WHERE qr_code = ?', [qr_code], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Obtener estadísticas del cliente
        db.get(
            `SELECT 
                COUNT(CASE WHEN type = 'purchase' THEN 1 END) as purchases,
                COUNT(CASE WHEN type = 'reward' THEN 1 END) as rewards
            FROM transactions 
            WHERE user_id = ?`,
            [user.id],
            (err, stats) => {
                if (err) {
                    return res.status(500).json({ error: 'Error calculando estadísticas' });
                }

                const currentPoints = (stats.purchases || 0) % CAFES_POR_RECOMPENSA;
                const canRedeem = (stats.purchases || 0) >= CAFES_POR_RECOMPENSA && 
                                 (stats.purchases || 0) % CAFES_POR_RECOMPENSA === 0;

                res.json({
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email
                    },
                    stats: {
                        totalPurchases: stats.purchases || 0,
                        totalRewards: stats.rewards || 0,
                        currentPoints,
                        canRedeem,
                        cafesForReward: CAFES_POR_RECOMPENSA - currentPoints
                    }
                });
            }
        );
    });
});

// Registrar compra
app.post('/api/merchant/purchase', authenticateToken, (req, res) => {
    if (req.user.type !== 'merchant') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'ID de usuario es requerido' });
    }

    const transactionId = uuidv4();

    db.run(
        'INSERT INTO transactions (id, user_id, merchant_id, type, points) VALUES (?, ?, ?, ?, ?)',
        [transactionId, user_id, req.user.id, 'purchase', 1],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Error registrando compra' });
            }

            // Verificar si puede canjear recompensa
            db.get(
                `SELECT COUNT(*) as count FROM transactions 
                 WHERE user_id = ? AND type = 'purchase'`,
                [user_id],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error verificando puntos' });
                    }

                    const canRedeem = (result.count % CAFES_POR_RECOMPENSA) === 0;

                    res.json({
                        message: 'Compra registrada exitosamente',
                        transaction_id: transactionId,
                        canRedeem
                    });
                }
            );
        }
    );
});

// Canjear recompensa (café gratis)
app.post('/api/merchant/redeem', authenticateToken, (req, res) => {
    if (req.user.type !== 'merchant') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'ID de usuario es requerido' });
    }

    // Verificar que el cliente tiene suficientes puntos
    db.get(
        `SELECT COUNT(*) as count FROM transactions 
         WHERE user_id = ? AND type = 'purchase'`,
        [user_id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error verificando puntos' });
            }

            const purchases = result.count;
            const canRedeem = purchases >= CAFES_POR_RECOMPENSA && 
                             (purchases % CAFES_POR_RECOMPENSA) === 0;

            if (!canRedeem) {
                return res.status(400).json({ 
                    error: 'No tiene suficientes puntos para canjear',
                    currentPoints: purchases % CAFES_POR_RECOMPENSA,
                    needed: CAFES_POR_RECOMPENSA - (purchases % CAFES_POR_RECOMPENSA)
                });
            }

            const transactionId = uuidv4();

            db.run(
                'INSERT INTO transactions (id, user_id, merchant_id, type, points) VALUES (?, ?, ?, ?, ?)',
                [transactionId, user_id, req.user.id, 'reward', 0],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Error canjeando recompensa' });
                    }

                    res.json({
                        message: 'Recompensa canjeada exitosamente',
                        transaction_id: transactionId
                    });
                }
            );
        }
    );
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Accede desde otros dispositivos en la red usando tu IP local`);
    console.log(`Ejemplo: http://192.168.1.147:${PORT}`);
});

