// Sistema de fidelización: Cada 4 cafés = 1 gratis

class CafeRewardsApp {
    constructor() {
        this.CAFES_POR_RECOMPENSA = 4;
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateUI();
    }

    // Cargar datos del almacenamiento local
    loadData() {
        const savedData = localStorage.getItem('cafeRewardsData');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.currentLocal = data.currentLocal || 'local1';
            this.cups = data.cups || {};
            this.history = data.history || [];
            this.locals = data.locals || ['Café Central', 'Café del Barrio', 'Café Express'];
            this.stats = data.stats || {
                totalCups: 0,
                freeCups: 0,
                totalLocals: new Set()
            };
        } else {
            this.currentLocal = 'local1';
            this.cups = {};
            this.history = [];
            this.locals = ['Café Central', 'Café del Barrio', 'Café Express'];
            this.stats = {
                totalCups: 0,
                freeCups: 0,
                totalLocals: []
            };
        }
        
        // Asegurar que el local actual tenga un contador
        if (!this.cups[this.currentLocal]) {
            this.cups[this.currentLocal] = 0;
        }
    }

    // Guardar datos en almacenamiento local
    saveData() {
        const data = {
            currentLocal: this.currentLocal,
            cups: this.cups,
            history: this.history,
            locals: this.locals,
            stats: {
                totalCups: this.stats.totalCups,
                freeCups: this.stats.freeCups,
                totalLocals: Array.from(this.stats.totalLocals)
            }
        };
        localStorage.setItem('cafeRewardsData', JSON.stringify(data));
    }

    // Configurar event listeners
    setupEventListeners() {
        // Botón agregar café
        document.getElementById('addCupBtn').addEventListener('click', () => {
            this.addCup();
        });

        // Botón canjear recompensa
        document.getElementById('redeemBtn').addEventListener('click', () => {
            this.redeemReward();
        });

        // Selector de local
        document.getElementById('localSelect').addEventListener('change', (e) => {
            this.currentLocal = e.target.value;
            if (!this.cups[this.currentLocal]) {
                this.cups[this.currentLocal] = 0;
            }
            this.updateUI();
            this.saveData();
        });

        // Agregar nuevo local
        document.getElementById('addLocalBtn').addEventListener('click', () => {
            this.showAddLocalModal();
        });

        // Modal
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideAddLocalModal();
        });

        document.getElementById('cancelLocalBtn').addEventListener('click', () => {
            this.hideAddLocalModal();
        });

        document.getElementById('saveLocalBtn').addEventListener('click', () => {
            this.saveNewLocal();
        });

        // Cerrar modal al hacer clic fuera
        document.getElementById('addLocalModal').addEventListener('click', (e) => {
            if (e.target.id === 'addLocalModal') {
                this.hideAddLocalModal();
            }
        });
    }

    // Agregar un café comprado
    addCup() {
        const currentCups = this.cups[this.currentLocal] || 0;
        
        // Incrementar contador
        this.cups[this.currentLocal] = currentCups + 1;
        
        // Actualizar estadísticas
        this.stats.totalCups++;
        if (!this.stats.totalLocals.includes(this.currentLocal)) {
            this.stats.totalLocals.push(this.currentLocal);
        }
        
        // Agregar al historial
        this.addToHistory('compra', this.currentLocal);
        
        // Guardar y actualizar UI
        this.saveData();
        this.updateUI();
        
        // Animación de confirmación
        this.showNotification('¡Café agregado! ☕');
    }

    // Canjear recompensa (café gratis)
    redeemReward() {
        const currentCups = this.cups[this.currentLocal] || 0;
        
        if (currentCups >= this.CAFES_POR_RECOMPENSA) {
            // Resetear contador
            this.cups[this.currentLocal] = 0;
            
            // Actualizar estadísticas
            this.stats.freeCups++;
            
            // Agregar al historial
            this.addToHistory('recompensa', this.currentLocal);
            
            // Guardar y actualizar UI
            this.saveData();
            this.updateUI();
            
            // Animación de celebración
            this.showNotification('¡Café gratis canjeado! 🎉');
        }
    }

    // Agregar entrada al historial
    addToHistory(type, local) {
        const localName = this.getLocalName(local);
        const entry = {
            type: type,
            local: localName,
            date: new Date().toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            timestamp: Date.now()
        };
        this.history.unshift(entry);
        
        // Mantener solo los últimos 50 registros
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }
    }

    // Obtener nombre del local
    getLocalName(localKey) {
        if (localKey.startsWith('local')) {
            const index = parseInt(localKey.replace('local', '')) - 1;
            return this.locals[index] || localKey;
        }
        return localKey;
    }

    // Actualizar interfaz de usuario
    updateUI() {
        const currentCups = this.cups[this.currentLocal] || 0;
        const progress = (currentCups % this.CAFES_POR_RECOMPENSA) / this.CAFES_POR_RECOMPENSA * 100;
        const canRedeem = currentCups >= this.CAFES_POR_RECOMPENSA;
        
        // Actualizar nombre del local
        document.getElementById('localName').textContent = this.getLocalName(this.currentLocal);
        
        // Actualizar tazas visuales
        this.updateCupsVisual(currentCups);
        
        // Actualizar barra de progreso
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('currentCups').textContent = currentCups % this.CAFES_POR_RECOMPENSA;
        
        // Actualizar estado de recompensa
        const rewardStatus = document.getElementById('rewardStatus');
        if (canRedeem) {
            rewardStatus.classList.add('ready');
            rewardStatus.innerHTML = '<p>🎉 ¡Tienes un café gratis disponible!</p>';
            document.getElementById('redeemBtn').disabled = false;
        } else {
            rewardStatus.classList.remove('ready');
            const remaining = this.CAFES_POR_RECOMPENSA - (currentCups % this.CAFES_POR_RECOMPENSA);
            rewardStatus.innerHTML = `<p>Faltan ${remaining} café${remaining > 1 ? 's' : ''} para tu recompensa</p>`;
            document.getElementById('redeemBtn').disabled = true;
        }
        
        // Actualizar selector de locales
        this.updateLocalSelector();
        
        // Actualizar historial
        this.updateHistory();
        
        // Actualizar estadísticas
        this.updateStats();
    }

    // Actualizar visualización de tazas
    updateCupsVisual(currentCups) {
        const cups = document.querySelectorAll('.cup');
        const completedCups = currentCups % this.CAFES_POR_RECOMPENSA;
        
        cups.forEach((cup, index) => {
            if (index < completedCups) {
                cup.classList.add('completed');
            } else {
                cup.classList.remove('completed');
            }
        });
    }

    // Actualizar selector de locales
    updateLocalSelector() {
        const select = document.getElementById('localSelect');
        select.innerHTML = '';
        
        this.locals.forEach((localName, index) => {
            const option = document.createElement('option');
            option.value = `local${index + 1}`;
            option.textContent = localName;
            if (`local${index + 1}` === this.currentLocal) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    // Actualizar historial
    updateHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<p class="empty-history">No hay compras registradas aún</p>';
            return;
        }
        
        historyList.innerHTML = this.history.map(entry => {
            const isRedeemed = entry.type === 'recompensa';
            const icon = isRedeemed ? '🎁' : '☕';
            const text = isRedeemed 
                ? `Café gratis canjeado en ${entry.local}`
                : `Café comprado en ${entry.local}`;
            
            return `
                <div class="history-item ${isRedeemed ? 'redeemed' : ''}">
                    <div>
                        <div class="history-item-local">${icon} ${text}</div>
                        <div class="history-item-date">${entry.date}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Actualizar estadísticas
    updateStats() {
        document.getElementById('totalCups').textContent = this.stats.totalCups;
        document.getElementById('freeCups').textContent = this.stats.freeCups;
        document.getElementById('totalLocals').textContent = this.stats.totalLocals.length;
    }

    // Mostrar modal para agregar local
    showAddLocalModal() {
        document.getElementById('addLocalModal').classList.add('show');
        document.getElementById('newLocalName').value = '';
        document.getElementById('newLocalName').focus();
    }

    // Ocultar modal
    hideAddLocalModal() {
        document.getElementById('addLocalModal').classList.remove('show');
    }

    // Guardar nuevo local
    saveNewLocal() {
        const newLocalName = document.getElementById('newLocalName').value.trim();
        
        if (newLocalName && newLocalName.length > 0) {
            this.locals.push(newLocalName);
            const newLocalKey = `local${this.locals.length}`;
            this.cups[newLocalKey] = 0;
            this.currentLocal = newLocalKey;
            
            this.saveData();
            this.updateUI();
            this.hideAddLocalModal();
            
            this.showNotification('¡Local agregado! 🏪');
        }
    }

    // Mostrar notificación
    showNotification(message) {
        // Crear elemento de notificación si no existe
        let notification = document.querySelector('.notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--success-color);
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                z-index: 2000;
                font-weight: 600;
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 2000);
    }
}

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new CafeRewardsApp();
});

