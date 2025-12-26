# 🚀 Desplegar en Render - Guía Rápida

## Pasos Rápidos

### 1. Sube tu código a GitHub/GitLab/Bitbucket

```bash
git add .
git commit -m "Preparado para Render"
git push
```

### 2. En Render.com

1. Ve a https://dashboard.render.com
2. Click en **"New +"** → **"Web Service"**
3. Conecta tu repositorio
4. Configura:
   - **Name**: `cafe-rewards`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### 3. Variables de Entorno

En la sección **Environment**, agrega:

- **JWT_SECRET**: (genera uno con: `openssl rand -base64 32`)
- **NODE_ENV**: `production`

### 4. Deploy

Click en **"Create Web Service"** y espera a que termine.

## ⚠️ Importante

- La base de datos SQLite se reinicia en cada deploy (plan gratuito)
- Para producción, considera PostgreSQL
- Render proporciona HTTPS automáticamente

## 📱 URL

Tu app estará en: `https://cafe-rewards.onrender.com`

¡Listo! ☕

