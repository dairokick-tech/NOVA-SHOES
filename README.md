# NOVA SHOES

Tienda online de zapatillas, ropa y accesorios para hombres, mujeres y niños, con envíos a todo el Perú.

## Dos paneles
- **Tienda pública:** `https://dairokick-tech.github.io/NOVA-SHOES/`
- **Administración privada:** `https://dairokick-tech.github.io/NOVA-SHOES/admin`

El panel privado incluye configuración inicial de propietario de un solo uso, inicio de sesión, sesión firmada en cookie HttpOnly, limitación de intentos, resumen de ventas, consulta de pedidos, revisión de pagos y consulta de productos/stock. Las contraseñas se almacenan como hash scrypt con sal aleatoria; nunca se guardan en el frontend.

## Arquitectura
- Frontend: React + TypeScript + Vite.
- Backend: Node.js + Express.
- Base de datos: PostgreSQL (Neon compatible) mediante `pg`.
- Validación: Zod.
- Pagos iniciales: Yape, Plin, QR y transferencia con verificación manual.
- Moneda: soles peruanos (PEN).

## Despliegue del backend en Render\nEl archivo `render.yaml` define el servicio `nova-shoes-api`. Desde Render, crea un Blueprint nuevo conectado a este repositorio y selecciona la rama `nova-shoes`. En la configuración del servicio añade las URLs de Neon en `DATABASE_URL` (pooler) y `DIRECT_URL` (conexión directa). Render genera `SESSION_SECRET` y `ADMIN_BOOTSTRAP_KEY` automáticamente. El primer despliegue ejecuta las migraciones antes de iniciar la API.\n\nLa URL prevista del servicio es `https://nova-shoes-api.onrender.com`; si Render asigna otra, actualiza la variable de repositorio `VITE_API_URL` en GitHub y vuelve a ejecutar el workflow de Pages.\n\n## Configuración necesaria del servidor
Configura estas variables **en el proveedor del backend**, nunca en GitHub ni en el frontend:
- `DATABASE_URL`: cadena pooled de PostgreSQL.
- `DIRECT_URL`: conexión directa para migraciones.
- `SESSION_SECRET`: secreto aleatorio de al menos 32 caracteres.
- `ADMIN_BOOTSTRAP_KEY`: clave aleatoria larga para crear al primer propietario; solo se usa una vez.
- `CORS_ORIGIN=https://dairokick-tech.github.io`
- `NODE_ENV=production`
- `PORT`: lo proporciona el host.

En la configuración de GitHub Pages, agrega la variable de repositorio `VITE_API_URL` con la URL HTTPS pública del backend (sin barra final). El workflow la incorpora al compilar el frontend. Sin un backend desplegado y una base PostgreSQL conectada, el panel mostrará que el servidor no está disponible y no aceptará credenciales.

## Primer acceso del propietario
1. Crea el Blueprint de Render desde `render.yaml`, despliega el backend y conecta PostgreSQL.
2. Ejecuta `npm run db:migrate` en el entorno del backend para aplicar el esquema inicial y migraciones.
3. Configura `SESSION_SECRET` y `ADMIN_BOOTSTRAP_KEY` como secretos del host.
4. Abre la ruta `/admin`. Si no existe ningún administrador, aparecerá el formulario de configuración inicial.
5. Introduce la clave de bootstrap, nombre, correo y una contraseña de al menos 12 caracteres. La creación queda bloqueada después del primer propietario.

No compartas la clave de bootstrap ni contraseñas en el chat o en el repositorio.

## Desarrollo local
1. Instala Node.js 20 o superior.
2. Crea una base PostgreSQL vacía y configura `.env` a partir de `.env.example`.
3. Ejecuta `npm install` y `npm run db:migrate`.
4. Ejecuta `npm run dev:server` y `npm run dev` en terminales separadas.
5. Comprueba `http://localhost:4000/api/health`.

## API principal
- Pública: `GET /api/health`, `GET /api/store`, `GET /api/categories`, `GET /api/products`, `POST /api/orders`, `GET /api/orders/track`.
- Privada: `POST /api/admin/bootstrap`, `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`, `GET /api/admin/dashboard`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/payment`, `GET /api/admin/products`.

## Límites actuales
- El pago es verificado manualmente; no hay integración bancaria que confirme Yape/Plin automáticamente.
- La carga de comprobantes aún requiere implementar almacenamiento seguro.
- La administración de productos muestra catálogo y stock, pero todavía no incluye formularios completos para crear/editar productos, variantes o imágenes.
- El backend y Neon deben desplegarse/configurarse con credenciales propias del propietario. La página estática de GitHub Pages no aloja Node.js.
- No considerar el sistema listo para ventas reales hasta completar la configuración del backend, la base de datos y pruebas integrales.
