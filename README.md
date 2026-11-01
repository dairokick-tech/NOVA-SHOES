# CONTANOVA

Plataforma web de gestión contable y financiera orientada a Perú.

## Estado de desarrollo
Versión 0.2.1 — base inicial con validaciones reforzadas; todavía no es una versión productiva.

### Implementado en el repositorio
- Aplicación React + TypeScript + Vite, adaptable a móviles.
- Inicio de sesión, registro y cierre de sesión mediante Supabase Auth cuando se configuren las variables.
- Alta de empresas mediante función PostgreSQL segura y membresía del usuario creador.
- Semilla inicial reducida de cuentas contables por empresa.
- Registro inicial de asientos de dos líneas con validación de partida doble en el servidor.
- Lectura de los últimos asientos y consulta inicial del balance de comprobación.
- Auditoría inicial de cambios de asientos.
- Validación de rol y permisos de contabilización en el RPC de asientos (migración 0004).
- Manejo de errores de conexión y recuperación de sesión en el acceso.
- Accesos rápidos del panel vinculados a las secciones existentes.
- Flujo CI para instalar dependencias y compilar la aplicación.

### Pendiente para producción
Compras, ventas, comprobantes, cuentas por cobrar/pagar, caja, bancos, conciliación, PCGE completo, estados financieros, activos fijos, planillas, impuestos, SIRE, PLE, integración SUNAT, permisos detallados, pruebas de seguridad y despliegue productivo.

## Desarrollo local
Requiere Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Variables públicas del frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nunca pongas claves privadas o service_role en variables `VITE_*`.

## Base de datos
Ejecuta las migraciones en orden:
1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_auth_and_accounting_rpcs.sql`
3. `supabase/migrations/0003_audit_and_trial_balance.sql`
4. `supabase/migrations/0004_harden_journal_permissions.sql`

Consulta [docs/SETUP_SUPABASE.md](docs/SETUP_SUPABASE.md) para la configuración y las pruebas requeridas.

## Aislamiento multiempresa
La versión actual utiliza una base PostgreSQL compartida con separación lógica por organización, membresías y RLS. No crea una base de datos física independiente por empresa. El aprovisionamiento de bases separadas requiere una capa backend e infraestructura adicional.

## Aviso
No utilizar aún para contabilidad oficial, declaraciones tributarias, emisión electrónica ni almacenamiento de información real de clientes. Los módulos y reglas deben validarse con un profesional contable y tributario peruano y probarse antes de producción.
