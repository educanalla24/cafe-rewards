// Detectar la URL base automáticamente
// En producción (Render), window.location.port puede estar vacío
const getApiUrl = () => {
    const port = window.location.port;
    if (port) {
        return `${window.location.protocol}//${window.location.hostname}:${port}/api`;
    }
    // Sin puerto (producción con HTTPS/HTTP estándar)
    return `${window.location.protocol}//${window.location.hostname}/api`;
};
const API_URL = getApiUrl();

// Estado de la aplicación
let currentUser = null;
let authToken = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Cargar personalizaciones
    loadCustomLogo();
    loadCustomTitle();
    loadCustomSubtitle();
    
    // Verificar si hay token guardado
    authToken = localStorage.getItem('authToken');
    if (authToken) {
        loadUserProfile();
    } else {
        showAuthScreen();
    }

    setupEventListeners();
});

// Cargar logo personalizado
function loadCustomLogo() {
    const savedLogo = localStorage.getItem('customLogo');
    if (savedLogo) {
        const logoContainer = document.getElementById('customLogoContainer');
        const logoAuthContainer = document.getElementById('customLogoContainerAuth');
        const logoImg = document.getElementById('customLogo');
        const logoAuthImg = document.getElementById('customLogoAuth');
        
        if (logoContainer && logoImg) {
            logoContainer.style.display = 'block';
            logoImg.src = savedLogo;
        }
        
        if (logoAuthContainer && logoAuthImg) {
            logoAuthContainer.style.display = 'block';
            logoAuthImg.src = savedLogo;
        }
    }
}

// Cargar título personalizado
function loadCustomTitle() {
    const savedTitle = localStorage.getItem('customTitle');
    const titleElement = document.getElementById('customTitle');
    const titleAuthElement = document.getElementById('customTitleAuth');
    
    if (savedTitle) {
        if (titleElement) {
            titleElement.textContent = savedTitle;
        }
        if (titleAuthElement) {
            titleAuthElement.textContent = savedTitle;
        }
    } else {
        // Restaurar título por defecto
        if (titleElement) {
            titleElement.textContent = '☕ Café Rewards';
        }
        if (titleAuthElement) {
            titleAuthElement.textContent = '☕ Café Rewards';
        }
    }
}

// Cargar subtítulo personalizado
function loadCustomSubtitle() {
    const savedSubtitle = localStorage.getItem('customSubtitle');
    const subtitleElement = document.getElementById('customSubtitleAuth');
    
    if (savedSubtitle) {
        if (subtitleElement) {
            subtitleElement.textContent = savedSubtitle;
        }
    } else {
        // Restaurar subtítulo por defecto
        if (subtitleElement) {
            subtitleElement.textContent = 'Cada 4 cafés, obtén 1 gratis';
        }
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Tabs de autenticación
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchAuthTab(tab);
        });
    });

    // Formularios
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    
    // Botón de logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Botón de actualizar QR
    document.getElementById('refreshQRBtn').addEventListener('click', loadQRCode);
    
    // Botón de copiar código QR
    document.getElementById('copyQRBtn').addEventListener('click', copyQRCode);
}

// Cambiar entre tabs de login/registro
function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.getElementById('loginForm').classList.toggle('active', tab === 'login');
    document.getElementById('registerForm').classList.toggle('active', tab === 'register');
    
    // Limpiar errores
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
}

// Manejar login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.error || 'Error al iniciar sesión';
            return;
        }

        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        showMainScreen();
        loadUserProfile();
    } catch (error) {
        errorDiv.textContent = 'Error de conexión. Verifica que el servidor esté corriendo.';
    }
}

// Manejar registro
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('registerError');

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.error || 'Error al registrarse';
            return;
        }

        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        showMainScreen();
        loadUserProfile();
    } catch (error) {
        errorDiv.textContent = 'Error de conexión. Verifica que el servidor esté corriendo.';
    }
}

// Manejar logout
function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showAuthScreen();
}

// Mostrar pantalla de autenticación
function showAuthScreen() {
    document.getElementById('authScreen').classList.add('active');
    document.getElementById('mainScreen').classList.remove('active');
}

// Mostrar pantalla principal
function showMainScreen() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
}

