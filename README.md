# CRM Hosting

Sistema de gestión de dominios, pagos y alertas integrado con SPanel.

## Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│                    Cloudflare Zero Trust                  │
│  https://sistema.startmotif.net.ar                        │
│         ↓ (autenticación: email/Google/GitHub)            │
│         ↓ (túnel crm-sistema)                             │
│  cloudflared → http://localhost:3001                      │
└─────────────────────────┬────────────────────────────────┘
                          │
┌─────────────────────────┴────────────────────────────────┐
│                   Node.js (Express)                       │
│  Puerto: 3001                                             │
│  Servidor único: frontend + API                           │
│  /api/* → rutas del backend                               │
│  /*     → frontend estático                               │
└─────────────────────────┬────────────────────────────────┘
                          │
┌─────────────────────────┴────────────────────────────────┐
│                   SQLite (better-sqlite3)                 │
│  Base de datos: backend/database/app.db                   │
└──────────────────────────────────────────────────────────┘
```

## Estructura del proyecto

```
hosting-crm/
├── README.md
├── backend/
│   ├── server.js              # Servidor Express principal
│   ├── package.json           # Dependencias Node.js
│   ├── .env                   # Variables de entorno (NO SUBIR A GIT)
│   ├── .gitignore
│   ├── database/
│   │   ├── db.js              # Conexión a SQLite
│   │   ├── schema.sql         # Esquema de la base de datos
│   │   └── app.db             # Archivo de la BD (generado)
│   ├── routes/
│   │   ├── domains.routes.js  # CRUD de dominios
│   │   ├── sync.routes.js     # Sincronización con SPanel
│   │   ├── payments.routes.js # Gestión de pagos
│   │   └── alerts.routes.js   # Alertas y notificaciones
│   ├── services/
│   │   ├── domains.service.js # Lógica de dominios
│   │   ├── payments.service.js# Lógica de pagos
│   │   ├── alerts.service.js  # Lógica de alertas
│   │   ├── notifications.service.js
│   │   ├── spanel.service.js  # Cliente API SPanel
│   │   ├── spanel.accounts.js # Cuentas de SPanel
│   │   └── spanel.domains.js  # Dominios de SPanel
│   ├── jobs/
│   │   └── daily-sync.job.js  # Cron: sincronización diaria
│   └── scripts/
│       ├── test-spanel-connection.js
│       └── test-spanel-diagnostic.js
└── frontend/
    ├── index.html             # Página principal
    ├── style.css              # Estilos
    └── app.js                 # Lógica del frontend
```

## Requisitos

- Node.js 20+
- npm
- SQLite (better-sqlite3)
- Cuenta Cloudflare (para túnel y Zero Trust)

## Instalación

### 1. Clonar repositorio

```bash
git clone https://github.com/Jos3l0/hosting-crm /home/www/html/hosting-crm
cd /home/www/html/hosting-crm/backend
```

### 2. Instalar dependencias

```bash
cd /home/www/html/hosting-crm/backend
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Contenido de `.env`:

```env
NODE_ENV=production
APP_PORT=3001

SPANEL_API_URL=https://www.startmotifmedia.com/spanel/api.php
SPANEL_API_TOKEN=tu_token_aqui
SPANEL_TOKEN_TYPE=admin

DATABASE_PATH=./database/app.db

CRM_SESSION_SECRET=generar_un_secreto_aleatorio
CRM_ADMIN_EMAIL=admin@ejemplo.com
```

## Auto-inicio con systemd (persiste al reiniciar)

El servidor y el túnel se inician automáticamente al encender el equipo gracias a servicios systemd.

### Servicio: CRM Hosting (Node.js)

Archivo: `/etc/systemd/system/crm-hosting.service`

```systemd
[Unit]
Description=CRM Hosting - Node.js Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/www/html/hosting-crm/backend
ExecStart=/usr/bin/node /home/www/html/hosting-crm/backend/server.js
Restart=always
RestartSec=5
StandardOutput=append:/tmp/crm-server.log
StandardError=append:/tmp/crm-server.log

[Install]
WantedBy=multi-user.target
```

### Servicio: Cloudflare Tunnel

Archivo: `/etc/systemd/system/cloudflared-tunnel.service`

```systemd
[Unit]
Description=Cloudflare Tunnel - CRM Hosting
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=jose
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/jose/.cloudflared/crm-sistema.yml run
Restart=always
RestartSec=5
StartLimitInterval=0

[Install]
WantedBy=multi-user.target
```

### Activar servicios

```bash
sudo systemctl daemon-reload
sudo systemctl enable crm-hosting.service
sudo systemctl enable cloudflared-tunnel.service
sudo systemctl start crm-hosting.service
sudo systemctl start cloudflared-tunnel.service
```

### Ver estado

```bash
sudo systemctl status crm-hosting.service
sudo systemctl status cloudflared-tunnel.service
```

### Ver logs

```bash
# Logs del servidor Node.js
tail -f /tmp/crm-server.log

# Logs del túnel
sudo journalctl -u cloudflared-tunnel.service -f
```

## Túnel Cloudflare

### Requisitos

- cloudflared instalado
- Dominio en Cloudflare (proxied)

### Creación del túnel

```bash
# Autenticar
cloudflared tunnel login

# Crear túnel
cloudflared tunnel create crm-sistema

# Ver ID del túnel
cloudflared tunnel list

# Crear configuración
cat > ~/.cloudflared/crm-sistema.yml << EOF
tunnel: <ID_DEL_TUNNEL>
credentials-file: /home/jose/.cloudflared/<ID_DEL_TUNNEL>.json

ingress:
  - hostname: sistema.startmotif.net.ar
    service: http://localhost:3001
  - service: http_status:404
EOF
```

### DNS en Cloudflare

Agregar manualmente en el panel de Cloudflare:

| Tipo  | Nombre     | Valor                                        | Proxy |
|-------|------------|----------------------------------------------|-------|
| CNAME | sistema    | `<ID-del-túnel>.cfargotunnel.com`            | ☑️    |

### Iniciar manualmente (sin systemd)

```bash
cloudflared tunnel --config /home/jose/.cloudflared/crm-sistema.yml run
```

## Seguridad: Cloudflare Zero Trust (Access)

Cloudflare Access protege el sitio con autenticación antes de llegar al servidor.

### Cómo funciona

```
Usuario → https://sistema.startmotif.net.ar
                    ↓
          Cloudflare intercepta
                    ↓
        🔐 PANTALLA DE LOGIN (código por email)
                    ↓
          Autenticación exitosa
                    ↓
          Cookie JWT válida por 24h
                    ↓
          → Túnel → http://localhost:3001
```

### Configuración (desde dashboard de Cloudflare)

1. Ir a [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Zero Trust** (escudo)
2. **Access** → **Applications** → **Add an application**
3. Tipo: **Self-hosted**
4. Configurar:

   | Campo | Valor |
   |-------|-------|
   | Application name | `CRM Hosting` |
   | Domain | `sistema.startmotif.net.ar` |
   | Session Duration | `24h` |

5. En **Policies**, agregar regla de acceso:

   | Selector | Value |
   |----------|-------|
   | `Emails` | `olivajose@gmail.com` |

6. **Identity Provider**: Cloudflare (código por email) o Google/GitHub
7. Guardar

### Agregar más usuarios

En la policy existente, agregar más emails o usar dominios completos:

| Selector | Value |
|----------|-------|
| `Emails` | `persona@ejemplo.com` |
| `Emails` | `*@midominio.com` (todo el dominio) |

### Límite gratuito

Cloudflare Zero Trust free permite hasta **50 usuarios**.

## API Endpoints

### Dominios

| Método | Ruta                              | Descripción                        |
|--------|-----------------------------------|------------------------------------|
| GET    | `/api/domains/dashboard`          | Estadísticas del dashboard         |
| GET    | `/api/domains`                    | Listar todos los dominios          |
| GET    | `/api/domains/:id`                | Obtener dominio por ID             |
| POST   | `/api/domains`                    | Crear dominio manual               |
| PUT    | `/api/domains/:id/profile`        | Actualizar perfil del cliente      |
| PUT    | `/api/domains/:id/expiration`     | Actualizar fecha de vencimiento    |
| PUT    | `/api/domains/:id/payment`        | Actualizar estado de pago          |
| PUT    | `/api/domains/:id/alerts`         | Configurar alertas                 |

### Sincronización SPanel

| Método | Ruta                 | Descripción                          |
|--------|----------------------|--------------------------------------|
| POST   | `/api/sync/spanel`   | Sincronizar dominios desde SPanel    |
| GET    | `/api/sync/logs`     | Ver historial de sincronización      |

### Pagos

| Método | Ruta             | Descripción               |
|--------|------------------|---------------------------|
| GET    | `/api/payments`  | Listar pagos registrados  |
| POST   | `/api/payments`  | Registrar nuevo pago      |

### Alertas

| Método | Ruta                                    | Descripción                       |
|--------|-----------------------------------------|-----------------------------------|
| GET    | `/api/alerts`                           | Listar alertas                    |
| POST   | `/api/alerts/generate`                  | Generar alertas automáticas       |
| POST   | `/api/alerts/:id/send-email`            | Marcar alerta como enviada        |
| POST   | `/api/alerts/:id/send-whatsapp-link`    | Generar enlace de WhatsApp        |

## Base de datos

Tablas principales:

| Tabla         | Descripción                              |
|---------------|------------------------------------------|
| `domains`     | Dominios con datos del cliente y pago    |
| `clients`     | Información adicional de clientes        |
| `payments`    | Registro de pagos realizados             |
| `alerts`      | Alertas generadas automáticamente        |
| `sync_logs`   | Historial de sincronización con SPanel   |

## Sincronización con SPanel

La API de SPanel (`accounts/listaccounts`) devuelve cuentas de hosting con su dominio principal.
La sincronización:

1. Obtiene todas las cuentas de SPanel
2. Extrae el dominio principal de cada cuenta
3. Inserta o actualiza en la base de datos local
4. **No sobrescribe** datos manuales del CRM (cliente, email, teléfono, etc.)

La sincronización automática se ejecuta diariamente a las 3:00 AM.

## URLs

| Servicio   | URL                                      |
|------------|------------------------------------------|
| Frontend   | https://sistema.startmotif.net.ar        |
| API        | https://sistema.startmotif.net.ar/api    |
| Local      | http://192.168.100.150:3001              |

## Mantenimiento

### Ver logs del servidor

```bash
tail -f /tmp/crm-server.log
```

### Ver logs del túnel

```bash
sudo journalctl -u cloudflared-tunnel.service -f
```

### Reiniciar servidor

```bash
sudo systemctl restart crm-hosting.service
```

### Reiniciar túnel

```bash
sudo systemctl restart cloudflared-tunnel.service
```

### Detener todo

```bash
sudo systemctl stop crm-hosting.service cloudflared-tunnel.service
```

## Notas

- El frontend y backend corren en el **mismo servidor Node.js** (puerto 3001)
- El túnel Cloudflare expone solo `sistema.startmotif.net.ar`
- Cloudflare Zero Trust protege el acceso con autenticación por email
- Los servicios se inician automáticamente al encender el equipo (systemd)
- Los datos del cliente (nombre, email, teléfono, WhatsApp) son **manuales** y no se sobrescriben al sincronizar
- SPanel API solo soporta `accounts/listaccounts` en este servidor
