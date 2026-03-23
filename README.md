# App Web de Control Financiero Personal

Plataforma educativa de control financiero con aprobación de acceso, analítica mensual, metas y ruta de educación estructurada en 5 niveles.

## Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Estilos**: TailwindCSS
- **Gráficos**: Recharts
- **Base de datos**: SQLite (local) → PostgreSQL (producción con Vercel)
- **ORM**: Prisma
- **Autenticación**: JWT (tokens locales)
- **Hosting**: Vercel

## Características Principales

### 1. **Sistema de Acceso Privado**
- Solicitud de acceso con aprovación manual
- Tokens de invitación únicos
- ROL: admin y user

### 2. **Dashboard Financiero Personal**
- Registro de ingresos y gastos
- Gráficos de evolución mensual y anual
- Categorización automática de gastos
- Metas financieras con seguimiento

### 3. **Sistema de Educación Financiera**
5 pasos progresivos con contenido:
- **Paso 1**: Registra cada gasto (visibilidad)
- **Paso 2**: Presupuesto 50/30/20
- **Paso 3**: Fondo de emergencia
- **Paso 4**: Aumenta tus ingresos
- **Paso 5**: Fundamentos de inversión

Cada paso incluye:
- Teoría pedagógica (sin jerga técnica)
- Ejemplos prácticos reales
- Ejercicio aplicado

### 4. **Sistema de Motivación Diaria**
- 365 frases motivacionales únicas (una por día)
- Generación algorítmica de combinaciones
- Mostradas en la ruta de educación

### 5. **Admin Secret Portal**
- Ruta oculta para administración
- Gestión de usuarios
- Revisión de solicitudes de acceso

## Instalación Local

```bash
# Instalar dependencias
npm install

# Configurar base de datos
npx prisma generate
npx prisma db push

# Cargar datos iniciales
npm run db:seed

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="tu-clave-de-64-caracteres"
APP_URL="http://localhost:3000"
ADMIN_NOTIFICATION_EMAIL="tu@email.com"
```

## Despliegue en Vercel

**[Ver instrucciones completas en DEPLOYMENT.md](./DEPLOYMENT.md)**

Resumen rápido:
1. Push a GitHub
2. Importar proyecto en Vercel
3. Configurar variables de entorno
4. Deploy automático
5. Ejecutar migrations en producción

## Estructura de Carpetas

```
app/
  ├── dashboard/        # Panel principal del usuario
  ├── educacion/        # Ruta de educación financiera
  ├── admin-secret.../  # Panel de administración
  └── api/              # Endpoints REST
components/            # Componentes reutilizables
lib/                   # Utilidades, autenticación, API client
prisma/                # Schema y migraciones de BD
scripts/               # Seed y scripts de utilidad
```

## Credenciales de Desarrollo

**Admin:**
- Email: `abraham26mlg@gmail.com`
- Contraseña: `Admin12345!`

## Próximos Pasos (TODO)

- [ ] Conectar dominio personalizado en Vercel
- [ ] Configurar SMTP para notificaciones por email
- [ ] Analytics avanzadas (exportar reportes PDF)
- [ ] Mobile app con React Native
- [ ] Sistema de coaching personalizado

## Licencia

MIT

---

**Mantener actualizado**: Las dependencias principales se actualizan automáticamente. Revisa [package.json](./package.json) para versiones pinned.
- Metas de ahorro
- Niveles educativos con lecciones y ejercicios practicos
- Desbloqueo manual de niveles por admin

## Rutas API
- /api/auth/request-access
- /api/auth/register
- /api/auth/login
- /api/auth/me
- /api/transactions
- /api/analytics/monthly-comparison
- /api/goals
- /api/education/lessons
- /api/education/exercise
- /api/education/progress
- /api/admin/requests
- /api/admin/users
- /api/admin/unlock-level

## Configuracion local
1. Copia .env.example a .env
2. Si quieres recibir solicitudes en tu correo, configura SMTP y deja:
   - ADMIN_NOTIFICATION_EMAIL=abraham26mlg@gmail.com
3. Instala dependencias:
   - npm install
4. Inicializa base de datos y semilla:
   - npm run db:push
   - npm run db:seed
5. Ejecuta la app:
   - npm run dev
6. Abre en navegador:
   - http://localhost:3000

## Admin por defecto
- Email: admin@financecontrol.local
- Contrasena: Admin12345!

## Migracion a PostgreSQL
- En prisma/schema.prisma cambia datasource provider a postgresql
- Define DATABASE_URL con tu cadena de conexion PostgreSQL
- Ejecuta npm run db:push