// Cargar perfil del usuario
async function loadUserProfile() {
    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                handleLogout();
                return;
            }
            throw new Error('Error cargando perfil');
        }

        const data = await response.json();
        currentUser = data;
        
        updateUI(data);
        loadQRCode();
        loadHistory();
    } catch (error) {
        console.error('Error:', error);
    }
}

// Actualizar UI
function updateUI(userData) {
    document.getElementById('userName').textContent = userData.name;
    
    const stats = userData.stats;
    const currentPoints = stats.currentPoints;
    const progress = (currentPoints / 4) * 100;
    const canRedeem = stats.canRedeem;

    // Actualizar tazas visuales
    document.querySelectorAll('.cup').forEach((cup, index) => {
        cup.classList.toggle('completed', index < currentPoints);
    });

    // Actualizar barra de progreso
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('currentCups').textContent = currentPoints;

    // Actualizar estado de recompensa
    const rewardStatus = document.getElementById('rewardStatus');
    if (canRedeem) {
        rewardStatus.classList.add('ready');
        rewardStatus.innerHTML = '<p>🎉 ¡Tienes un café gratis disponible!</p>';
    } else {
        rewardStatus.classList.remove('ready');
        const remaining = stats.cafesForReward;
        rewardStatus.innerHTML = `<p>Faltan ${remaining} café${remaining > 1 ? 's' : ''} para tu recompensa</p>`;
    }

    // Actualizar estadísticas
    document.getElementById('totalPurchases').textContent = stats.totalPurchases;
    document.getElementById('totalRewards').textContent = stats.totalRewards;
    document.getElementById('cafesForReward').textContent = stats.cafesForReward;
}

// Cargar código QR
async function loadQRCode() {
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = '<div class="qr-loading">Cargando QR...</div>';

    try {
        const response = await fetch(`${API_URL}/user/qrcode`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Error cargando QR');
        }

        const data = await response.json();
        qrContainer.innerHTML = `<img src="${data.qr_code}" alt="QR Code" class="qr-image">`;
        
        // Actualizar el código QR en texto
        document.getElementById('qrCodeText').value = data.qr_data;
    } catch (error) {
        qrContainer.innerHTML = '<div class="qr-error">Error cargando QR</div>';
        console.error('Error:', error);
    }
}

// Copiar código QR al portapapeles
async function copyQRCode() {
    const qrCodeText = document.getElementById('qrCodeText');
    const copyBtn = document.getElementById('copyQRBtn');
    
    if (!qrCodeText.value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(qrCodeText.value);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copiado!';
        copyBtn.style.background = 'var(--success-color)';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '';
        }, 2000);
    } catch (error) {
        // Fallback para navegadores que no soportan clipboard API
        qrCodeText.select();
        qrCodeText.setSelectionRange(0, 99999); // Para móviles
        try {
            document.execCommand('copy');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓ Copiado!';
            copyBtn.style.background = 'var(--success-color)';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
            }, 2000);
        } catch (err) {
            alert('No se pudo copiar. Por favor, selecciona y copia manualmente.');
        }
    }
}

// Cargar historial
async function loadHistory() {
    const historyList = document.getElementById('historyList');

    try {
        const response = await fetch(`${API_URL}/user/history`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Error cargando historial');
        }

        const transactions = await response.json();

        if (transactions.length === 0) {
            historyList.innerHTML = '<p class="empty-history">No hay compras registradas aún</p>';
            return;
        }

        historyList.innerHTML = transactions.map(transaction => {
            const isReward = transaction.type === 'reward';
            const icon = isReward ? '🎁' : '☕';
            const text = isReward 
                ? `Café gratis canjeado en ${transaction.business_name}`
                : `Café comprado en ${transaction.business_name}`;
            const date = new Date(transaction.created_at).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="history-item ${isReward ? 'redeemed' : ''}">
                    <div>
                        <div class="history-item-local">${icon} ${text}</div>
                        <div class="history-item-date">${date}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        historyList.innerHTML = '<p class="empty-history">Error cargando historial</p>';
        console.error('Error:', error);
    }
}

// Auto-refrescar cada 5 segundos si está en la pantalla principal
setInterval(() => {
    if (authToken && document.getElementById('mainScreen').classList.contains('active')) {
        loadUserProfile();
    }
}, 5000);

