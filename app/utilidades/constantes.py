# ════════════════════════════════════════════════════════════════════════════════
# CONSTANTES GLOBALES - SISTEMA DE ARTÍCULOS DEPORTIVOS
# ════════════════════════════════════════════════════════════════════════════════

# ────── ROLES DE USUARIO (ID) ──────
ROL_CLIENTE = 1
ROL_ADMINISTRADOR = 2

ROLES_MAP = {
    1: 'Cliente',
    2: 'Administrador'
}

# ────── ESTADOS DE ARTÍCULO ──────
ESTADO_DISPONIBLE = 'Disponible'
ESTADO_PRESTADO = 'Prestado'
ESTADO_MANTENIMIENTO = 'Mantenimiento'

ESTADOS_ARTICULO = {ESTADO_DISPONIBLE, ESTADO_PRESTADO, ESTADO_MANTENIMIENTO}

# ────── ESTADOS DE TICKET ──────
ESTADO_ABIERTO = 'Abierto'
ESTADO_PAGADO = 'Pagado'
ESTADO_FINALIZADO = 'Finalizado'

ESTADOS_TICKET = {ESTADO_ABIERTO, ESTADO_PAGADO, ESTADO_FINALIZADO}

# ────── RUTAS PÚBLICAS (No requieren autenticación) ──────
RUTAS_PUBLICAS = {
    '/',
    '/auth/login',
    '/auth/registro',
    '/auth/forgot-password',
    '/favicon.ico'
}

# ────── MENSAJES COMUNES ──────
MENSAJE_NO_AUTENTICADO = 'Usuario no autenticado'
MENSAJE_ACCESO_DENEGADO = 'Acceso denegado. Permisos insuficientes'
MENSAJE_RECURSO_NO_ENCONTRADO = 'Recurso no encontrado'
MENSAJE_ERROR_INTERNO = 'Error interno del servidor'
MENSAJE_LOGIN_EXITOSO = '¡Bienvenido al sistema!'
MENSAJE_LOGOUT_EXITOSO = 'Has cerrado sesión correctamente'
MENSAJE_REGISTRO_EXITOSO = 'Cuenta creada con éxito. Ahora puedes iniciar sesión.'

# ────── CONFIGURACIÓN DE PRECIOS Y PAGOS ──────
MONEDA = 'COP'  # Pesos Colombianos
PORCENTAJE_DEPOSITO_GARANTIA = 20  # 20% del precio como depósito

# ────── TIPOS DE ACCIÓN PARA AUDITORÍA ──────
ACCION_LOGIN = 'LOGIN'
ACCION_LOGOUT = 'LOGOUT'
ACCION_REGISTRO = 'REGISTRO'
ACCION_CREAR = 'CREAR'
ACCION_ACTUALIZAR = 'ACTUALIZAR'
ACCION_ELIMINAR = 'ELIMINAR'
ACCION_PAGAR = 'PAGAR'
ACCION_DEVOLVER = 'DEVOLVER'

ACCIONES_VALIDAS = {
    ACCION_LOGIN, ACCION_LOGOUT, ACCION_REGISTRO,
    ACCION_CREAR, ACCION_ACTUALIZAR, ACCION_ELIMINAR,
    ACCION_PAGAR, ACCION_DEVOLVER
}

# ────── CONFIGURACIÓN DE ARCHIVOS ──────
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB máximo para uploads
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}

# ────── LÍMITES Y VALIDACIONES ──────
LONGITUD_MINIMA_CONTRASENA = 8
LONGITUD_MAXIMA_CONTRASENA = 25
LONGITUD_MINIMA_NOMBRE = 2
LONGITUD_MAXIMA_NOMBRE = 100

# ────── CATEGORÍAS DE EJEMPLO ──────
CATEGORIAS_DEFECTO = [
    'Fútbol',
    'Tenis',
    'Boxeo',
    'Patinaje',
    'Ciclismo'
]

EXTENSIONES_PERMITIDAS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
TAMAÑO_MAXIMO_ARCHIVO = 5 * 1024 * 1024  # 5 MB
