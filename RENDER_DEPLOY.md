# 🚀 Guía de Despliegue en Render

Esta guía te ayudará a desplegar la aplicación Café Rewards en Render.

## 📋 Requisitos Previos

1. Cuenta en [Render.com](https://render.com) (gratis)
2. Repositorio Git (GitHub, GitLab o Bitbucket)

## 🔧 Pasos para Desplegar

### 1. Preparar el Repositorio

Asegúrate de que tu código esté en un repositorio Git:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <tu-repositorio-url>
git push -u origin main
```

### 2. Crear el Servicio en Render

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Haz clic en **"New +"** → **"Web Service"**
3. Conecta tu repositorio Git
4. Configura el servicio:

   - **Name**: `cafe-rewards` (o el nombre que prefieras)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (o el plan que prefieras)

### 3. Configurar Variables de Entorno

En la sección **"Environment"** del servicio, agrega:

- **JWT_SECRET**: Genera un secreto seguro (puedes usar: `openssl rand -base64 32`)
- **NODE_ENV**: `production`

Render automáticamente asignará el **PORT**, no necesitas configurarlo.

### 4. Desplegar

1. Haz clic en **"Create Web Service"**
2. Render comenzará a construir y desplegar tu aplicación
3. Espera a que el deploy termine (puede tomar unos minutos)
4. Tu aplicación estará disponible en: `https://cafe-rewards.onrender.com` (o la URL que Render asigne)

## ⚠️ Notas Importantes

### Base de Datos SQLite

- **IMPORTANTE**: En el plan gratuito de Render, los archivos se eliminan cuando el servicio se duerme o se reinicia
- Los datos de la base de datos SQLite se perderán en cada reinicio
- Para producción, considera migrar a PostgreSQL (Render ofrece bases de datos PostgreSQL gratuitas)

### HTTPS

- Render proporciona HTTPS automáticamente
- Esto es necesario para que el escáner QR funcione en dispositivos móviles

### Variables de Entorno

Asegúrate de configurar `JWT_SECRET` con un valor seguro y único. No uses el valor por defecto en producción.

## 🔄 Actualizar la Aplicación

Cada vez que hagas `git push` a tu repositorio, Render automáticamente:

1. Detectará los cambios
2. Reconstruirá la aplicación
3. La redesplegará

## 📱 Acceder desde Móviles

Una vez desplegado, puedes acceder desde cualquier dispositivo usando la URL de Render:

- `https://tu-app.onrender.com` (página principal)
- `https://tu-app.onrender.com/client/` (clientes)
- `https://tu-app.onrender.com/merchant/` (comerciantes)

## 🐛 Solución de Problemas

### El servicio no inicia

- Verifica los logs en Render Dashboard
- Asegúrate de que `npm start` esté correcto en package.json
- Verifica que todas las dependencias estén en `dependencies` (no solo `devDependencies`)

### Error de base de datos

- En el plan gratuito, la base de datos se reinicia. Esto es normal
- Considera migrar a PostgreSQL para persistencia

### El escáner QR no funciona

- Verifica que estés usando HTTPS (Render lo proporciona automáticamente)
- Algunos navegadores requieren HTTPS para acceder a la cámara

## 🗄️ Migrar a PostgreSQL (Opcional)

Si necesitas persistencia de datos, puedes:

1. Crear una base de datos PostgreSQL en Render
2. Instalar `pg` y `pg-hstore` en lugar de `sqlite3`
3. Actualizar el código para usar PostgreSQL

Render ofrece bases de datos PostgreSQL gratuitas con 90 días de prueba.

## 📞 Soporte

Si tienes problemas, revisa:
- [Documentación de Render](https://render.com/docs)
- Los logs del servicio en Render Dashboard
- La consola del navegador para errores del frontend

---

¡Listo! Tu aplicación debería estar funcionando en Render. ☕

