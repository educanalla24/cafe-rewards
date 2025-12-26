# ☕ Café Rewards - Sistema de Fidelización con QR

Aplicación completa de fidelización para cafeterías con sistema de códigos QR. Cada 4 cafés comprados, el cliente obtiene 1 café gratis.

## 🎯 Características

### Para Clientes:
- ✅ Registro e inicio de sesión
- 📱 Código QR único para cada cliente
- 📊 Visualización del progreso (4 tazas de café)
- 🎁 Canjeo automático de recompensas
- 📝 Historial completo de compras
- 📈 Estadísticas personales

### Para Comerciantes:
- ✅ Registro e inicio de sesión
- 📷 Escáner de códigos QR de clientes
- ☕ Registro rápido de compras
- 🎁 Canjeo de recompensas
- 👤 Visualización de información del cliente
- 📊 Estadísticas del cliente en tiempo real

## 🚀 Instalación

### Requisitos previos
- Node.js (v14 o superior)
- npm o yarn

### Pasos de instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Iniciar el servidor:**
```bash
npm start
```

O para desarrollo con auto-reload:
```bash
npm run dev
```

3. **Abrir en el navegador:**
- Página principal: http://localhost:3000
- Panel de cliente: http://localhost:3000/client/
- Panel de comerciante: http://localhost:3000/merchant/

## 📁 Estructura del Proyecto

```
cafe/
├── server.js              # Servidor Express y API
├── package.json           # Dependencias del proyecto
├── cafe_rewards.db        # Base de datos SQLite (se crea automáticamente)
├── public/
│   ├── index.html         # Página principal (selector de rol)
│   ├── styles.css         # Estilos compartidos
│   ├── client/            # Frontend para clientes
│   │   ├── index.html
│   │   └── client.js
│   └── merchant/          # Frontend para comerciantes
│       ├── index.html
│       └── merchant.js
└── README.md
```

## 🔧 Tecnologías Utilizadas

### Backend:
- **Express.js** - Framework web
- **SQLite3** - Base de datos
- **bcryptjs** - Encriptación de contraseñas
- **jsonwebtoken** - Autenticación JWT
- **qrcode** - Generación de códigos QR
- **uuid** - Generación de IDs únicos

### Frontend:
- **HTML5** - Estructura
- **CSS3** - Estilos modernos con variables CSS
- **JavaScript (ES6+)** - Lógica de la aplicación
- **html5-qrcode** - Escáner de códigos QR (CDN)

## 📱 Uso de la Aplicación

### Para Clientes:

1. **Registro:**
   - Ve a http://localhost:3000/client/
   - Haz clic en "Registrarse"
   - Completa el formulario (nombre, email, contraseña)
   - Inicia sesión con tus credenciales

2. **Usar tu código QR:**
   - Una vez iniciada sesión, verás tu código QR único
   - Muestra este código al comerciante cuando compres un café
   - El comerciante escaneará el código y registrará tu compra

3. **Ver tu progreso:**
   - La aplicación muestra visualmente tu progreso con 4 tazas de café
   - Cuando completes 4 compras, podrás canjear un café gratis
   - Revisa tu historial y estadísticas en la misma pantalla

### Para Comerciantes:

1. **Registro:**
   - Ve a http://localhost:3000/merchant/
   - Haz clic en "Regístrate aquí"
   - Completa el formulario (nombre, email, nombre del negocio, contraseña)
   - Inicia sesión con tus credenciales

2. **Escanear códigos QR:**
   - Haz clic en "Iniciar Escáner"
   - Permite el acceso a la cámara cuando se solicite
   - Apunta la cámara al código QR del cliente
   - La información del cliente aparecerá automáticamente

3. **Registrar compras:**
   - Después de escanear el QR, verás la información del cliente
   - Haz clic en "Registrar Compra" para agregar un café
   - El sistema actualizará automáticamente los puntos del cliente

4. **Canjear recompensas:**
   - Si el cliente tiene 4 cafés acumulados, aparecerá el botón "Canjear Café Gratis"
   - Haz clic para canjear la recompensa
   - El contador se reiniciará automáticamente

## 🔐 Seguridad

- Las contraseñas se encriptan con bcryptjs
- Autenticación mediante JWT (JSON Web Tokens)
- Cada cliente tiene un código QR único e irrepetible
- Las rutas protegidas requieren autenticación

## 💾 Base de Datos

La aplicación utiliza SQLite con las siguientes tablas:

- **users**: Clientes registrados
- **merchants**: Comerciantes registrados
- **transactions**: Historial de compras y recompensas

La base de datos se crea automáticamente al iniciar el servidor.

## 🎨 Personalización

Puedes personalizar los colores editando las variables CSS en `public/styles.css`:

```css
:root {
    --primary-color: #6F4E37;      /* Color principal (marrón café) */
    --secondary-color: #C9A961;   /* Color secundario (dorado) */
    --accent-color: #8B4513;       /* Color de acento */
    --success-color: #4CAF50;      /* Color de éxito */
}
```

## 🔄 Sistema de Puntos

- Cada compra de café = 1 punto
- 4 puntos = 1 café gratis
- Los puntos se acumulan por cliente, no por comerciante
- El contador se reinicia después de canjear una recompensa

## 📝 Notas Importantes

- El servidor debe estar corriendo para que la aplicación funcione
- Los códigos QR se generan automáticamente al registrarse
- El escáner QR requiere acceso a la cámara del dispositivo
- Los datos se almacenan en una base de datos SQLite local
- Para producción, considera cambiar el JWT_SECRET en `server.js`

## 🐛 Solución de Problemas

### El servidor no inicia:
- Verifica que el puerto 3000 no esté en uso
- Asegúrate de haber instalado todas las dependencias (`npm install`)

### El escáner QR no funciona:
- Verifica que hayas dado permiso para usar la cámara
- Asegúrate de usar HTTPS en producción (requerido para acceso a cámara)

### Error de conexión en el frontend:
- Verifica que el servidor esté corriendo en http://localhost:3000
- Revisa la consola del navegador para más detalles

## 🚀 Próximas Mejoras Posibles

- [ ] Sincronización en la nube
- [ ] Notificaciones push
- [ ] Exportar estadísticas
- [ ] Modo oscuro
- [ ] Múltiples programas de recompensa
- [ ] Dashboard de administración
- [ ] Reportes para comerciantes

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal y comercial.

---

Desarrollado con ☕ y ❤️
