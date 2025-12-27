# 🗄️ Configuración de Supabase

## Pasos para configurar Supabase

### 1. Crear las tablas en Supabase

1. Ve a tu proyecto en Supabase: https://hcccbpcabuwsvtpzhagu.supabase.co
2. Ve a **SQL Editor** en el menú lateral
3. Ejecuta el contenido del archivo `supabase_schema.sql` para crear las tablas

### 2. Obtener la Service Role Key

1. En Supabase, ve a **Settings** → **API**
2. Busca la sección **Project API keys**
3. Copia la **service_role** key (NO la anon key)
4. Esta key es necesaria para que el backend pueda hacer operaciones sin restricciones de RLS

### 3. Configurar Variables de Entorno

En Render, agrega estas variables de entorno:

- **SUPABASE_URL**: `https://hcccbpcabuwsvtpzhagu.supabase.co`
- **SUPABASE_SERVICE_ROLE_KEY**: (la service_role key que copiaste)
- **JWT_SECRET**: (genera uno con `openssl rand -base64 32`)

### 4. Estructura de las Tablas

Las tablas creadas son:

- **users**: Clientes registrados
- **merchants**: Comerciantes registrados  
- **transactions**: Historial de compras y recompensas

### 5. Row Level Security (RLS)

Las tablas tienen RLS habilitado. Para el backend, necesitas usar la **service_role** key que bypass RLS.

Para producción, considera crear políticas más específicas según tus necesidades de seguridad.

## Notas Importantes

- ⚠️ **NUNCA** expongas la service_role key en el frontend
- La service_role key solo debe usarse en el backend
- La anon key puede usarse en el frontend si necesitas acceso directo
- Los IDs ahora son UUIDs en lugar de strings simples

## Verificar Conexión

Una vez configurado, el servidor debería conectarse automáticamente a Supabase al iniciar.

