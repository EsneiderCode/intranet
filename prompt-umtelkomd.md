# 🚀 PROMPT PARA CLAUDE CODE — APLICACIÓN WEB UMTELKOMD

---

## 🎯 CONTEXTO Y OBJETIVO

Quiero que me ayudes a construir una **aplicación web de gestión interna** para una empresa de instalación de Fibra Óptica llamada **Umtelkomd**, con sede en **Alemania**. La app será usada por técnicos en campo (desde móvil) y por administradores (desde escritorio y móvil).

La aplicación debe estar **lista para producción**, desplegada en un **VPS de Hostinger**, y debe ser robusta, segura, escalable y con excelente UX tanto en escritorio como en móviles.

---

## 🛠️ STACK TECNOLÓGICO REQUERIDO

### Frontend
- **Next.js 14+** con App Router
- **TypeScript** obligatorio en todo el proyecto
- **Tailwind CSS** para estilos
- **shadcn/ui** como librería de componentes base
- **React Hook Form + Zod** para formularios y validación
- **TanStack Query (React Query)** para fetching y caché de datos
- **next-intl** para internacionalización (alemán 🇩🇪 e inglés 🇬🇧, con alemán como idioma por defecto)

### Backend
- **Next.js API Routes** (dentro del mismo proyecto)
- **Prisma ORM** con **PostgreSQL**
- **NextAuth.js v5** para autenticación con sesiones seguras
- **bcrypt** para hashing de contraseñas
- **Cloudinary** para almacenamiento de imágenes de perfil e inventario
- **QRCode.js** para generación de códigos QR por ítem
- **Resend** (o Nodemailer) para envío de correos de notificación

### Infraestructura / Deploy
- **VPS Hostinger** con Ubuntu
- **PM2** para gestión del proceso Node
- **Nginx** como reverse proxy
- **PostgreSQL** instalado en el VPS
- **SSL con Let's Encrypt (Certbot)**
- Variables de entorno con `.env.local` y `.env.production`

---

## 📐 ARQUITECTURA DEL PROYECTO

```
umtelkomd/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← Layout con sidebar + navbar
│   │   ├── page.tsx            ← Dashboard principal
│   │   ├── inventory/
│   │   ├── vacations/
│   │   ├── users/              ← Solo admin
│   │   ├── reports/            ← Solo admin
│   │   └── settings/           ← Solo admin
│   └── api/
│       ├── auth/
│       ├── users/
│       ├── inventory/
│       ├── vacations/
│       ├── holidays/
│       └── notifications/
├── components/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   └── validations/
├── prisma/
│   └── schema.prisma
└── middleware.ts               ← Protección de rutas por rol
```

---

## 🗄️ MODELO DE BASE DE DATOS (Prisma Schema)

Define el esquema Prisma con exactamente estas entidades y relaciones:

### User
```
- id: String (cuid)
- firstName: String
- lastName: String
- birthDate: DateTime
- email: String (unique)
- password: String (hasheado)
- phone: String
- shirtSize: Enum (XS, S, M, L, XL, XXL, XXXL)
- pantsSize: String (ej: "32x32")
- role: Enum (TECHNICIAN, ADMIN)
- avatarUrl: String?
- vacationDaysTotal: Int (default: 24)
- state: String (estado federal alemán donde trabaja)
- isActive: Boolean (default: true)
- createdAt: DateTime
- updatedAt: DateTime
```

### InventoryItem
```
- id: String (cuid)
- name: String
- description: String
- imageUrl: String
- qrCode: String (URL al QR generado)
- status: Enum (AVAILABLE, IN_USE, IN_REPAIR, DECOMMISSIONED)
- assignedToId: String? → FK a User
- addedById: String → FK a User (quién lo agregó)
- createdAt: DateTime
- updatedAt: DateTime
```

