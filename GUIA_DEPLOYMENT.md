# 🚀 GUÍA DE DEPLOYMENT - GearFlow Pro

## PASO 1: ACTUALIZAR LA BASE DE DATOS

> **IMPORTANTE**: Debes ejecutar el script actualizado de SQL

### Opción A: MySQL Workbench
1. Abre **MySQL Workbench**
2. Conecta a tu servidor (root / 1234)
3. Abre el archivo: `init_database.sql`
4. Ejecuta el script completo (Ctrl + Shift + Enter)

### Opción B: Terminal/PowerShell
```bash
mysql -u root -p1234 < init_database.sql
```

### Opción C: PhpMyAdmin
1. Ve a http://localhost/phpmyadmin
2. Selecciona base de datos `sistema_articulos_deportivos`
3. Voy a "SQL" y pega el contenido de `init_database.sql`
4. Click en "Ejecutar"

---

## PASO 2: VERIFICAR LA BD

Ejecuta estas consultas para confirmar:

```sql
-- Ver tabla articulos con nuevas columnas
DESCRIBE articulos;

-- Debe mostrar:
-- id_duenio INT NOT NULL
-- imagen_url VARCHAR(255)

-- Ver usuarios existentes
SELECT * FROM usuarios;

-- Ver categorías
SELECT * FROM categorias;

-- Ver artículos de prueba
SELECT * FROM articulos;
```

---

## PASO 3: INICIAR EL SERVIDOR

### Terminal PowerShell / CMD
```bash
cd c:\Users\Shanya\Desktop\TRABAJOS UNI\OPTATIVA\ProyectoAulaOptativa

# Activar entorno virtual (si existe)
.venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor
python app.py
```

**Esperado**: `http://localhost:5000`

---

## PASO 4: PRUEBAS RÁPIDAS

### Test 1: Autenticación
1. Ve a http://localhost:5000/auth/login
2. Usa credenciales:
   - **Email**: `demo@gearflow.com`
   - **Contraseña**: `demo123`
3. Deberías ver el dashboard

### Test 2: Carrito
1. Ve a http://localhost:5000/
2. Busca un artículo
3. Click en "Reservar ahora"
4. Completa:
   - Fecha: Hoy
   - Días: 4
5. Click "Pagar"
6. Carrito debe mostrar: 1 item, $340,000 COP (4 días × $85,000)

### Test 3: Crear Ticket
1. Con artículos en carrito
2. Click en icono carrito
3. Click "Crear Préstamos"
4. Deberías ver: "¡Ticket #1 generado con éxito!"
5. El artículo desaparece del catálogo (ahora está en estado Prestado)

### Test 4: Devolución
1. Ve a `/dashboard`
2. Selecciona tab "Tickets"
3. Busca el ticket que acabas de crear
4. Si eres CLIENTE: clickea "Devolver"
5. Si eres DUEÑO: clickea "Entregar"
6. Ticket cambia de estado
7. Artículo vuelve a aparecer en catálogo

---

## ESTRUCTURA DE CARPETAS IMPORTANTE

```
ProyectoAulaOptativa/
├── app.py                      
├── config.py                     
├── init_database.sql          
├── requirements.txt
│
├── app/
│   ├── __init__.py              
│   │
│   ├── rutas/
│   │   ├── autenticacion.py
│   │   ├── admin.py                
│   │   ├── catalogo.py          
│   │   ├── tickets.py            
│   │   └── prestamos.py       
│   │
│   ├── estaticos/js/
│   │   └── app.js              
│   │
│   └── plantillas/
│       └── index.html
│       └── dashboard.html
│
└── CAMBIOS_REALIZADOS.md      
```

---

## VARIABLES DE ENTORNO (.env)

Asegúrate de tener un archivo `.env` con:

```env
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tuContraseña
DB_NAME=sistema_articulos_deportivos

SECRET_KEY=tu_llave_secreta_aqui
```

---

## SOLUCIÓN DE PROBLEMAS

### ❌ Error: "Table doesn't exist"
- **Solución**: Ejecuta `init_database.sql` completo
- Verifica en PhpMyAdmin que existan todas las tablas

