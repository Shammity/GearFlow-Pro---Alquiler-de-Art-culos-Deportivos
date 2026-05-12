# 🎫 GearFlow Pro - Sistema de Gestión de Artículos Deportivos por Tickets

[![Estado](https://img.shields.io/badge/Estado-✅%20Funcional-brightgreen)](RESUMEN_VISUAL.md)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-Latest-red)](https://flask.palletsprojects.com/)
[![MySQL](https://img.shields.io/badge/MySQL-5.7%2B-orange)](https://www.mysql.com/)

## 📖 Descripción

**GearFlow Pro** es un sistema profesional de gestión de artículos deportivos que permite:

- ✅ Gestión de inventario (catálogo de equipamiento)
- ✅ Sistema de tickets para préstamo y devolución
- ✅ Control de usuarios (Administrador y Cliente)
- ✅ Dashboard con estadísticas en tiempo real

## 🚀 Inicio Rápido

### Requisitos
- Python 3.8 o superior
- MySQL 5.7 o superior
- pip (gestor de paquetes Python)

### Instalación (3 pasos)

```bash
# 1. Crear la base de datos
mysql -u root -p < init_database.sql

# 2. Configurar variables de entorno
copy .env.example .env
# Editar .env con tus credenciales

# 3. Instalar y ejecutar
pip install -r requirements.txt
python app.py
```

Luego abre tu navegador en **http://localhost:5000**

## 🔐 Credenciales de Prueba

### Usuario1
```
Email: admin@gearflow.com
Contraseña: admin123
Rol: Administrador
Acceso: /admin/dashboard
```

### Usuario2
```
Email: demo@gearflow.com
Contraseña: demo123
Rol: Cliente
Acceso: /listar_productos
```

## 📍 Estructura de Rutas

### Autenticación (`/auth`)
```
GET  /auth/login              → Formulario de login
POST /auth/login              → Procesar login
GET  /auth/registro           → Formulario de registro
POST /auth/registro           → Procesar registro
GET  /auth/forgot-password    → Recuperar contraseña
POST /auth/forgot-password    → Procesar recuperación
GET  /auth/logout             → Cerrar sesión
```

### Administración (`/admin`)
```
GET /admin/dashboard          → Panel de administración
GET /admin/dashboard_data     → API de estadísticas (JSON)
```

### Catálogo (`/catalogo`)
```
GET /listar_productos         → Página de inventario
GET /api/inventario           → API de artículos (JSON)
```

### Tickets (`/tickets`)
```
GET /listar_tickets           → Página de tickets
GET /api/tickets              → API de tickets (JSON)
```

## 🗄️ Base de Datos

**Nombre:** `sistema_articulos_deportivos`

### Tablas Principales
- `usuarios` - Información de usuarios
- `roles` - Tipos de roles (Admin, Cliente)
- `articulos` - Catálogo de equipamiento
- `categorias` - Categorías de artículos
- `tickets` - Tickets de préstamo
- `detalle_ticket` - Detalles de cada ticket
- `pagos` - Registro de pagos
- `auditoria` - Auditoría de acciones

**Auto-crear con:** `init_database.sql`

## 🔧 Stack Tecnológico

- **Backend:** Flask (Python 3.8+)
- **Base de Datos:** MySQL 5.7+
- **Frontend:** HTML5 + CSS3 + JavaScript (Vanilla)
- **Seguridad:** bcrypt (hashing de contraseñas), Sesiones Flask
- **Configuración:** Variables de entorno (.env)

## 📋 Cambios Realizados

### ✅ Problemas Resueltos
- ✅ Rutas HTML corregidas (ahora usan /auth/...)
- ✅ Atributos de formularios coinciden con backend
- ✅ Página de inicio (index.html) funcional
- ✅ Conexión a base de datos verificada
- ✅ Debugging mejorado con logging
- ✅ Decoradores de autorización corregidos
- ✅ Documentación completa

### 📁 Archivos Creados
- `INDICE.md` - Índice de documentación
- `RESUMEN_VISUAL.md` - Resumen visual
- `QUICKSTART.md` - Guía de inicio
- `RUTAS_MAPEO.md` - Mapeo de rutas
- `ANALISIS_COMPLETO.md` - Análisis técnico
- `DEBUG.md` - Guía de debugging
- `init_database.sql` - Script de BD
- `.env.example` - Plantilla de configuración

### 🔨 Archivos Modificados
- `app/__init__.py` - Ruta de inicio
- `app/plantillas/*.html` - Rutas y atributos
- `app/rutas/autenticacion.py` - Logging
- `app/utilidades/*.py` - Correcciones

## 🎯 Flujo de Usuario

### Nuevo Usuario
```
/ (índice) → Registrarse → /auth/registro → Crear cuenta → /auth/login
```

### Usuario Existente
```
/ (índice) → Ingresar → /auth/login → Dashboard / Catálogo
```

### Recuperar Contraseña
```
/auth/login → ¿Olvidaste contraseña? → /auth/forgot-password → Email
```

## ❓ Solución de Problemas

### "No puedo ingresar"
1. Verifica las credenciales (admin@gearflow.com / admin123)
2. Revisa que la BD tiene usuarios (revisa DEBUG.md)
3. Ve a DEBUG.md → "Correo o contraseña incorrectos"

### "Error de conexión con BD"
1. Verifica que MySQL está corriendo
2. Revisa variables en `.env`
3. Revisa DEBUG.md → "Error de conexión"

### "Las rutas no funcionan"
1. Verifica que estés usando `/auth/login` no `/login`
2. Lee RUTAS_MAPEO.md para ver todas las rutas correctas

## 📞 Soporte

Para problemas específicos:

1. **Revisa INDICE.md** - Índice de documentación
2. **Revisa DEBUG.md** - Solución de problemas comunes
3. **Busca en RUTAS_MAPEO.md** - Si es una ruta
4. **Lee ANALISIS_COMPLETO.md** - Si quieres entender un cambio

## 📊 Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| Rutas totales | 15 |
| APIs JSON | 3 |
| Tablas de BD | 8 |
| Usuarios de prueba | 2 |
| Documentación | 6 archivos |
| Líneas documentadas | 2000+ |

## 🎓 Próximos Pasos

Después de que todo funcione:

1. **Crear más usuarios** en la tabla
2. **Subir artículos** desde el admin
3. **Crear tickets** de préstamo
4. **Implementar pagos** reales
5. **Envío de emails** automáticos
6. **Reportes** avanzados

## 📝 Licencia

Este proyecto es de uso educativo/desarrollo.

## ✨ Estado del Proyecto

```
✅ Autenticación        → FUNCIONAL
✅ Rutas HTML           → FUNCIONAL
✅ Base de datos        → FUNCIONAL
✅ Dashboard            → FUNCIONAL
✅ APIs JSON            → FUNCIONAL
✅ Documentación        → COMPLETA
```

**Última actualización:** 2026-05-01  
**Versión:** 1.0  
**Estado:** ✅ Listo para usar

**👉 [Comienza por leer INDICE.md](INDICE.md)**