### InventoryHistory (audit log de inventario)
```
- id: String (cuid)
- itemId: String → FK a InventoryItem
- action: Enum (CREATED, UPDATED, ASSIGNED, TRANSFERRED, STATUS_CHANGED, DELETED)
- fromUserId: String? → FK a User
- toUserId: String? → FK a User
- performedById: String → FK a User (quién realizó la acción)
- notes: String?
- metadata: Json? (campos modificados, valores anteriores/nuevos)
- createdAt: DateTime
```

### TransferRequest (solicitudes de transferencia de ítems)
```
- id: String (cuid)
- itemId: String → FK a InventoryItem
- requestedById: String → FK a User
- toUserId: String → FK a User
- status: Enum (PENDING, APPROVED, REJECTED)
- adminNote: String?
- createdAt: DateTime
- resolvedAt: DateTime?
```

### VacationRequest
```
- id: String (cuid)
- userId: String → FK a User
- startDate: DateTime
- endDate: DateTime
- status: Enum (PENDING, APPROVED, REJECTED)
- adminNote: String?
- workingDaysRequested: Int (calculado excluyendo festivos del técnico)
- requestedAt: DateTime
- resolvedAt: DateTime?
- resolvedById: String? → FK a User (admin que resolvió)
```

### Holiday (días festivos)
```
- id: String (cuid)
- name: String
- date: DateTime
- state: String? (si aplica solo a un estado alemán específico)
- createdById: String → FK a User (admin)
- createdAt: DateTime
```

### UserHoliday (relación muchos a muchos entre técnico y festivos)
```
- userId: String → FK a User
- holidayId: String → FK a Holiday
- assignedById: String → FK a User (admin que lo asignó)
- assignedAt: DateTime
```

### Notification
```
- id: String (cuid)
- userId: String → FK a User (receptor)
- type: Enum (VACATION_APPROVED, VACATION_REJECTED, ITEM_ASSIGNED, TRANSFER_APPROVED, TRANSFER_REJECTED, ITEM_UPDATED)
- title: String
- message: String
- isRead: Boolean (default: false)
- relatedId: String? (ID del ítem/solicitud relacionado)
- createdAt: DateTime
```

---

## 👥 MÓDULO DE USUARIOS

### Roles y permisos

**TECHNICIAN:**
- Ver su propio perfil y editarlo
- Ver el inventario completo
- Agregar nuevos ítems (se auto-asignan a él)
- Editar ítems que están bajo su responsabilidad
- Solicitar transferencia de un ítem a otro técnico
- Ver y solicitar vacaciones propias
- Ver sus notificaciones

**ADMIN:**
- Todo lo anterior, más:
- Ver, crear, editar y desactivar usuarios
- Cambiar rol de usuarios
- Asignar ítems a técnicos
- Aprobar/rechazar transferencias entre técnicos
- Eliminar ítems del inventario
- Gestionar todos los calendarios de vacaciones
- Aprobar/rechazar solicitudes de vacaciones (con motivo obligatorio en rechazo)
- Modificar la cantidad de días de vacaciones de cualquier técnico
- Agregar días festivos por estado alemán
- Asignar festivos individualmente a técnicos
- Exportar reportes en PDF y Excel
- Ver dashboard con métricas globales

### Registro e invitación
- Los nuevos usuarios son creados por el admin (no hay registro público)
- El admin crea la cuenta con datos básicos y se envía un correo al técnico con un link para establecer su contraseña
- El link expira en 48 horas

### Campos del perfil de usuario
- Nombre, Apellido
- Fecha de nacimiento
- Email (no editable una vez creado)
- Teléfono
- Talla de torso: selector con opciones XS, S, M, L, XL, XXL, XXXL
- Talla de pantalón: input libre (ej: "32x32", "44", etc.)
- Foto de perfil (upload a Cloudinary)
- Estado federal alemán donde trabaja (select con los 16 estados de Alemania)
- Días de vacaciones totales asignados (solo editable por admin)

---

## 📦 MÓDULO DE INVENTARIO

### Listado de ítems
- Vista de tabla en escritorio y tarjetas en móvil
- Filtros por: estado, técnico asignado, fecha de creación
- Búsqueda por nombre o descripción
- Cada ítem muestra: imagen, nombre, estado (badge de color), técnico asignado, botón de ver QR