### ❌ Error: "Unknown column 'id_duenio'"
- **Solución**: La BD no tiene la columna nueva
- Ejecuta: `ALTER TABLE articulos ADD COLUMN id_duenio INT NOT NULL;`

### ❌ Carrito no funciona
- **Verificación**: Abre DevTools (F12) → Console
- Busca errores en rojo
- **Común**: Falta el endpoint `/api/prestamos/crear`
  - Solución: Asegúrate de que prestamos_bp está registrado en `__init__.py`

### ❌ Artículos no aparecen
- **Verificación**: Abre `/api/articulos` en el navegador
- **Esperado**: JSON con artículos
- **Si vacío**: Inserta artículos manualmente en BD

### ❌ Filtros no funcionan
- **Verificación**: Abre DevTools → Console
- Busca función `configurarFiltros()`
- Si no aparece: Recarga la página con Ctrl+Shift+R (cache)

---

## ENDPOINTS DISPONIBLES

### Autenticación
- `POST /api/auth/login`
- `POST /api/auth/registro`

### Catálogo
- `GET /api/articulos` (público)
- `GET /api/categorias`
- `GET /api/mis-articulos` (privado)

### Tickets
- `GET /api/tickets` (todos del usuario)
- `GET /api/tickets/estado/<estado>`

### Préstamos
- `POST /api/prestamos/crear` ← NUEVO
- `POST /api/prestamos/<id>/aprobar` ← NUEVO
- `POST /api/prestamos/<id>/confirmar-entrega` ← NUEVO
- `POST /api/prestamos/<id>/devolver` ← NUEVO

### Admin
- `GET /api/dashboard/stats`
- `POST /api/inventario/nuevo`
- `PUT /api/inventario/editar/<id>`
- `DELETE /api/inventario/eliminar/<id>`

---

## DATOS DE PRUEBA

### Usuarios Existentes
```
Email: admin@gearflow.com
Contraseña: admin123
Rol: Administrador

Email: demo@gearflow.com
Contraseña: demo123
Rol: Cliente
```

### Artículos de Prueba
Todos creados por `demo@gearflow.com`:
- Balón de Fútbol Nike - $85,000/día
- Raqueta de Tenis Wilson - $120,000/día
- Guantes de Boxeo Everlast - $95,000/día
- Patines Rollerblade - $150,000/día
- Casco Ciclismo Bell - $45,000/día

---

## CHECKLIST PRE-PRODUCCIÓN

- [ ] Base de datos actualizada y verificada
- [ ] Servidor ejecutándose sin errores
- [ ] Autenticación funciona (login/registro)
- [ ] Carrito agrega/elimina items
- [ ] Se crean tickets correctamente
- [ ] Estados de artículos cambian
- [ ] Búsqueda y filtros funcionan
- [ ] Devoluciones registran cambios
- [ ] Usuarios solo ven sus artículos en inventario
- [ ] Dashboard muestra estadísticas correctas

---

## NOTAS IMPORTANTES

1. **Los artículos son ÚNICOS**: No hay "cantidad". Si se alquila, desaparece del catálogo.

2. **Flujo de Ticketing**:
   - Cliente crea reserva → Ticket "Pendiente"
   - Dueño retira artículo → Aprueba (En Progreso)
   - Cliente recibe → Confirma Entrega (Entregado)
   - Cliente devuelve → Registra Devolución (Devuelto)

3. **Permisos**: Cada usuario solo puede ver/editar sus artículos (validado con id_duenio).

4. **Seguridad**: Las contraseñas aún están en texto plano. Para producción:
   - Usar bcrypt o Werkzeug para hash
   - Implementar JWT en lugar de sessions

---

## COMANDO PARA RESETEAR BD (SI ES NECESARIO)

```sql
-- CUIDADO: Esto borra TODO
DROP DATABASE sistema_articulos_deportivos;
CREATE DATABASE sistema_articulos_deportivos;
-- Luego ejecuta init_database.sql completo
```
---
## CONTACTO Y SOPORTE

Si algo no funciona:
1. Revisa la consola de Python (errores en rojo)
2. Abre DevTools (F12) → Console (errores de JS)
3. Verifica que la BD tiene las columnas nuevas
4. Limpia cache: Ctrl+Shift+R