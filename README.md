# NOVA SHOES

Tienda online de zapatillas, ropa y accesorios para hombres, mujeres y niños, con entregas a todo el Perú.

## Arquitectura
- Frontend: React + TypeScript + Vite.
- Backend: Node.js + Express.
- Base de datos: PostgreSQL mediante `pg`.
- Validación: Zod.
- Pagos iniciales: Yape, Plin, QR y transferencia con verificación manual del comprobante.
- Moneda: soles peruanos (PEN).

## Estructura
- `src/`: interfaz web.
- `server/`: API privada; la conexión PostgreSQL vive únicamente en el servidor.
- `database/001_nova_shoes.sql`: esquema inicial PostgreSQL y categorías.
- `.env.example`: variables necesarias.

## Preparación local
1. Instala Node.js 20 o superior y PostgreSQL 15 o superior.
2. Crea una base de datos vacía para NOVA SHOES.
3. Ejecuta `database/001_nova_shoes.sql` dentro de esa base.
4. Copia `.env.example` a `.env` y completa `DATABASE_URL`.
5. Ejecuta `npm install`.
6. En una terminal ejecuta `npm run dev`; en otra `npm run dev:server`.
7. Comprueba `http://localhost:4000/api/health`.

## Módulos ampliados\nLa migración `database/migrations/002_commerce_modules.sql` agrega banners, cupones, zonas y tarifas de envío, transportistas/seguimiento, devoluciones, reseñas, listas de deseos, páginas de tienda y auditoría. La API incluye consulta de banners, cotización de envío, validación de cupones y seguimiento de pedidos. Ver `docs/MODULES.md`.\n\n## API inicial
- `GET /api/health`
- `GET /api/store`
- `GET /api/categories`
- `GET /api/products` (filtros: `q`, `category`, `audience`, `type`)
- `POST /api/orders` (crea el pedido y reserva stock dentro de una transacción)

## Seguridad y pagos
La URL de PostgreSQL debe permanecer exclusivamente en el backend. Nunca publiques contraseñas, claves privadas ni secretos en el frontend o Git. Los métodos Yape, Plin, QR y transferencia se registran como pagos pendientes; no se considera pagado un pedido hasta que un administrador verifique el comprobante. No se simula una pasarela bancaria.

## Estado
Esta rama inicia la migración de CONTANOVA a NOVA SHOES. La API y el esquema PostgreSQL son la primera base de trabajo; aún faltan interfaz de tienda conectada a la API, autenticación administrativa, carga segura de comprobantes, gestión de pedidos, despliegue y pruebas integrales. No usar con clientes reales hasta completar esas etapas.