### Estado de los ítems (con colores diferenciados)
- 🟢 **AVAILABLE** — Disponible
- 🔵 **IN_USE** — En uso
- 🟡 **IN_REPAIR** — En reparación
- 🔴 **DECOMMISSIONED** — Dado de baja

### Creación de ítem
- Formulario con: imagen (upload), nombre, descripción, estado inicial
- Si lo crea un **técnico**: el ítem queda asignado a él automáticamente
- Si lo crea un **admin**: aparece un selector para elegir a qué técnico asignarlo (o dejarlo sin asignar como AVAILABLE)
- Al crear el ítem, se **genera automáticamente un código QR** con la URL del detalle del ítem
- El QR puede descargarse en PNG o imprimirse directamente

### Edición de ítem
- Técnico puede editar: nombre, descripción, imagen, estado de los ítems que tiene asignados
- Admin puede editar cualquier ítem y también reasignarlo a otro técnico

### Eliminación de ítem
- Solo el admin puede eliminar un ítem
- Al eliminar, se solicita confirmación con modal y se registra en el historial

### Transferencia de ítems
- Un técnico puede solicitar transferir un ítem que tiene asignado a otro técnico
- La solicitud queda PENDING hasta que el admin la apruebe o rechace
- Ambos técnicos y el admin reciben notificación del resultado

### Historial de ítem
- Dentro del detalle de cada ítem hay una pestaña "Historial" que muestra:
  - Quién lo creó y cuándo
  - Todos los cambios de estado
  - Todas las asignaciones anteriores
  - Transferencias realizadas

---

## 🏖️ MÓDULO DE VACACIONES

### Reglas de negocio CRÍTICAS

1. Cada técnico tiene **24 días de vacaciones por año** por defecto
2. El admin puede modificar este número por técnico individualmente
3. Los días se cuentan como **días laborables** (lunes a viernes)
4. Los días festivos asignados al técnico **NO se descuentan** del cupo de vacaciones
5. Dos técnicos en diferentes estados pueden tener diferentes festivos, por lo que el mismo período puede costar diferente cantidad de días a cada uno
6. Los días festivos nacionales (Feiertage) varían por estado federal en Alemania — el admin debe poder gestionar esto

### Cálculo de días consumidos
Al crear una solicitud de vacaciones, el sistema debe calcular automáticamente:
```
días_solicitados = días laborables entre startDate y endDate
                   - festivos asignados a ESE técnico que caigan en ese rango
```
Mostrar este cálculo al técnico ANTES de confirmar la solicitud, con desglose de qué días son festivos.

### Flujo de solicitud
1. Técnico elige rango de fechas en un calendario visual
2. El sistema muestra:
   - Días laborables en el rango
   - Festivos que tiene asignados en ese rango (no se cobran)
   - Días efectivos que se descontarán
   - Días disponibles restantes si se aprueba
3. Técnico confirma y envía solicitud
4. Admin recibe notificación en la app y por email
5. Admin aprueba o rechaza (con motivo escrito obligatorio si rechaza)
6. Técnico recibe notificación del resultado

### Vista de calendario
- Mostrar un calendario mensual con:
  - Días de vacaciones aprobadas (verde)
  - Solicitudes pendientes (amarillo)
  - Días festivos asignados (azul)
  - Días no laborables: fines de semana (gris)
- El admin puede ver el calendario de TODOS los técnicos, con selector de técnico

### Gestión de festivos por el admin
- El admin puede crear un día festivo con: nombre, fecha, estado alemán (opcional — si no se especifica estado, es nacional)
- Los 16 estados alemanes disponibles:
  Baden-Württemberg, Bayern, Berlin, Brandenburg, Bremen, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland, Sachsen, Sachsen-Anhalt, Schleswig-Holstein, Thüringen
- El admin puede asignar un festivo específico a uno o varios técnicos
- También puede asignar múltiples festivos a un técnico a la vez (útil para cargar todos los festivos del año de una región de una vez)
- Los festivos asignados son visibles en el calendario del técnico

