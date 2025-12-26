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
let authToken = null;
let currentMerchant = null;
let scannedCustomer = null;
let html5QrcodeScanner = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    authToken = localStorage.getItem('merchantToken');
    if (authToken) {
        loadMerchantProfile();
    } else {
        showAuthScreen();
    }

    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    document.getElementById('startScanBtn').addEventListener('click', startScanner);
    document.getElementById('stopScanBtn').addEventListener('click', stopScanner);
    document.getElementById('registerPurchaseBtn').addEventListener('click', registerPurchase);
    document.getElementById('redeemRewardBtn').addEventListener('click', redeemReward);
    document.getElementById('manualInputBtn').addEventListener('click', showManualInput);
    document.getElementById('cancelManualBtn').addEventListener('click', hideManualInput);
    document.getElementById('submitManualBtn').addEventListener('click', submitManualQR);
    document.getElementById('manualQRInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitManualQR();
        }
    });
}

// Mostrar formulario de registro
function showRegisterForm() {
    document.getElementById('loginForm').parentElement.style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Mostrar formulario de login
function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').parentElement.style.display = 'block';
}

// Manejar login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_URL}/merchant/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.error || 'Error signing in';
            return;
        }

        authToken = data.token;
        currentMerchant = data.merchant;
        localStorage.setItem('merchantToken', authToken);
        showMainScreen();
        loadMerchantProfile();
    } catch (error) {
        errorDiv.textContent = 'Connection error. Make sure the server is running.';
    }
}

