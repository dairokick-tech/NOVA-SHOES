# CONTANOVA

Sistema de gestión comercial para **una sola empresa**.

## Alcance
- Punto de venta y tienda online conectados.
- Productos, inventario, lotes, compras y proveedores.
- Clientes, pedidos, caja, pagos y reportes.
- Usuarios, roles, auditoría y configuración.
- Sucursales y almacenes opcionales dentro de la misma empresa.

No incluye alta ni cambio entre múltiples empresas. La base conserva una entidad de empresa única como configuración raíz; las tablas relacionadas usan su identificador para mantener integridad y permisos.

## Desarrollo
- React + TypeScript + Vite.
- Supabase/PostgreSQL previsto para persistencia y autenticación.
- Variables públicas de conexión: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Nunca colocar claves service-role en el navegador.

## Estado
La interfaz inicial contiene navegación, panel de resumen, catálogo y flujo POS de demostración con almacenamiento local. Los demás módulos y la integración real con Supabase aún requieren implementación y pruebas. La migración SQL está en `supabase/migrations` y debe revisarse/aplicarse en el proyecto antes de usar datos reales.