---

## 📊 DASHBOARD

### Vista Administrador
- Total de técnicos activos
- Ítems en inventario por estado (gráfico de donut)
- Solicitudes de vacaciones pendientes de aprobación
- Solicitudes de transferencia pendientes
- Técnicos con más días de vacaciones restantes
- Últimas actividades del inventario (feed de auditoría)
- Notificaciones sin leer

### Vista Técnico
- Mis ítems asignados (con estado)
- Mis días de vacaciones: usados / restantes / total
- Próximas vacaciones aprobadas
- Mis solicitudes pendientes (vacaciones + transferencias)
- Mis notificaciones recientes

---

## 🔔 SISTEMA DE NOTIFICACIONES

- Notificaciones en tiempo real dentro de la app (badge en navbar con contador)
- Las notificaciones se marcan como leídas al hacer click
- También se envía email automático en los siguientes eventos:
  - Vacaciones aprobadas
  - Vacaciones rechazadas (con motivo)
  - Ítem asignado al técnico
  - Transferencia aprobada
  - Transferencia rechazada
  - Invitación de cuenta nueva (con link para establecer contraseña)

---

## 📤 EXPORTACIÓN DE REPORTES (Solo Admin)

### Reporte de Inventario
- Exportar lista completa de ítems con filtros aplicados
- Formato: Excel (.xlsx) y PDF
- Incluye: nombre, descripción, estado, técnico asignado, fecha de creación

### Reporte de Vacaciones
- Por técnico: días totales, usados, restantes, historial de solicitudes
- Por período: qué técnicos estuvieron de vacaciones en un rango de fechas
- Formato: Excel (.xlsx) y PDF

### Reporte de Actividad de Inventario
- Historial de cambios con filtros por fecha, técnico, tipo de acción
- Formato: Excel (.xlsx) y PDF

---

## 📱 DISEÑO Y UX

### Principios de diseño
- **Mobile-first**: los técnicos usan la app en campo desde el teléfono
- Sidebar colapsable en escritorio, bottom navigation en móvil
- Modo oscuro y claro (toggle en navbar)
- Colores corporativos sugeridos: Azul oscuro `#1E3A5F` + Naranja `#F97316` como accent

### Componentes clave a implementar con shadcn/ui
- DataTable con paginación, filtros y búsqueda (para inventario y usuarios)
- CalendarPicker para selección de fechas de vacaciones
- Modal/Dialog para confirmaciones destructivas
- Toast para feedback de acciones
- Badge para estados de ítems y solicitudes
- Avatar con iniciales fallback para fotos de perfil
- Skeleton loaders durante fetching de datos

### Responsive breakpoints
- Móvil: < 768px → tarjetas, navegación inferior
- Tablet: 768px–1024px → layout mixto
- Desktop: > 1024px → sidebar fijo, tablas completas

---

## 🔐 SEGURIDAD

- Autenticación con NextAuth.js v5 (JWT + sesiones)
- Middleware de Next.js que protege rutas según rol
- Todos los endpoints de API validan la sesión y el rol antes de ejecutar
- Rate limiting en endpoints de autenticación
- Validación de datos en servidor con Zod (nunca confiar solo en el frontend)
- Sanitización de inputs para prevenir XSS e inyección SQL (via Prisma)
- HTTPS obligatorio en producción (Nginx + Certbot)

---

## 🚢 GUÍA DE DESPLIEGUE EN VPS HOSTINGER

Incluye al final del proyecto un archivo `DEPLOYMENT.md` con instrucciones paso a paso para:

1. **Preparar el VPS**
   - Actualizar Ubuntu
   - Instalar Node.js 20 LTS via nvm
   - Instalar PostgreSQL y configurar usuario + base de datos
   - Instalar PM2 globalmente
   - Instalar Nginx
   - Instalar Certbot para SSL

2. **Configurar el proyecto**
   - Clonar repo desde GitHub
   - Configurar variables de entorno de producción
   - Ejecutar `npx prisma migrate deploy`
   - Ejecutar `npx prisma db seed` (para crear el primer admin)
   - Build: `npm run build`

