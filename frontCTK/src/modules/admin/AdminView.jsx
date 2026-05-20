import { useEffect, useMemo, useRef, useState } from "react";
import {
  getUsuarios,
  getRoles,
  crearUsuario,
  actualizarUsuario,
  toggleUsuario,
  eliminarUsuario,
  getMenus,
  crearMenu,
  actualizarMenu,
  getCategorias,
  crearCategoria,
  actualizarCategoria,
  getAlergenos,
  crearAlergeno,
  actualizarAlergeno,
  getProductos,
  crearProducto,
  actualizarProducto,
  subirImagenProducto,
  subirImagenAlergeno,
} from "../../api";

const usuarioInicial = {
  id: null,
  usuario: "",
  password: "",
  rol_id: "",
  activo: true,
};

const menuInicial = {
  id: null,
  nombre: "",
  coste: "",
  activo: true,
};

const categoriaInicial = {
  id: null,
  nombre: "",
};

const alergenoInicial = {
  id: null,
  nombre: "",
  icono: "",
};

const productoInicial = {
  id: null,
  nombre: "",
  imagen: "",
  categoriaId: "",
  disponible: true,
  precio: "",
  alergenos: [],
};

export default function AdminView({ user, onBack, onSalir }) {
  const [tab, setTab] = useState("usuarios");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [formUsuario, setFormUsuario] = useState(usuarioInicial);
  const [modoCrearUsuario, setModoCrearUsuario] = useState(true);

  const [menus, setMenus] = useState([]);
  const [formMenu, setFormMenu] = useState(menuInicial);
  const [modoCrearMenu, setModoCrearMenu] = useState(true);

  const [categorias, setCategorias] = useState([]);
  const [formCategoria, setFormCategoria] = useState(categoriaInicial);
  const [modoCrearCategoria, setModoCrearCategoria] = useState(true);

  const [alergenos, setAlergenos] = useState([]);
  const [formAlergeno, setFormAlergeno] = useState(alergenoInicial);
  const [modoCrearAlergeno, setModoCrearAlergeno] = useState(true);

  const [productos, setProductos] = useState([]);
  const [formProducto, setFormProducto] = useState(productoInicial);
  const [modoCrearProducto, setModoCrearProducto] = useState(true);

  const fileInputRef = useRef(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [isDragging, setIsDragging] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [previewImagen, setPreviewImagen] = useState("");

  const alergenoFileInputRef = useRef(null);
  const [alergenoFileInputKey, setAlergenoFileInputKey] = useState(Date.now() + 1);
  const [isDraggingAlergeno, setIsDraggingAlergeno] = useState(false);
  const [subiendoImagenAlergeno, setSubiendoImagenAlergeno] = useState(false);
  const [previewImagenAlergeno, setPreviewImagenAlergeno] = useState("");

  const limpiarMensajes = () => {
    setError("");
    setMensaje("");
  };

  const cargarUsuarios = async () => {
    const [resUsuarios, resRoles] = await Promise.all([getUsuarios(), getRoles()]);
    setUsuarios(resUsuarios.usuarios || []);
    setRoles(resRoles.roles || []);
  };

  const cargarMenus = async () => {
    const res = await getMenus();
    setMenus(res.menus || []);
  };

  const cargarCategorias = async () => {
    const res = await getCategorias();
    setCategorias(res.categorias || []);
  };

  const cargarAlergenos = async () => {
    const res = await getAlergenos();
    setAlergenos(res.alergenos || []);
  };

  const cargarProductos = async () => {
    const res = await getProductos();
    setProductos(res.productos || []);
  };

  const cargarTodo = async () => {
    try {
      setLoading(true);
      limpiarMensajes();

      await Promise.all([
        cargarUsuarios(),
        cargarMenus(),
        cargarCategorias(),
        cargarAlergenos(),
        cargarProductos(),
      ]);
    } catch (err) {
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    return () => {
      if (previewImagen) {
        URL.revokeObjectURL(previewImagen);
      }
      if (previewImagenAlergeno) {
        URL.revokeObjectURL(previewImagenAlergeno);
      }
    };
  }, [previewImagen, previewImagenAlergeno]);

  const resumen = useMemo(
    () => ({
      usuarios: usuarios.length,
      menus: menus.length,
      categorias: categorias.length,
      productos: productos.length,
    }),
    [usuarios, menus, categorias, productos]
  );

  const getNombreCategoria = (categoriaId) => {
    const categoria = categorias.find((c) => Number(c.id) === Number(categoriaId));
    return categoria ? categoria.nombre : "-";
  };

  const handleUsuarioChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormUsuario((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMenuChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormMenu((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCategoriaChange = (e) => {
    const { name, value } = e.target;
    setFormCategoria((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAlergenoChange = (e) => {
    const { name, value } = e.target;
    setFormAlergeno((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProductoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormProducto((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleAlergenoProducto = (id) => {
    setFormProducto((prev) => {
      const existe = prev.alergenos.includes(id);

      return {
        ...prev,
        alergenos: existe
          ? prev.alergenos.filter((item) => item !== id)
          : [...prev.alergenos, id],
      };
    });
  };

  const limpiarImagenProducto = () => {
    if (previewImagen) {
      URL.revokeObjectURL(previewImagen);
    }

    setPreviewImagen("");
    setFormProducto((prev) => ({
      ...prev,
      imagen: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setFileInputKey(Date.now());
  };

  const limpiarImagenAlergeno = () => {
    if (previewImagenAlergeno) {
      URL.revokeObjectURL(previewImagenAlergeno);
    }

    setPreviewImagenAlergeno("");
    setFormAlergeno((prev) => ({
      ...prev,
      icono: "",
    }));

    if (alergenoFileInputRef.current) {
      alergenoFileInputRef.current.value = "";
    }

    setAlergenoFileInputKey(Date.now());
  };

  const procesarImagenProducto = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen.");
      return;
    }

    try {
      limpiarMensajes();
      setSubiendoImagen(true);

      if (previewImagen) {
        URL.revokeObjectURL(previewImagen);
      }

      const previewUrl = URL.createObjectURL(file);
      setPreviewImagen(previewUrl);

      const res = await subirImagenProducto(file);

      setFormProducto((prev) => ({
        ...prev,
        imagen: res.imagen,
      }));

      setMensaje("Imagen subida correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendoImagen(false);
    }
  };

  const procesarImagenAlergeno = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen.");
      return;
    }

    try {
      limpiarMensajes();
      setSubiendoImagenAlergeno(true);

      if (previewImagenAlergeno) {
        URL.revokeObjectURL(previewImagenAlergeno);
      }

      const previewUrl = URL.createObjectURL(file);
      setPreviewImagenAlergeno(previewUrl);

      const res = await subirImagenAlergeno(file);

      setFormAlergeno((prev) => ({
        ...prev,
        icono: res.imagen,
      }));

      setMensaje("Imagen del alérgeno subida correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendoImagenAlergeno(false);
    }
  };

  const nuevaEntidad = (tipo) => {
    limpiarMensajes();

    if (tipo === "usuario") {
      setModoCrearUsuario(true);
      setFormUsuario(usuarioInicial);
    }

    if (tipo === "menu") {
      setModoCrearMenu(true);
      setFormMenu(menuInicial);
    }

    if (tipo === "categoria") {
      setModoCrearCategoria(true);
      setFormCategoria(categoriaInicial);
    }

    if (tipo === "alergeno") {
      setModoCrearAlergeno(true);

      if (previewImagenAlergeno) {
        URL.revokeObjectURL(previewImagenAlergeno);
      }

      setPreviewImagenAlergeno("");
      setFormAlergeno(alergenoInicial);

      if (alergenoFileInputRef.current) {
        alergenoFileInputRef.current.value = "";
      }

      setAlergenoFileInputKey(Date.now());
    }

    if (tipo === "producto") {
      setModoCrearProducto(true);

      if (previewImagen) {
        URL.revokeObjectURL(previewImagen);
      }

      setPreviewImagen("");
      setFormProducto(productoInicial);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setFileInputKey(Date.now());
    }
  };

  const seleccionarUsuario = (item) => {
    limpiarMensajes();
    setModoCrearUsuario(false);
    setFormUsuario({
      id: item.id,
      usuario: item.usuario,
      password: "",
      rol_id: item.rol_id,
      activo: Number(item.activo) === 1,
    });
  };

  const seleccionarMenu = (item) => {
    limpiarMensajes();
    setModoCrearMenu(false);
    setFormMenu({
      id: item.id,
      nombre: item.nombre,
      coste: item.coste,
      activo: Number(item.activo) === 1,
    });
  };

  const seleccionarCategoria = (item) => {
    limpiarMensajes();
    setModoCrearCategoria(false);
    setFormCategoria({
      id: item.id,
      nombre: item.nombre,
    });
  };

  const seleccionarAlergeno = (item) => {
    limpiarMensajes();
    if (previewImagenAlergeno) {
      URL.revokeObjectURL(previewImagenAlergeno);
    }
    setPreviewImagenAlergeno("");
    if (alergenoFileInputRef.current) {
      alergenoFileInputRef.current.value = "";
    }
    setAlergenoFileInputKey(Date.now());
    setModoCrearAlergeno(false);
    setFormAlergeno({
      id: item.id,
      nombre: item.nombre,
      icono: item.icono || "",
    });
  };

  const seleccionarProducto = (item) => {
    limpiarMensajes();
    if (previewImagen) {
      URL.revokeObjectURL(previewImagen);
    }
    setPreviewImagen("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFileInputKey(Date.now());
    setModoCrearProducto(false);
    setFormProducto({
      id: item.id,
      nombre: item.nombre,
      imagen: item.imagen || "",
      categoriaId: item.categoriaId || "",
      disponible: Number(item.disponible) === 1,
      precio: item.precio,
      alergenos: (item.alergenos || []).map((a) => Number(a.id)),
    });
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!formUsuario.usuario || !formUsuario.rol_id) {
      setError("Usuario y rol son obligatorios.");
      return;
    }

    if (modoCrearUsuario && !formUsuario.password) {
      setError("La contraseña es obligatoria al crear.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        usuario: formUsuario.usuario.trim(),
        password: formUsuario.password,
        rol_id: Number(formUsuario.rol_id),
        activo: formUsuario.activo,
      };

      if (modoCrearUsuario) {
        await crearUsuario(payload);
        setMensaje("Usuario creado correctamente.");
        setFormUsuario(usuarioInicial);
      } else {
        await actualizarUsuario({
          id: formUsuario.id,
          ...payload,
        });
        setMensaje("Usuario actualizado correctamente.");
      }

      await cargarUsuarios();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarMenu = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!formMenu.nombre || formMenu.coste === "") {
      setError("Nombre y coste son obligatorios.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nombre: formMenu.nombre.trim(),
        coste: Number(formMenu.coste),
        activo: formMenu.activo,
      };

      if (modoCrearMenu) {
        await crearMenu(payload);
        setMensaje("Menú creado correctamente.");
        setFormMenu(menuInicial);
      } else {
        await actualizarMenu({
          id: formMenu.id,
          ...payload,
        });
        setMensaje("Menú actualizado correctamente.");
      }

      await cargarMenus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarCategoria = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!formCategoria.nombre) {
      setError("El nombre de la categoría es obligatorio.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nombre: formCategoria.nombre.trim(),
      };

      if (modoCrearCategoria) {
        await crearCategoria(payload);
        setMensaje("Categoría creada correctamente.");
        setFormCategoria(categoriaInicial);
      } else {
        await actualizarCategoria({
          id: formCategoria.id,
          ...payload,
        });
        setMensaje("Categoría actualizada correctamente.");
      }

      await cargarCategorias();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarAlergeno = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!formAlergeno.nombre) {
      setError("El nombre del alérgeno es obligatorio.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nombre: formAlergeno.nombre.trim(),
        icono: formAlergeno.icono.trim(),
      };

      if (modoCrearAlergeno) {
        await crearAlergeno(payload);
        setMensaje("Alérgeno creado correctamente.");

        if (previewImagenAlergeno) {
          URL.revokeObjectURL(previewImagenAlergeno);
        }

        setPreviewImagenAlergeno("");
        setFormAlergeno(alergenoInicial);

        if (alergenoFileInputRef.current) {
          alergenoFileInputRef.current.value = "";
        }

        setAlergenoFileInputKey(Date.now());
      } else {
        await actualizarAlergeno({
          id: formAlergeno.id,
          ...payload,
        });
        setMensaje("Alérgeno actualizado correctamente.");
      }

      await cargarAlergenos();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!formProducto.nombre || !formProducto.categoriaId || formProducto.precio === "") {
      setError("Nombre, categoría y precio son obligatorios.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nombre: formProducto.nombre.trim(),
        imagen: formProducto.imagen.trim(),
        categoriaId: Number(formProducto.categoriaId),
        disponible: formProducto.disponible,
        precio: Number(formProducto.precio),
        alergenos: formProducto.alergenos,
      };

      if (modoCrearProducto) {
        await crearProducto(payload);
        setMensaje("Producto creado correctamente.");

        if (previewImagen) {
          URL.revokeObjectURL(previewImagen);
        }

        setPreviewImagen("");
        setFormProducto(productoInicial);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        setFileInputKey(Date.now());
      } else {
        await actualizarProducto({
          id: formProducto.id,
          ...payload,
        });
        setMensaje("Producto actualizado correctamente.");
      }

      await cargarProductos();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstadoUsuario = async (item) => {
    limpiarMensajes();

    try {
      setLoading(true);
      await toggleUsuario({
        id: item.id,
        activo: Number(item.activo) === 1 ? 0 : 1,
      });
      setMensaje("Estado del usuario actualizado.");
      await cargarUsuarios();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const borrarUsuario = async (item) => {
    const ok = window.confirm(`¿Eliminar al usuario "${item.usuario}"?`);
    if (!ok) return;

    limpiarMensajes();

    try {
      setLoading(true);
      await eliminarUsuario(item.id);
      setMensaje("Usuario eliminado correctamente.");
      setFormUsuario(usuarioInicial);
      setModoCrearUsuario(true);
      await cargarUsuarios();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderUsuarios = () => (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Usuarios</h2>
          <span className="text-sm text-slate-500">Pulsa un usuario para editarlo</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {usuarios.map((item) => {
            const activo = !modoCrearUsuario && formUsuario.id === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-3xl border p-5 ${
                  activo ? "border-blue-600 bg-blue-50" : "border-slate-200"
                }`}
              >
                <button
                  onClick={() => seleccionarUsuario(item)}
                  className="w-full text-left"
                >
                  <p className="text-sm text-slate-500">Usuario</p>
                  <p className="text-xl font-bold">{item.usuario}</p>
                  <div className="mt-3 space-y-1 text-sm text-slate-500">
                    <p>Rol: {item.rol}</p>
                    <p>Estado: {Number(item.activo) === 1 ? "Activo" : "Inactivo"}</p>
                  </div>
                </button>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => cambiarEstadoUsuario(item)}
                    className="rounded-xl bg-amber-500 px-3 py-2 text-sm text-white"
                  >
                    {Number(item.activo) === 1 ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => borrarUsuario(item)}
                    className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {modoCrearUsuario ? "Crear usuario" : "Editar usuario"}
          </h2>
          <button
            onClick={() => nuevaEntidad("usuario")}
            className="rounded-xl bg-slate-200 px-3 py-2 text-sm"
          >
            Nuevo
          </button>
        </div>

        <form onSubmit={guardarUsuario} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Usuario</label>
            <input
              type="text"
              name="usuario"
              value={formUsuario.usuario}
              onChange={handleUsuarioChange}
              className="mt-1 w-full rounded-2xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Contraseña {modoCrearUsuario ? "" : "(dejar vacía para no cambiar)"}
            </label>
            <input
              type="password"
              name="password"
              value={formUsuario.password}
              onChange={handleUsuarioChange}
              className="mt-1 w-full rounded-2xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Rol</label>
            <select
              name="rol_id"
              value={formUsuario.rol_id}
              onChange={handleUsuarioChange}
              className="mt-1 w-full rounded-2xl border px-4 py-3"
            >
              <option value="">Selecciona un rol</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.nombre}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activo"
              checked={formUsuario.activo}
              onChange={handleUsuarioChange}
            />
            Usuario activo
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-white disabled:opacity-60"
          >
            {loading ? "Guardando..." : modoCrearUsuario ? "Crear usuario" : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );

  const renderMenus = () => (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Menús</h2>
          <span className="text-sm text-slate-500">Pulsa un menú para editarlo</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {menus.map((item) => {
            const activo = !modoCrearMenu && formMenu.id === item.id;

            return (
              <button
                key={item.id}
                onClick={() => seleccionarMenu(item)}
                className={`rounded-3xl border p-5 text-left ${
                  activo ? "border-blue-600 bg-blue-50" : "border-slate-200"
                }`}
              >
                <p className="text-sm text-slate-500">Menú</p>
                <p className="text-xl font-bold">{item.nombre}</p>
                <div className="mt-3 space-y-1 text-sm text-slate-500">
                  <p>Coste: {Number(item.coste).toFixed(2)} €</p>
                  <p>Estado: {Number(item.activo) === 1 ? "Activo" : "Inactivo"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {modoCrearMenu ? "Crear menú" : "Editar menú"}
          </h2>
          <button
            onClick={() => nuevaEntidad("menu")}
            className="rounded-xl bg-slate-200 px-3 py-2 text-sm"
          >
            Nuevo
          </button>
        </div>

        <form onSubmit={guardarMenu} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formMenu.nombre}
              onChange={handleMenuChange}
              className="mt-1 w-full rounded-2xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Coste</label>
            <input
              type="number"
              step="0.01"
              name="coste"
              value={formMenu.coste}
              onChange={handleMenuChange}
              className="mt-1 w-full rounded-2xl border px-4 py-3"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activo"
              checked={formMenu.activo}
              onChange={handleMenuChange}
            />
            Menú activo
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-white disabled:opacity-60"
          >
            {loading ? "Guardando..." : modoCrearMenu ? "Crear menú" : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );

  const renderCategorias = () => (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Categorías</h2>
          <span className="text-sm text-slate-500">Pulsa una categoría para editarla</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {categorias.map((item) => {
            const activo = !modoCrearCategoria && formCategoria.id === item.id;

            return (
              <button
                key={item.id}
                onClick={() => seleccionarCategoria(item)}
                className={`rounded-3xl border p-5 text-left ${
                  activo ? "border-blue-600 bg-blue-50" : "border-slate-200"
                }`}
              >
                <p className="text-sm text-slate-500">Categoría</p>
                <p className="text-xl font-bold">{item.nombre}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {modoCrearCategoria ? "Crear categoría" : "Editar categoría"}
          </h2>
          <button
            onClick={() => nuevaEntidad("categoria")}
            className="rounded-xl bg-slate-200 px-3 py-2 text-sm"
          >
            Nuevo
          </button>
        </div>

        <form onSubmit={guardarCategoria} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formCategoria.nombre}
              onChange={handleCategoriaChange}
              className="mt-1 w-full rounded-2xl border px-4 py-3"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-white disabled:opacity-60"
          >
            {loading
              ? "Guardando..."
              : modoCrearCategoria
              ? "Crear categoría"
              : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );

  const renderAlergenos = () => (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Alérgenos</h2>
          <span className="text-sm text-slate-500">Pulsa un alérgeno para editarlo</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {alergenos.map((item) => {
            const activo = !modoCrearAlergeno && formAlergeno.id === item.id;

            return (
              <button
                key={item.id}
                onClick={() => seleccionarAlergeno(item)}
                className={`rounded-3xl border p-5 text-left ${
                  activo ? "border-blue-600 bg-blue-50" : "border-slate-200"
                }`}
              >
                <p className="text-sm text-slate-500">Alérgeno</p>
                <p className="text-xl font-bold">{item.nombre}</p>

                <p className="mt-2 break-all text-sm text-slate-500">
                  Icono: {item.icono || "Sin imagen"}
                </p>

                {item.icono && (
                  <img
                    src={`http://localhost/CTK/backCTK/${item.icono}`}
                    alt={item.nombre}
                    className="mt-3 h-16 w-16 rounded-xl object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {modoCrearAlergeno ? "Crear alérgeno" : "Editar alérgeno"}
          </h2>
          <button
            onClick={() => nuevaEntidad("alergeno")}
            className="rounded-xl bg-slate-200 px-3 py-2 text-sm"
          >
            Nuevo
          </button>
        </div>

        <form onSubmit={guardarAlergeno} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formAlergeno.nombre}
              onChange={handleAlergenoChange}
              className="mt-1 w-full rounded-2xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Imagen / icono del alérgeno</label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingAlergeno(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingAlergeno(false);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDraggingAlergeno(false);

                const file = e.dataTransfer.files?.[0];
                if (file) {
                  await procesarImagenAlergeno(file);
                }
              }}
              className={`mt-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                isDraggingAlergeno
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 bg-slate-50"
              }`}
            >
              <p className="text-sm text-slate-600">
                Arrastra una imagen aquí o selecciónala desde tu PC
              </p>

              <label className="mt-3 inline-block cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
                Seleccionar imagen
                <input
                  key={alergenoFileInputKey}
                  ref={alergenoFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await procesarImagenAlergeno(file);
                    }
                  }}
                  className="hidden"
                />
              </label>

              {subiendoImagenAlergeno && (
                <p className="mt-3 text-sm text-blue-600">Subiendo imagen...</p>
              )}

              {formAlergeno.icono && (
                <p className="mt-3 break-all text-xs text-slate-500">
                  Ruta guardada: {formAlergeno.icono}
                </p>
              )}

              {(previewImagenAlergeno || formAlergeno.icono) && (
                <div className="mt-4 space-y-3">
                  <img
                    src={
                      previewImagenAlergeno ||
                      `http://localhost/CTK/backCTK/${formAlergeno.icono}`
                    }
                    alt="Preview del alérgeno"
                    className="mx-auto h-24 w-24 rounded-2xl object-cover shadow"
                  />

                  <button
                    type="button"
                    onClick={limpiarImagenAlergeno}
                    className="rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700"
                  >
                    Quitar imagen
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-white disabled:opacity-60"
          >
            {loading
              ? "Guardando..."
              : modoCrearAlergeno
              ? "Crear alérgeno"
              : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );

  const renderProductos = () => (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Productos</h2>
          <span className="text-sm text-slate-500">Pulsa un producto para editarlo</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {productos.map((item) => {
            const activo = !modoCrearProducto && formProducto.id === item.id;

            return (
              <button
                key={item.id}
                onClick={() => seleccionarProducto(item)}
                className={`rounded-3xl border p-5 text-left ${
                  activo ? "border-blue-600 bg-blue-50" : "border-slate-200"
                }`}
              >
                <p className="text-sm text-slate-500">Producto</p>
                <p className="text-xl font-bold">{item.nombre}</p>

                <div className="mt-3 space-y-1 text-sm text-slate-500">
                  <p>Categoría: {item.categoriaNombre || getNombreCategoria(item.categoriaId)}</p>
                  <p>Precio: {Number(item.precio).toFixed(2)} €</p>
                  <p>Disponible: {Number(item.disponible) === 1 ? "Sí" : "No"}</p>
                  <p>Imagen: {item.imagen || "Sin imagen"}</p>
                  <p>
                    Alérgenos:{" "}
                    {(item.alergenos || []).length > 0
                      ? item.alergenos.map((a) => a.nombre).join(", ")
                      : "Sin alérgenos"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {modoCrearProducto ? "Crear producto" : "Editar producto"}
          </h2>
          <button
            onClick={() => nuevaEntidad("producto")}
            className="rounded-xl bg-slate-200 px-3 py-2 text-sm"
          >
            Nuevo
          </button>
        </div>

        <form onSubmit={guardarProducto} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formProducto.nombre}
              onChange={handleProductoChange}
              className="mt-1 w-full rounded-2xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Imagen del producto</label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragging(false);

                const file = e.dataTransfer.files?.[0];
                if (file) {
                  await procesarImagenProducto(file);
                }
              }}
              className={`mt-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 bg-slate-50"
              }`}
            >
              <p className="text-sm text-slate-600">
                Arrastra una imagen aquí o selecciónala desde tu PC
              </p>

              <label className="mt-3 inline-block cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
                Seleccionar imagen
                <input
                  key={fileInputKey}
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await procesarImagenProducto(file);
                    }
                  }}
                  className="hidden"
                />
              </label>

              {subiendoImagen && (
                <p className="mt-3 text-sm text-blue-600">Subiendo imagen...</p>
              )}

              {formProducto.imagen && (
                <p className="mt-3 break-all text-xs text-slate-500">
                  Ruta guardada: {formProducto.imagen}
                </p>
              )}

              {(previewImagen || formProducto.imagen) && (
                <div className="mt-4 space-y-3">
                  <img
                    src={
                      previewImagen ||
                      `http://localhost/CTK/backCTK/${formProducto.imagen}`
                    }
                    alt="Preview del producto"
                    className="mx-auto h-40 rounded-2xl object-cover shadow"
                  />

                  <button
                    type="button"
                    onClick={limpiarImagenProducto}
                    className="rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700"
                  >
                    Quitar imagen
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Categoría</label>
            <select
              name="categoriaId"
              value={formProducto.categoriaId}
              onChange={handleProductoChange}
              className="mt-1 w-full rounded-2xl border px-4 py-3"
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Precio</label>
            <input
              type="number"
              step="0.01"
              name="precio"
              value={formProducto.precio}
              onChange={handleProductoChange}
              className="mt-1 w-full rounded-2xl border px-4 py-3"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="disponible"
              checked={formProducto.disponible}
              onChange={handleProductoChange}
            />
            Producto disponible
          </label>

          <div>
            <label className="block text-sm font-medium">Alérgenos</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {alergenos.map((alergeno) => (
                <label
                  key={alergeno.id}
                  className="flex items-center gap-2 rounded-xl border p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={formProducto.alergenos.includes(Number(alergeno.id))}
                    onChange={() => toggleAlergenoProducto(Number(alergeno.id))}
                  />
                  <span>{alergeno.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-white disabled:opacity-60"
          >
            {loading
              ? "Guardando..."
              : modoCrearProducto
              ? "Crear producto"
              : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Panel administrador</p>
            <h1 className="text-3xl font-bold">Configuración CTK</h1>
            <p className="mt-1 text-slate-500">Usuario: {user?.usuario}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="rounded-xl bg-slate-200 px-4 py-2 text-slate-800"
              >
                Volver
              </button>
            )}

            <button
              onClick={onSalir}
              className="rounded-xl bg-slate-900 px-4 py-2 text-white"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Usuarios</p>
            <p className="mt-2 text-3xl font-bold">{resumen.usuarios}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Menús</p>
            <p className="mt-2 text-3xl font-bold">{resumen.menus}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Categorías</p>
            <p className="mt-2 text-3xl font-bold">{resumen.categorias}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Productos</p>
            <p className="mt-2 text-3xl font-bold">{resumen.productos}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setTab("usuarios")}
            className={`rounded-2xl px-4 py-2 ${
              tab === "usuarios" ? "bg-blue-600 text-white" : "bg-white text-slate-700"
            }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setTab("menus")}
            className={`rounded-2xl px-4 py-2 ${
              tab === "menus" ? "bg-blue-600 text-white" : "bg-white text-slate-700"
            }`}
          >
            Menús
          </button>
          <button
            onClick={() => setTab("categorias")}
            className={`rounded-2xl px-4 py-2 ${
              tab === "categorias" ? "bg-blue-600 text-white" : "bg-white text-slate-700"
            }`}
          >
            Categorías
          </button>
          <button
            onClick={() => setTab("alergenos")}
            className={`rounded-2xl px-4 py-2 ${
              tab === "alergenos" ? "bg-blue-600 text-white" : "bg-white text-slate-700"
            }`}
          >
            Alérgenos
          </button>
          <button
            onClick={() => setTab("productos")}
            className={`rounded-2xl px-4 py-2 ${
              tab === "productos" ? "bg-blue-600 text-white" : "bg-white text-slate-700"
            }`}
          >
            Productos
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">
            {mensaje}
          </div>
        )}

        <div className="mt-6">
          {tab === "usuarios" && renderUsuarios()}
          {tab === "menus" && renderMenus()}
          {tab === "categorias" && renderCategorias()}
          {tab === "alergenos" && renderAlergenos()}
          {tab === "productos" && renderProductos()}
        </div>
      </div>
    </div>
  );
}