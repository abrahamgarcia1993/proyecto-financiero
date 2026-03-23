# Guía de Despliegue en Vercel

## Datos de tu aplicación
- **GitHub User**: abrahamgarcia1993
- **Repositorio**: proyecto-financiero
- **JWT_SECRET**: `a7f3e2b9c1d4f6h8j0k2l4m6n8p0q2s4t6v8w0x2y4z6a8b0c2d4e6f8g0h2i`
- **Email Admin**: abraham26mlg@gmail.com
- **Base de datos**: PostgreSQL (será creada automáticamente por Vercel)

---

## Paso 1: Inicializar Git localmente

Abre la terminal en tu carpeta del proyecto y ejecuta:

```bash
git init
git add .
git commit -m "Initial commit: Proyecto financiero listo para desplegar"
git branch -M main
git remote add origin https://github.com/abrahamgarcia1993/proyecto-financiero.git
git push -u origin main
```

**Nota**: Si en el paso `git push` te pide credenciales, usa tu token de GitHub en lugar de contraseña (token con permisos `repo`).

---

## Paso 2: Conectar Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión/regístrate con GitHub
3. Haz clic en **"Add new..."** → **"Project"**
4. Selecciona el repositorio **`proyecto-financiero`**
5. En la pantalla de configuración:
   - **Framework Preset**: Next.js (debería detectarse automáticamente)
   - **Build Command**: `next build` (por defecto está bien)
   - **Start Command**: `next start` (por defecto está bien)

---

## Paso 3: Variables de entorno en Vercel

1. Antes de hacer deploy, haz clic en **"Environment Variables"** (antes de confirmar)
2. Añade estas variables:

| Variable | Valor |
|----------|-------|
| `JWT_SECRET` | `a7f3e2b9c1d4f6h8j0k2l4m6n8p0q2s4t6v8w0x2y4z6a8b0c2d4e6f8g0h2i` |
| `DATABASE_URL` | (Vercel Postgres la crea automáticamente) |
| `NODE_ENV` | `production` |

3. Haz clic en **"Deploy"**

---

## Paso 4: Crear Base de Datos PostgreSQL (Vercel Postgres)

Vercel crea automáticamente la BD, pero si necesitas hacerlo manualmente:

1. En tu dashboard de Vercel, ve a la pestaña **"Storage"**
2. Haz clic en **"Create New"** → **"Postgres"**
3. Conecta con tu proyecto
4. Vercel añadirá automáticamente `DATABASE_URL` a tu proyecto

---

## Paso 5: Ejecutar migrations y seed en producción

Una vez deployado, ve a tu proyecto en Vercel y abre la terminal:

1. Haz clic en **"Deployments"** → el último deploy
2. Abre la terminal (ícono de terminal)
3. Ejecuta:

```bash
npx prisma db push
npm run db:seed
```

Esto creará las tablas y datos iniciales (5 lecciones, 365 frases motivacionales, admin).

---

## Paso 6: Acceder a tu aplicación

- Tu aplicación estará en: `https://tu-proyecto-financiero.vercel.app`
- Para conectar tu dominio de Hostinger, sigue la documentación de Vercel (Settings → Domains)

---

## Credenciales de acceso

**Admin:**
- Email: `abraham26mlg@gmail.com`
- Contraseña: `Admin12345!` (CAMBIA ESTO después del primer login)

---

## Troubleshooting

### ¿El build falla?
- Verifica que todos los archivos estén committeados en GitHub
- Comprueba los logs en Vercel: **Deployments** → **Logs**

### ¿La base de datos no carga?
- Asegúrate de que `DATABASE_URL` está en variables de entorno
- Ejecuta `npx prisma db push` desde la terminal de Vercel

### ¿Necesito cambiar la contraseña admin?
- Accede a la app con las credenciales arriba
- Ve a Settings y actualiza tu contraseña

---

## Próximos pasos (opcionales)

- [ ] Conectar dominio de Hostinger
- [ ] Configurar SMTP si necesitas enviar emails
- [ ] Configurar backups automáticos de BD
- [ ] Monitorar analytics en Vercel

**¡Listo! Tu aplicación está en vivo.** 🚀