// Manejar registro
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const business_name = document.getElementById('registerBusiness').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('registerError');

    try {
        const response = await fetch(`${API_URL}/merchant/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, business_name })
        });

        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.error || 'Error signing up';
            return;
        }

        authToken = data.token;
        currentMerchant = data.merchant;
        localStorage.setItem('merchantToken', authToken);
        showMainScreen();
        loadMerchantProfile();
    } catch (error) {
        errorDiv.textContent = 'Connection error. Make sure the server is running.';
    }
}

// Manejar logout
function handleLogout() {
    stopScanner();
    authToken = null;
    currentMerchant = null;
    scannedCustomer = null;
    localStorage.removeItem('merchantToken');
    showAuthScreen();
}

// Mostrar pantalla de autenticación
function showAuthScreen() {
    document.getElementById('authScreen').classList.add('active');
    document.getElementById('mainScreen').classList.remove('active');
    document.getElementById('customerInfo').style.display = 'none';
}

// Mostrar pantalla principal
function showMainScreen() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
}

// Cargar perfil del comerciante
async function loadMerchantProfile() {
    if (!authToken) return;

    // El perfil ya está en currentMerchant después del login
    document.getElementById('merchantName').textContent = currentMerchant.name;
    document.getElementById('businessName').textContent = currentMerchant.business_name;
}

// Detectar si es móvil
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Iniciar escáner QR
async function startScanner() {
    const qrReader = document.getElementById('qr-reader');
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const scanStatus = document.getElementById('scanStatus');

    if (!Html5Qrcode) {
        scanStatus.textContent = 'Error: QR library not loaded';
        scanStatus.className = 'scan-status error';
        return;
    }

    // Limpiar cualquier escáner previo
    if (html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.stop();
            html5QrcodeScanner.clear();
        } catch (e) {
            console.log('Limpiando escáner previo');
        }
    }

    html5QrcodeScanner = new Html5Qrcode("qr-reader");

    // Configuración diferente para móviles
    const isMobile = isMobileDevice();
    const config = isMobile 
        ? {
            fps: 5,
            qrbox: function(viewfinderWidth, viewfinderHeight) {
                // En móviles, usar el 80% del viewfinder
                const minEdgePercentage = 0.8;
                const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                return {
                    width: qrboxSize,
                    height: qrboxSize
                };
            },
            aspectRatio: 1.0
        }
        : {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        };

    // Intentar diferentes métodos de acceso a la cámara
    const cameraConfigs = [
        { facingMode: "environment" }, // Cámara trasera (preferida)
        { facingMode: "user" },        // Cámara frontal
        { deviceId: undefined }        // Cualquier cámara disponible
    ];

    let lastError = null;
    
    for (let i = 0; i < cameraConfigs.length; i++) {
        try {
            scanStatus.textContent = 'Iniciando cámara...';
            scanStatus.className = 'scan-status scanning';
            
            await html5QrcodeScanner.start(
                cameraConfigs[i],
                config,
                (decodedText, decodedResult) => {
                    // QR escaneado exitosamente
                    handleQRScanned(decodedText);
                },
                (errorMessage) => {
                    // Ignorar errores de escaneo continuo
                }
            );

            // Si llegamos aquí, la cámara se inició correctamente
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            scanStatus.textContent = 'Scanning... Point at QR code';
            scanStatus.className = 'scan-status scanning';
            return; // Salir si funciona
            
        } catch (err) {
            lastError = err;
            console.log(`Intento ${i + 1} falló:`, err);
            
            // Si no es el último intento, limpiar y continuar
            if (i < cameraConfigs.length - 1) {
                try {
                    await html5QrcodeScanner.stop();
                    html5QrcodeScanner.clear();
                } catch (e) {
                    // Ignorar errores de limpieza
                }
            }
        }
    }

    // Si todos los intentos fallaron
    scanStatus.textContent = 'Error: Could not access camera. Check permissions.';
    scanStatus.className = 'scan-status error';
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    
    if (lastError) {
        console.error('Error final:', lastError);
    }
}

// Detener escáner QR
async function stopScanner() {
    if (html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.stop();
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
        } catch (err) {
            console.error('Error deteniendo escáner:', err);
            // Intentar limpiar de todas formas
            try {
                html5QrcodeScanner.clear();
            } catch (e) {
                // Ignorar
            }
            html5QrcodeScanner = null;
        }
    }

    document.getElementById('startScanBtn').style.display = 'inline-block';
    document.getElementById('stopScanBtn').style.display = 'none';
    document.getElementById('scanStatus').textContent = '';
    document.getElementById('scanStatus').className = 'scan-status';
}

// Manejar QR escaneado
async function handleQRScanned(qrData) {
    stopScanner();
    
    const scanStatus = document.getElementById('scanStatus');
            scanStatus.textContent = 'Processing...';
    scanStatus.className = 'scan-status scanning';

    try {
        const response = await fetch(`${API_URL}/merchant/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ qr_code: qrData })
        });

        const data = await response.json();

        if (!response.ok) {
            scanStatus.textContent = data.error || 'Error scanning QR';
            scanStatus.className = 'scan-status error';
            return;
        }

        scannedCustomer = data;
        // Guardar el qr_code para futuras actualizaciones
        scannedCustomer.user.qr_code = qrData;
        displayCustomerInfo(data);
        scanStatus.textContent = 'Customer found ✓';
        scanStatus.className = 'scan-status success';
    } catch (error) {
        scanStatus.textContent = 'Connection error';
        scanStatus.className = 'scan-status error';
        console.error('Error:', error);
    }
}

// Mostrar información del cliente
function displayCustomerInfo(data) {
    const customerInfo = document.getElementById('customerInfo');
    const user = data.user;
    const stats = data.stats;

    document.getElementById('customerName').textContent = user.name;
    document.getElementById('customerEmail').textContent = user.email;
    document.getElementById('customerPurchases').textContent = stats.totalPurchases;
    document.getElementById('customerRewards').textContent = stats.totalRewards;
    document.getElementById('customerPoints').textContent = stats.currentPoints;

    // Actualizar tazas visuales
    const currentPoints = stats.currentPoints;
    const progress = (currentPoints / 4) * 100;
    
    document.querySelectorAll('#customerInfo .cup').forEach((cup, index) => {
        cup.classList.toggle('completed', index < currentPoints);
    });

    document.getElementById('customerProgressFill').style.width = `${progress}%`;
    document.getElementById('customerCurrentCups').textContent = currentPoints;

    // Mostrar/ocultar botón de canjear recompensa
    const redeemBtn = document.getElementById('redeemRewardBtn');
    const rewardStatus = document.getElementById('customerRewardStatus');
    
    if (stats.canRedeem) {
        redeemBtn.style.display = 'inline-block';
        rewardStatus.style.display = 'block';
    } else {
        redeemBtn.style.display = 'none';
        rewardStatus.style.display = 'none';
    }

    customerInfo.style.display = 'block';
    customerInfo.scrollIntoView({ behavior: 'smooth' });
}

