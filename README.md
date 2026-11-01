# CONTANOVA

Plataforma web de gestión contable y financiera orientada a Perú.

## Estado actual
Versión inicial 0.1.0: interfaz responsive, panel de control y navegación por módulos con datos demostrativos. Los importes del dashboard son ficticios. No procesa declaraciones ni emite comprobantes SUNAT.

## Requisitos
- Node.js 20 o superior
- npm

## Desarrollo
1. npm install
2. Copia .env.example a .env.local y configura las variables públicas cuando conectes Supabase.
3. npm run dev

## Construcción
npm run build

## Módulos previstos
- Contabilidad general: PCGE, asientos, diario, mayor y cierres.
- Compras, ventas, clientes, proveedores y documentos.
- Caja, bancos y conciliación.
- Tributación Perú: IGV, regímenes, SIRE/PLE y obligaciones.
- Estados financieros, activos fijos, costos y planillas.
- Multiempresa, usuarios, roles, auditoría y portal de clientes.

## Seguridad y arquitectura
No colocar secretos en variables VITE_. La clave service_role debe permanecer exclusivamente en un backend seguro. La separación de datos por empresa debe aplicarse en servidor y base de datos con controles de acceso verificables. Esta versión es una base de interfaz; aún no incluye autenticación productiva, persistencia ni conexión SUNAT.

## Licencia
Uso privado del proyecto CONTANOVA.