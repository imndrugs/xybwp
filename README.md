# CKV Bot - WhatsApp Bot

Bot para WhatsApp con comandos de descargas, administración, diversión y más.

## Requisitos

- **Node.js 20+**
- **Git**
- **ffmpeg** (para stickers)
- **yt-dlp** (para descargas YouTube/Spotify)

## Instalación Local

```bash
# 1. Clonar repositorio
git clone https://github.com/imndrugs/xybwp.git
cd xybwp

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env (copiar el existente o crear nuevo)
```

**.env:**
```
RAPIDAPI_KEY=tu_key_aqui
SOCIALKIT_KEY=tu_key_aqui
```

## Ejecutar Local

```bash
# Iniciar bot (genera QR en consola)
npm start

# Login alternativo con código (si tienes FORCE_LOGIN)
# node login.js
```

## Subir cambios a Railway

```bash
git add -A
git commit -m "mensaje"
git push origin main
# Railway detecta el push y hace auto-build + deploy
```

## Despliegue en Railway

1. Ir a [Railway](https://railway.app)
2. Nuevo proyecto → Deploy desde GitHub → seleccionar `imndrugs/xybwp`
3. Variables de entorno requeridas:
   - `RAPIDAPI_KEY`
   - `SOCIALKIT_KEY`
   - `OWNER_ID` (opcional, números separados por coma)
   - `FORCE_LOGIN` (opcional, activa login por código)
4. Railway usa el `Dockerfile` incluido que ya tiene ffmpeg y yt-dlp

## Comandos principales

| Categoría | Comandos |
|-----------|----------|
| 🎮 Interactivos | `.hi`, `.love`, `.dado`, `.ppt`, `.encuesta` |
| 🔐 Staff | `.makeowner`, `.delowner`, `.setadmin`, `.bc`, `.restart`, `.savedata` |
| ⚙️ Admin | `.promote`, `.demote`, `.kick`, `.mute`, `.antilink`, `.group` |
| 📱 Descargas | `.tt`, `.ig`, `.play`, `.ytmp3`, `.spotify`, `.facebook`, `.mediafire` |
| 💬 Utilidades | `.ping`, `.translate`, `.wiki`, `.anime`, `.sticker`, `.globo` |

Prefijos: `.` `!` `xyb`

## Estructura

```
src/
  index.js          # Entry point
  commands/         # Comandos (un archivo por comando)
  lib/
    perms.js        # Permisos y owners
    roles.js        # Sistema de roles
database.json       # Datos persistentes
```

## Owners hardcodeados

Editables en `src/lib/perms.js`:
```
116715954372809, 93398895706153, 81544987328651, 256358830108686, 67749535600891
```