// Registrar compra
async function registerPurchase() {
    if (!scannedCustomer) {
        showMessage('No customer scanned', 'error');
        return;
    }

    const btn = document.getElementById('registerPurchaseBtn');
    btn.disabled = true;
    btn.textContent = 'Registering...';

    try {
        const response = await fetch(`${API_URL}/merchant/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ user_id: scannedCustomer.user.id })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.error || 'Error registering purchase', 'error');
            btn.disabled = false;
            btn.textContent = 'Register Purchase';
            return;
        }

        showMessage('Purchase registered successfully! ☕', 'success');
        
        // Actualizar información del cliente
        setTimeout(() => {
            refreshCustomerInfo();
        }, 1000);
        
        btn.disabled = false;
        btn.textContent = 'Registrar Compra';
    } catch (error) {
        showMessage('Connection error', 'error');
        btn.disabled = false;
        btn.textContent = 'Registrar Compra';
    }
}

// Canjear recompensa
async function redeemReward() {
    if (!scannedCustomer) {
        showMessage('No customer scanned', 'error');
        return;
    }

    const btn = document.getElementById('redeemRewardBtn');
    btn.disabled = true;
        btn.textContent = 'Redeeming...';

    try {
        const response = await fetch(`${API_URL}/merchant/redeem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ user_id: scannedCustomer.user.id })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.error || 'Error redeeming reward', 'error');
            btn.disabled = false;
            btn.textContent = 'Redeem Free Coffee';
            return;
        }

        showMessage('Free coffee redeemed successfully! 🎉', 'success');
        
        // Actualizar información del cliente
        setTimeout(() => {
            refreshCustomerInfo();
        }, 1000);
        
        btn.disabled = false;
        btn.textContent = 'Canjear Café Gratis';
    } catch (error) {
        showMessage('Connection error', 'error');
        btn.disabled = false;
        btn.textContent = 'Canjear Café Gratis';
    }
}

// Actualizar información del cliente sin re-escanear
async function refreshCustomerInfo() {
    if (!scannedCustomer || !scannedCustomer.user.qr_code) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/merchant/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ qr_code: scannedCustomer.user.qr_code })
        });

        const data = await response.json();

        if (response.ok) {
            scannedCustomer = data;
            displayCustomerInfo(data);
        }
    } catch (error) {
        console.error('Error actualizando información:', error);
    }
}

// Mostrar input manual
function showManualInput() {
    stopScanner();
    document.getElementById('manualInputDiv').style.display = 'block';
    document.getElementById('manualInputBtn').style.display = 'none';
    document.getElementById('manualQRInput').focus();
}

// Ocultar input manual
function hideManualInput() {
    document.getElementById('manualInputDiv').style.display = 'none';
    document.getElementById('manualInputBtn').style.display = 'inline-block';
    document.getElementById('manualQRInput').value = '';
}

// Enviar código QR manual
async function submitManualQR() {
    const qrCode = document.getElementById('manualQRInput').value.trim();
    
    if (!qrCode) {
        showMessage('Please enter a QR code', 'error');
        return;
    }

    hideManualInput();
    await handleQRScanned(qrCode);
}

// Mostrar mensaje
function showMessage(message, type) {
    const messageDiv = document.getElementById('messageDiv');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

