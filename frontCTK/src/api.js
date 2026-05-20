const API_URL = "http://localhost/CTK/backCTK/api.php";

async function apiFetch(entity, action, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      entity,
      action,
      ...payload,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Error en la petición");
  }

  return data;
}

// =========================
// AUTH
// =========================
export async function login(usuario, password) {
  return apiFetch("auth", "login", { usuario, password });
}

export async function logout() {
  return apiFetch("auth", "logout");
}

// =========================
// USUARIOS
// =========================
export async function getUsuarios() {
  return apiFetch("usuarios", "listar");
}

export async function getRoles() {
  return apiFetch("usuarios", "roles");
}

export async function crearUsuario(payload) {
  return apiFetch("usuarios", "crear", payload);
}

export async function actualizarUsuario(payload) {
  return apiFetch("usuarios", "actualizar", payload);
}

export async function toggleUsuario(payload) {
  return apiFetch("usuarios", "toggle", payload);
}

export async function eliminarUsuario(id) {
  return apiFetch("usuarios", "eliminar", { id });
}

// =========================
// MESAS
// =========================
export async function getMesas() {
  return apiFetch("mesas", "listar");
}

export async function crearMesa(payload) {
  return apiFetch("mesas", "crear", payload);
}

export async function actualizarMesa(payload) {
  return apiFetch("mesas", "actualizar", payload);
}

export async function validarCodigoMesa(codigo) {
  return apiFetch("mesas", "validar-codigo", { codigo });
}

// =========================
// MENUS
// =========================
export async function getMenus() {
  return apiFetch("menus", "listar");
}

export async function crearMenu(payload) {
  return apiFetch("menus", "crear", payload);
}

export async function actualizarMenu(payload) {
  return apiFetch("menus", "actualizar", payload);
}

// =========================
// CATEGORIAS
// =========================
export async function getCategorias() {
  return apiFetch("categorias", "listar");
}

export async function crearCategoria(payload) {
  return apiFetch("categorias", "crear", payload);
}

export async function actualizarCategoria(payload) {
  return apiFetch("categorias", "actualizar", payload);
}

// =========================
// ALERGENOS
// =========================
export async function getAlergenos() {
  return apiFetch("alergenos", "listar");
}

export async function crearAlergeno(payload) {
  return apiFetch("alergenos", "crear", payload);
}

export async function actualizarAlergeno(payload) {
  return apiFetch("alergenos", "actualizar", payload);
}

// =========================
// PRODUCTOS
// =========================
export async function getProductos() {
  return apiFetch("productos", "listar");
}

export async function crearProducto(payload) {
  return apiFetch("productos", "crear", payload);
}

export async function actualizarProducto(payload) {
  return apiFetch("productos", "actualizar", payload);
}
export async function subirImagen(file, tipo) {
  const formData = new FormData();
  formData.append("entity", "uploads");
  formData.append("action", "imagen");
  formData.append("tipo", tipo);
  formData.append("imagen", file);

  const response = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Error al subir la imagen");
  }

  return data;
}

export async function subirImagenProducto(file) {
  return subirImagen(file, "producto");
}

export async function subirImagenAlergeno(file) {
  return subirImagen(file, "alergeno");
}