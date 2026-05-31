/**
 * Capa de acceso a la API del backend (backCTK/api.php).
 *
 * Todas las peticiones van como POST JSON a /api (proxy de Vite → api.php).
 * La única excepción es la subida de imágenes, que va como multipart/form-data.
 *
 * Patrón de llamada: apiRequest(action, entity, payload?)
 *   - entity: agrupación lógica (auth, mesas, pedidos, cocina…)
 *   - action: operación concreta (login, listar, crear…)
 *   - payload: datos adicionales que se mezclan en el body JSON
 */

// URL directa al backend PHP (evita depender del proxy de Vite)
const API_URL = "http://localhost/CTK/backCTK/api.php";
// URL base del backend para construir rutas de imágenes
const BACKEND_BASE_URL = "http://localhost/CTK/backCTK";

/**
 * Función central de petición. Lanza Error si el servidor devuelve error HTTP
 * o si el JSON contiene { error } o { ok: false }.
 */
async function apiRequest(action, entity, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // necesario para enviar la cookie de sesión PHP
    body: JSON.stringify({
      action,
      entity,
      ...payload,
    }),
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    throw new Error("La respuesta del servidor no es JSON válido");
  }

  if (!response.ok || data.ok === false || data.error) {
    throw new Error(data.message || data.error || "Error en la petición");
  }

  return data;
}

/**
 * Convierte una ruta relativa de imagen (ej. "uploads/productos/foto.jpg")
 * en una URL absoluta apuntando al backend.
 * Si ya es una URL absoluta la devuelve tal cual.
 */
