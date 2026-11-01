# Configuración inicial de Supabase para CONTANOVA

## 1. Crear un proyecto independiente
Crea un proyecto nuevo de Supabase para CONTANOVA. No reutilices bases de datos de otros sistemas. Guarda la URL del proyecto y la clave pública anon/publishable en los secretos del servicio web.

## 2. Aplicar migraciones en orden
En Supabase abre SQL Editor y ejecuta, en este orden, el contenido de:
1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_auth_and_accounting_rpcs.sql`
3. `supabase/migrations/0003_audit_and_trial_balance.sql`
4. `supabase/migrations/0004_harden_journal_permissions.sql`

Revisa el resultado de cada script antes de continuar. Hazlo primero en un proyecto de pruebas.

## 3. Configurar autenticación
En Authentication > Providers habilita Email. Configura la confirmación de correo y las URLs permitidas del sitio desplegado. La pantalla de CONTANOVA incluye inicio de sesión, registro y cierre de sesión con Supabase Auth.

## 4. Variables de entorno del frontend
Configura en el proveedor de despliegue:
- `VITE_SUPABASE_URL`: URL del proyecto Supabase.
- `VITE_SUPABASE_ANON_KEY`: clave pública anon/publishable.

No agregues claves privadas, service_role, contraseñas ni tokens a variables `VITE_*`, porque se incorporan al código visible del navegador. La clave service_role solo puede existir en un backend protegido.

## 5. Crear el primer usuario administrador
Registra una cuenta desde la pantalla de acceso. Para asignar el rol de superadministrador inicial, un propietario autorizado del proyecto debe ejecutar manualmente en SQL Editor, sustituyendo el correo:
```sql
update public.profiles p
set platform_role = 'superadmin'
from auth.users u
where p.id = u.id
  and u.email = 'correo-administrador@dominio.com';
```
No habilites una pantalla pública para asignar ese rol.

## 6. Alta de empresa y asiento de prueba
Después de iniciar sesión, entra a Empresas y clientes y crea una empresa de prueba con razón social y RUC de prueba válido. El servidor crea la empresa, la membresía del usuario y un conjunto inicial reducido de cuentas contables. Después, en Asientos contables, registra un asiento de prueba. El RPC del servidor comprueba membresía y rol, que las cuentas pertenezcan a esa empresa, que cada línea tenga un importe válido y que debe y haber cuadren. Los roles auditor y cliente no pueden contabilizar.

## 7. Límites de esta versión
- El plan contable incluido es una semilla reducida, no el PCGE completo oficial.
- El registro de asientos inicial solo permite un asiento sencillo de dos líneas.
- La vista de balance de comprobación es inicial; requiere pruebas de integridad y conciliación.
- Los módulos de compras, ventas, planillas, activos fijos, tesorería y estados financieros aún requieren desarrollo.
- No hay conexión SUNAT, SIRE, PLE ni emisión electrónica activa.
- No se ha configurado aprovisionamiento de una base PostgreSQL física por empresa. La separación actual es lógica por organización, mediante organización_id, membresías, funciones y RLS. No la anuncies como bases de datos independientes.

## Seguridad antes de producción
Prueba RLS con dos usuarios y dos empresas diferentes. Verifica que no puedan consultar datos cruzados ni llamar RPCs con IDs ajenos. Añade pruebas automatizadas, copias de seguridad, gestión de errores, registro de auditoría y revisión profesional contable/tributaria. No cargues información real de clientes hasta superar esas pruebas.