3. **Configurar PM2**
   ```bash
   pm2 start npm --name "umtelkomd" -- start
   pm2 save
   pm2 startup
   ```

4. **Configurar Nginx** como reverse proxy al puerto 3000

5. **Configurar SSL** con Certbot para el dominio

6. **Script de actualización** para hacer deploy de nuevas versiones sin downtime

---

## 🌱 DATOS SEMILLA (Seed)

Crear un script `prisma/seed.ts` que genere:
- 1 usuario Administrador por defecto:
  - Email: `admin@umtelkomd.de`
  - Password: `Admin1234!` (debe cambiarse en primer login)
- Los 16 estados federales alemanes como opciones precargadas
- Los festivos nacionales de Alemania del año actual (Neujahr, Karfreitag, Ostern, Tag der Arbeit, etc.)

---

## 📋 PLAN DE IMPLEMENTACIÓN POR FASES

Desarrolla el proyecto en este orden para que sea funcional en cada fase:

### Fase 1 — Base del proyecto
- Setup Next.js + TypeScript + Tailwind + shadcn/ui
- Configurar Prisma + PostgreSQL con el schema completo
- Implementar NextAuth.js con login/logout
- Middleware de protección de rutas por rol
- Layout base: sidebar en desktop, bottom nav en móvil

### Fase 2 — Módulo de Usuarios
- CRUD de usuarios (solo admin)
- Sistema de invitación por email con link de activación
- Edición de perfil propio
- Upload de foto de perfil a Cloudinary

### Fase 3 — Módulo de Inventario
- CRUD completo con reglas de negocio por rol
- Generación de QR por ítem
- Upload de imagen a Cloudinary
- Historial de cambios (audit log)
- Sistema de transferencias con flujo de aprobación

### Fase 4 — Módulo de Vacaciones
- Gestión de festivos por el admin
- Asignación de festivos a técnicos
- Calendario visual
- Flujo de solicitud con cálculo automático de días
- Flujo de aprobación/rechazo por admin

### Fase 5 — Dashboard y Notificaciones
- Dashboard con métricas por rol
- Sistema de notificaciones in-app
- Notificaciones por email

### Fase 6 — Reportes y Exportación
- Exportación PDF con librería `@react-pdf/renderer` o `jsPDF`
- Exportación Excel con `xlsx` (SheetJS)

### Fase 7 — Producción
- Revisión de seguridad completa
- Optimización de performance (image optimization, query optimization)
- Archivo `DEPLOYMENT.md` con guía completa
- Variables de entorno documentadas en `.env.example`

---

## ⚙️ VARIABLES DE ENTORNO REQUERIDAS

Crea un `.env.example` con estas variables documentadas:

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/umtelkomd"

# NextAuth
NEXTAUTH_SECRET="genera-con-openssl-rand-base64-32"
NEXTAUTH_URL="https://tudominio.com"

# Cloudinary
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Email (Resend)
RESEND_API_KEY=""
EMAIL_FROM="noreply@umtelkomd.de"

# App
NEXT_PUBLIC_APP_URL="https://tudominio.com"
NEXT_PUBLIC_APP_NAME="Umtelkomd"
```

---

## 🧪 CALIDAD DE CÓDIGO

- ESLint + Prettier configurados
- Tipos TypeScript estrictos (`strict: true` en tsconfig)
- Separación clara entre Server Components y Client Components en Next.js
- Custom hooks para lógica reutilizable
- Constantes centralizadas (roles, estados, enums)
- Error boundaries para manejo de errores en UI
- Loading states y skeleton en todas las vistas con fetch de datos

---

## INSTRUCCIÓN FINAL PARA CLAUDE CODE

Comienza siempre con la **Fase 1**. No saltes fases. Antes de escribir código, muéstrame la estructura de archivos que vas a crear para que yo la apruebe. Pregúntame si tienes dudas sobre reglas de negocio antes de implementarlas. Cuando termines una fase, dime qué puedo probar y cómo, antes de continuar con la siguiente.