export function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${BACKEND_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

/** Inicia sesión y devuelve { user: { id, usuario, rol } }. */
export async function login(usuario, password) {
  return apiRequest("login", "auth", { usuario, password });
}

/** Destruye la sesión en el servidor. */
export async function logout() {
  return apiRequest("logout", "auth");
}

// ── ACCESO DE CLIENTE ─────────────────────────────────────────────────────────

/** Valida el código de 6 dígitos introducido por el cliente y devuelve la mesa. */
export async function validarCodigoMesa(codigo) {
  return apiRequest("validar-codigo", "mesas", { codigo });
}

/** Crea un pedido desde la vista de usuario o camarero. */
export async function crearPedidoUsuario(data) {
  return apiRequest("crear", "pedidos", data);
}

// ── USUARIOS ──────────────────────────────────────────────────────────────────

export async function getRoles() {
  return apiRequest("roles", "usuarios");
}

export async function getUsuarios() {
  return apiRequest("listar", "usuarios");
}

export async function crearUsuario(data) {
  return apiRequest("crear", "usuarios", data);
}

export async function actualizarUsuario(data) {
  return apiRequest("actualizar", "usuarios", data);
}

export async function eliminarUsuario(id) {
  return apiRequest("eliminar", "usuarios", { id });
}

/** Activa o desactiva un usuario sin cambiar otros datos. */
export async function toggleUsuario(id, activo) {
  return apiRequest("toggle", "usuarios", { id, activo });
}

// ── CATEGORÍAS ────────────────────────────────────────────────────────────────

export async function getCategorias() {
  return apiRequest("listar", "categorias");
}

export async function crearCategoria(data) {
  return apiRequest("crear", "categorias", data);
}

export async function actualizarCategoria(data) {
  return apiRequest("actualizar", "categorias", data);
}

export async function eliminarCategoria(id) {
  return apiRequest("eliminar", "categorias", { id });
}

// ── ALÉRGENOS ─────────────────────────────────────────────────────────────────

export async function getAlergenos() {
  return apiRequest("listar", "alergenos");
}

export async function crearAlergeno(data) {
  return apiRequest("crear", "alergenos", data);
}

export async function actualizarAlergeno(data) {
  return apiRequest("actualizar", "alergenos", data);
}

export async function eliminarAlergeno(id) {
  return apiRequest("eliminar", "alergenos", { id });
}

// ── MENÚS ─────────────────────────────────────────────────────────────────────
// El backend solo devuelve menús activos (activo=1). No hay endpoint para todos.

export async function getMenus() {
  return apiRequest("listar", "menus");
}

export async function crearMenu(data) {
  return apiRequest("crear", "menus", data);
}

export async function actualizarMenu(data) {
  return apiRequest("actualizar", "menus", data);
}

export async function eliminarMenu(id) {
  return apiRequest("eliminar", "menus", { id });
}

// ── PRODUCTOS ─────────────────────────────────────────────────────────────────

export async function getProductos() {
  return apiRequest("listar", "productos");
}

export async function crearProducto(data) {
  return apiRequest("crear", "productos", data);
}

export async function actualizarProducto(data) {
  return apiRequest("actualizar", "productos", data);
}

export async function eliminarProducto(id) {
  return apiRequest("eliminar", "productos", { id });
}

// ── MESAS ─────────────────────────────────────────────────────────────────────

export async function getMesas() {
  return apiRequest("listar", "mesas");
}

export async function crearMesa(data) {
  return apiRequest("crear", "mesas", data);
}

export async function actualizarMesa(data) {
  return apiRequest("actualizar", "mesas", data);
}

export async function eliminarMesa(id) {
  return apiRequest("eliminar", "mesas", { id });
}

export async function generarCodigoMesa(id) {
  return apiRequest("generar-codigo", "mesas", { id });
}

export async function resetearCodigoMesa(id) {
  return apiRequest("resetear-codigo", "mesas", { id });
}

/**
 * Libera la mesa (estado libre, código inactivo) sin borrar el histórico.
 * Usado desde la vista de usuario al terminar su sesión en la mesa.
 */
export async function terminarMesa(id) {
  return apiRequest("terminar", "mesas", { id });
}

/**
 * Cierra la mesa desde el panel de personal: marca el histórico con fecha_cierre
 * y borra los pedidos activos.
 */
export async function cerrarMesa(id) {
  return apiRequest("cerrar", "mesas", { id });
}

// ── COCINA ────────────────────────────────────────────────────────────────────

/** Devuelve todos los pedidos activos con sus líneas, ordenados por urgencia. */
export async function getPedidosCocina() {
  return apiRequest("listar_pedidos", "cocina");
}

/**
 * Cambia el estado global de un pedido.
 * Estados válidos: 'pendiente' | 'en preparacion' | 'listo'
 * (el estado 'servido' solo aplica a líneas individuales, no al pedido)
 */
export async function actualizarEstadoPedido(data) {
  return apiRequest("actualizar_estado_pedido", "cocina", data);
}

/**
 * Cambia el estado de una línea individual de pedido.
 * Estados válidos: 'pendiente' | 'en preparacion' | 'lista' | 'servido'
 * El backend recalcula automáticamente el estado del pedido padre.
 */
export async function actualizarEstadoLineaPedido(data) {
  return apiRequest("actualizar_estado_linea", "cocina", data);
}

export async function eliminarPedidoCocina(id) {
  return apiRequest("eliminar_pedido", "cocina", { id });
}

// ── PEDIDOS ───────────────────────────────────────────────────────────────────

/** Devuelve el historial de pedidos de una mesa con todas sus líneas. */
export async function getHistorialMesa(mesaId) {
  return apiRequest("historial_mesa", "pedidos", { mesaId });
}

// ── COBROS ────────────────────────────────────────────────────────────────────

/** Devuelve todas las sesiones cerradas con su total y estado de pago. */
export async function getHistorialTerminados() {
  return apiRequest("listar_terminados", "historico");
}

/**
 * Marca una sesión como pagada o pendiente.
 * La sesión se identifica por mesaId + fechaCierre (devueltos por getHistorialTerminados).
 */
export async function marcarPagado(mesaId, fechaCierre, pagado) {
  return apiRequest("marcar_pagado", "historico", { mesaId, fechaCierre, pagado });
}

// ── SUBIDA DE IMÁGENES ────────────────────────────────────────────────────────

/**
 * Sube una imagen al servidor. A diferencia del resto de funciones, usa
 * multipart/form-data en lugar de JSON porque transporta un fichero binario.
 * @param {'producto'|'alergeno'} tipo - determina la subcarpeta de destino
 */
async function subirImagen(tipo, imagenFile) {
  const formData = new FormData();
  formData.append("entity", "uploads");
  formData.append("action", "imagen");
  formData.append("tipo", tipo);
  formData.append("imagen", imagenFile);

  const response = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    throw new Error("La respuesta del servidor no es JSON válido");
  }

  if (!response.ok || data.ok === false || data.error) {
    throw new Error(data.message || data.error || "Error al subir la imagen");
  }

  return data;
}

export async function subirImagenAlergeno(imagenFile) {
  return subirImagen("alergeno", imagenFile);
}

export async function subirImagenProducto(imagenFile) {
  return subirImagen("producto", imagenFile);
}
