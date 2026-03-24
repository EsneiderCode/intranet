# Guía de Deployment — Umtelkomd

Deploy en VPS Hostinger con Ubuntu + Nginx + PM2 + PostgreSQL + SSL.

**Dominio:** `umtelkomd.net`
**Puerto de la app:** `3000` (Nginx hace proxy inverso)

---

## 1. Preparar el VPS

### 1.1 Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar Node.js 20 LTS via nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
node -v   # debe mostrar v20.x.x
```

### 1.3 Instalar PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Crear usuario y base de datos:

```bash
sudo -u postgres psql <<EOF
CREATE USER umtelkomd WITH PASSWORD 'CONTRASEÑA_SEGURA';
CREATE DATABASE umtelkomd OWNER umtelkomd;
GRANT ALL PRIVILEGES ON DATABASE umtelkomd TO umtelkomd;
\q
EOF
```

> Guarda la contraseña — la necesitarás en `DATABASE_URL`.

### 1.4 Instalar PM2

```bash
npm install -g pm2
```

### 1.5 Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.6 Instalar Certbot (SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 2. Clonar el repositorio y configurar el proyecto

### 2.1 Clonar

```bash
cd /var/www
sudo mkdir umtelkomd
sudo chown $USER:$USER umtelkomd
git clone https://github.com/TU_USUARIO/umtelkomd.git umtelkomd
cd umtelkomd
```

### 2.2 Instalar dependencias

```bash
npm ci --omit=dev
```

> `npm ci` usa exactamente las versiones de `package-lock.json`.

### 2.3 Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Rellena los valores de producción:

```env
DATABASE_URL="postgresql://umtelkomd:CONTRASEÑA_SEGURA@localhost:5432/umtelkomd"
NEXTAUTH_SECRET="GENERA_CON_openssl_rand_base64_32"
NEXTAUTH_URL="https://app.umtelkomd.net"
CLOUDINARY_CLOUD_NAME="tu-cloud-name"
CLOUDINARY_API_KEY="tu-api-key"
CLOUDINARY_API_SECRET="tu-api-secret"
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="noreply@umtelkomd.de"
NEXT_PUBLIC_APP_URL="https://umtelkomd.net"
NEXT_PUBLIC_APP_NAME="Umtelkomd"
```

Genera un NEXTAUTH_SECRET seguro:

```bash
openssl rand -base64 32
```

### 2.4 Ejecutar migraciones de la base de datos

```bash
npx prisma migrate deploy
```

> En producción siempre usa `migrate deploy` (no `db push`). Aplica migraciones existentes sin interacción.

### 2.5 Ejecutar seed (solo la primera vez)

```bash
npx prisma db seed
```

Esto crea el usuario admin inicial:
- **Email:** `admin@umtelkomd.de`
- **Contraseña:** `Admin1234!`

> **Cambia la contraseña inmediatamente** tras el primer login.

### 2.6 Generar el cliente Prisma y hacer el build

```bash
npx prisma generate
npm run build
```

---

## 3. Configurar PM2

### 3.1 Iniciar la aplicación

```bash
pm2 start npm --name "umtelkomd" -- start
```

### 3.2 Guardar la configuración y habilitar inicio automático

```bash
pm2 save
pm2 startup
```

PM2 mostrará un comando `sudo ...` — ejecútalo para que la app arranque automáticamente con el servidor.

### 3.3 Comandos útiles de PM2

```bash
pm2 status          # ver estado
pm2 logs umtelkomd  # ver logs en tiempo real
pm2 restart umtelkomd
pm2 stop umtelkomd
pm2 reload umtelkomd   # reinicio sin downtime (recomendado para actualizaciones)
```

---

## 4. Configurar Nginx como reverse proxy

### 4.1 Crear el archivo de configuración

```bash
sudo nano /etc/nginx/sites-available/umtelkomd
```

Contenido:

```nginx
server {
    listen 80;
    server_name umtelkomd.net www.umtelkomd.net;

    # Límite de tamaño de upload (para imágenes de inventario y avatares)
    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts extendidos para uploads a Cloudinary (pueden tardar > 60s)
        proxy_connect_timeout 60s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }
}
```

### 4.2 Activar el sitio

```bash
sudo ln -s /etc/nginx/sites-available/intranet /etc/nginx/sites-enabled/
sudo nginx -t          # verificar configuración
sudo systemctl reload nginx
```

---

## 5. Configurar SSL con Certbot

```bash
sudo certbot --nginx -d umtelkomd.net -d www.umtelkomd.net
```

Certbot modificará automáticamente el archivo de Nginx para redirigir HTTP → HTTPS.

Verificar renovación automática:

```bash
sudo certbot renew --dry-run
```

---

## 6. Verificar el dominio para emails (Resend)

Para que los emails lleguen a todos los destinatarios (no solo al dueño de la cuenta Resend):

1. Entra a [resend.com](https://resend.com) → **Domains** → **Add Domain**
2. Agrega `umtelkomd.de`
3. Resend te dará registros DNS (TXT, MX, DKIM) — agrégalos en tu proveedor de dominio
4. Una vez verificado, actualiza `EMAIL_FROM` en `.env`:
   ```
   EMAIL_FROM="noreply@umtelkomd.de"
   ```
5. Reinicia la app: `pm2 reload umtelkomd`

---

## 7. Script de actualización sin downtime

Para desplegar una nueva versión del código:

```bash
cd /var/www/umtelkomd

# 1. Bajar cambios
git pull origin main

# 2. Instalar nuevas dependencias (si las hay)
npm ci --omit=dev

# 3. Aplicar migraciones de BD (si las hay)
npx prisma migrate deploy

# 4. Regenerar cliente Prisma
npx prisma generate

# 5. Build
npm run build

# 6. Reiniciar sin downtime
pm2 reload umtelkomd
```

Puedes guardar esto como `/var/www/umtelkomd/scripts/deploy.sh`:

```bash
#!/bin/bash
set -e
cd /var/www/umtelkomd
git pull origin main
npm ci --omit=dev
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 reload umtelkomd
echo "✅ Deploy completado"
```

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## 8. Firewall (opcional pero recomendado)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

> Esto permite solo SSH (22), HTTP (80) y HTTPS (443). El puerto 3000 de la app no queda expuesto directamente.

---

## 9. Checklist de go-live

- [ ] `NEXTAUTH_SECRET` generado con `openssl rand -base64 32` (no el de desarrollo)
- [ ] `DATABASE_URL` apunta al PostgreSQL del VPS (puerto 5432)
- [ ] `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL` = `https://umtelkomd.net`
- [ ] SSL activo (Certbot configurado)
- [ ] Nginx redirige HTTP → HTTPS automáticamente
- [ ] PM2 configurado con `pm2 startup` y `pm2 save`
- [ ] Dominio `umtelkomd.de` verificado en Resend y `EMAIL_FROM` actualizado
- [ ] Contraseña del admin cambiada tras el primer login
- [ ] Cloudinary configurado (o `/public/uploads/` con permisos de escritura como fallback)
- [ ] `npm run build` completó sin errores
- [ ] La app responde en `https://umtelkomd.net`

---

## 10. Estructura de archivos en el VPS

```
/var/www/umtelkomd/
├── .env                  ← variables de producción (NO en git)
├── .next/                ← build de producción
├── node_modules/
├── prisma/
│   ├── schema.prisma
│   └── migrations/       ← historial de migraciones
├── public/
│   └── uploads/          ← fallback local de imágenes (si no hay Cloudinary)
└── scripts/
    └── deploy.sh         ← script de actualización
```
