const API_URL = "/api";
const BACKEND_BASE_URL = "http://localhost/CTK/backCTK";

async function apiRequest(action, entity, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
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

export function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${BACKEND_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
}

/* =========================
   AUTH
========================= */

export async function login(usuario, password) {
  return apiRequest("login", "auth", { usuario, password });
}

export async function logout() {
  return apiRequest("logout", "auth");
}

/* =========================
   USUARIO / MESA / PEDIDO
========================= */

export async function validarCodigoMesa(codigo) {
  return apiRequest("validar-codigo", "mesas", { codigo });
}

export async function crearPedidoUsuario(data) {
  return apiRequest("crear", "pedidos", data);
}

/* =========================
   USUARIOS
========================= */

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

export async function toggleUsuario(id, activo) {
  return apiRequest("toggle", "usuarios", { id, activo });
}

/* =========================
   CATEGORÍAS
========================= */

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

/* =========================
   ALÉRGENOS
========================= */

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

/* =========================
   MENÚS
========================= */

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

/* =========================
   PRODUCTOS
========================= */

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


/* =========================
   MESAS
========================= */

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

/* =========================
   COCINA
========================= */

export async function listarPedidosCocina() {
  return apiRequest("listar_pedidos", "cocina");
}

export async function getPedidosCocina() {
  return apiRequest("listar_pedidos", "cocina");
}

export async function actualizarEstadoPedido(data) {
  return apiRequest("actualizar_estado_pedido", "cocina", data);
}

export async function actualizarEstadoLineaPedido(data) {
  return apiRequest("actualizar_estado_linea", "cocina", data);
}

/* =========================
   SUBIDA DE IMÁGENES
========================= */

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

export async function terminarMesa(id) {
  return apiRequest("terminar", "mesas", { id });
}

export async function eliminarPedidoCocina(id) {
  return apiRequest("eliminar_pedido", "cocina", { id });
}

export async function cerrarMesa(id) {
  return apiRequest("cerrar", "mesas", { id });
}
export async function getHistorialMesa(mesaId) {
  return apiRequest("historial_mesa", "pedidos", { mesaId });
}
