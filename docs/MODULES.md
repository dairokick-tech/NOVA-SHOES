# Módulos de NOVA SHOES

## Tienda y catálogo
- Portada, catálogo, búsqueda, categorías y filtros.
- Variantes por talla/color, precios, imágenes y disponibilidad.
- Favoritos y reseñas (tablas preparadas; interfaz pendiente).

## Operación comercial
- Carrito y creación transaccional de pedidos.
- Clientes y direcciones.
- Pagos Yape, Plin, QR y transferencia; verificación manual.
- Inventario, reservas de stock y movimientos.
- Cupones y promociones.
- Envíos por departamento/provincia/distrito, tarifas, transportistas y seguimiento.
- Solicitudes de devolución y cambios.
- Banners y páginas informativas.

## Administración
- Usuarios y roles iniciales en admin_users.
- Auditoría de acciones.
- Configuración de tienda, pagos y políticas de envío.
- Panel de indicadores, gestión de productos/pedidos/pagos y permisos: requiere interfaz y endpoints protegidos antes de operar.

## Migraciones Neon
1. Crear una base de datos Neon.
2. Aplicar una sola vez `database/001_nova_shoes.sql` a la base vacía.
3. Configurar `DIRECT_URL` (conexión Neon directa) y `DATABASE_URL` (conexión pooled) como variables privadas del servidor.
4. Ejecutar `npm install` y `npm run db:migrate` para aplicar migraciones versionadas de `database/migrations/`.
5. Iniciar el servidor con `npm start`.

No incluir contraseñas ni URLs con credenciales en GitHub. Las tablas de administración no equivalen a un panel seguro: falta completar autenticación, autorización por rol, endpoints administrativos y pruebas antes de habilitar operaciones reales.
