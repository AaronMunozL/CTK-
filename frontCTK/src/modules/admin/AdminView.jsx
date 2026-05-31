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
  eliminarMenu,
  getCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  getAlergenos,
  crearAlergeno,
  actualizarAlergeno,
  eliminarAlergeno,
  getProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  getMesas,
  crearMesa,
  actualizarMesa,
  eliminarMesa,
  generarCodigoMesa,
  resetearCodigoMesa,
  subirImagenProducto,
  getImageUrl,
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
};

const productoInicial = {
  id: null,
  nombre: "",
  imagen: "",
  categoriaId: "",
  disponible: true,
  precio: "",
  alergenos: [],
  menus: [],
};

const mesaInicial = {
  id: null,
  numero: "",
  capacidad: "",
  numComensales: 0,
  menuId: "",
  estado: "libre",
  codigoAcceso: "",
  codigoActivo: 0,
  codigoGeneradoAt: null,
};

const tabs = [
  { key: "usuarios", label: "Usuarios" },
  { key: "menus", label: "Menús" },
  { key: "categorias", label: "Categorías" },
  { key: "alergenos", label: "Alérgenos" },
  { key: "productos", label: "Productos" },
  { key: "mesas", label: "Mesas" },
];

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

  const [mesas, setMesas] = useState([]);
  const [formMesa, setFormMesa] = useState(mesaInicial);
  const [modoCrearMesa, setModoCrearMesa] = useState(true);

  const fileInputRef = useRef(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [isDragging, setIsDragging] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [previewImagen, setPreviewImagen] = useState("");


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
    try {
      const res = await getMenus();
      setMenus(Array.isArray(res?.menus) ? res.menus : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los menús.");
    }
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

  const cargarMesas = async () => {
    const res = await getMesas();
    setMesas(res.mesas || []);
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
        cargarMesas(),
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
      if (previewImagen) URL.revokeObjectURL(previewImagen);
    };
  }, [previewImagen]);

  const resumen = useMemo(
    () => ({
      usuarios: usuarios.length,
      menus: menus.length,
      categorias: categorias.length,
      alergenos: alergenos.length,
      productos: productos.length,
      mesas: mesas.length,
    }),
    [usuarios, menus, categorias, alergenos, productos, mesas]
  );

  const getNombreCategoria = (categoriaId) => {
    const categoria = categorias.find((c) => Number(c.id) === Number(categoriaId));
    return categoria ? categoria.nombre : "-";
  };

  const getNombreMenu = (menuId) => {
    if (!menuId) return "Sin menú";
    const menu = menus.find((m) => Number(m.id) === Number(menuId));
    return menu ? menu.nombre : "Sin menú";
  };

  const formatearFecha = (valor) => {
    if (!valor) return "-";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return fecha.toLocaleString("es-ES");
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

  const handleMesaChange = (e) => {
    const { name, value } = e.target;
    setFormMesa((prev) => ({
      ...prev,
      [name]: value,
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

  const toggleMenuProducto = (menuId) => {
    setFormProducto((prev) => {
      const existe = prev.menus.includes(menuId);
      return {
        ...prev,
        menus: existe
          ? prev.menus.filter((id) => id !== menuId)
          : [...prev.menus, menuId],
      };
    });
  };

  const limpiarImagenProducto = () => {
    if (previewImagen) URL.revokeObjectURL(previewImagen);
    setPreviewImagen("");
    setFormProducto((prev) => ({ ...prev, imagen: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileInputKey(Date.now());
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

      if (previewImagen) URL.revokeObjectURL(previewImagen);
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
      setFormAlergeno(alergenoInicial);
    }

    if (tipo === "producto") {
      setModoCrearProducto(true);
      if (previewImagen) URL.revokeObjectURL(previewImagen);
      setPreviewImagen("");
      setFormProducto(productoInicial);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFileInputKey(Date.now());
    }

    if (tipo === "mesa") {
      setModoCrearMesa(true);
      setFormMesa(mesaInicial);
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
    setModoCrearAlergeno(false);
    setFormAlergeno({
      id: item.id,
      nombre: item.nombre,
    });
  };

  const seleccionarProducto = (item) => {
    limpiarMensajes();

    if (previewImagen) URL.revokeObjectURL(previewImagen);
    setPreviewImagen("");

    if (fileInputRef.current) fileInputRef.current.value = "";
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
      menus: Array.isArray(item.menuIds) ? item.menuIds.map(Number) : [],
    });
  };

  const seleccionarMesa = (item) => {
    limpiarMensajes();
    setModoCrearMesa(false);
    setFormMesa({
      id: item.id,
      numero: item.numero ?? "",
      capacidad: item.capacidad ?? "",
      numComensales: item.numComensales ?? 0,
      menuId: item.menuId ?? "",
      estado: item.estado ?? "libre",
      codigoAcceso: item.codigoAcceso || "",
      codigoActivo: Number(item.codigoActivo) || 0,
      codigoGeneradoAt: item.codigoGeneradoAt || null,
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
      };

      if (modoCrearAlergeno) {
        await crearAlergeno(payload);
        setMensaje("Alérgeno creado correctamente.");
        setFormAlergeno(alergenoInicial);
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
        imagen: (formProducto.imagen || "").trim(),
        categoriaId: Number(formProducto.categoriaId),
        disponible: formProducto.disponible ? 1 : 0,
        precio: Number(formProducto.precio),
        alergenos: (formProducto.alergenos || []).map(Number),
        menus: (formProducto.menus || []).map(Number),
      };

      if (modoCrearProducto) {
        await crearProducto(payload);
        setMensaje("Producto creado correctamente.");

        if (previewImagen) URL.revokeObjectURL(previewImagen);
        setPreviewImagen("");
        setFormProducto(productoInicial);

        if (fileInputRef.current) fileInputRef.current.value = "";
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
      setError(err.message || "No se pudo guardar el producto.");
    } finally {
      setLoading(false);
    }
  };

  const guardarMesa = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!formMesa.numero || !formMesa.capacidad || !formMesa.estado) {
      setError("Número, capacidad y estado son obligatorios.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        numero: Number(formMesa.numero),
        capacidad: Number(formMesa.capacidad),
        numComensales: Number(formMesa.numComensales || 0),
        menuId: formMesa.menuId === "" ? null : Number(formMesa.menuId),
        estado: formMesa.estado,
      };

      if (modoCrearMesa) {
        await crearMesa(payload);
        setMensaje("Mesa creada correctamente.");
        setFormMesa(mesaInicial);
      } else {
        await actualizarMesa({
          id: formMesa.id,
          ...payload,
        });
        setMensaje("Mesa actualizada correctamente.");
      }

      await cargarMesas();
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
      await toggleUsuario(item.id, Number(item.activo) === 1 ? 0 : 1);
      setMensaje("Estado del usuario actualizado.");
      await cargarUsuarios();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarCodigoMesa = async (mesaId) => {
    limpiarMensajes();

    try {
      setLoading(true);
      const res = await generarCodigoMesa(mesaId);
      const codigo = res?.mesa?.codigoAcceso || "";

      setMensaje(
        codigo
          ? `Código generado correctamente: ${codigo}`
          : "Código generado correctamente."
      );

      await cargarMesas();

      if (!modoCrearMesa && Number(formMesa.id) === Number(mesaId)) {
        const actualizada = (await getMesas()).mesas?.find(
          (m) => Number(m.id) === Number(mesaId)
        );
        if (actualizada) seleccionarMesa(actualizada);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetearCodigoMesa = async (mesaId) => {
    const ok = window.confirm("¿Seguro que quieres invalidar el código actual de esta mesa?");
    if (!ok) return;

    limpiarMensajes();

    try {
      setLoading(true);
      await resetearCodigoMesa(mesaId);
      setMensaje("Código reseteado correctamente.");
      await cargarMesas();

      if (!modoCrearMesa && Number(formMesa.id) === Number(mesaId)) {
        const actualizada = (await getMesas()).mesas?.find(
          (m) => Number(m.id) === Number(mesaId)
        );
        if (actualizada) seleccionarMesa(actualizada);
      }
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

  const borrarMenu = async (item) => {
    const ok = window.confirm(`¿Eliminar el menú "${item.nombre}"?`);
    if (!ok) return;

    limpiarMensajes();

    try {
      setLoading(true);
      await eliminarMenu(item.id);
      setMensaje("Menú eliminado correctamente.");
      setFormMenu(menuInicial);
      setModoCrearMenu(true);
      await cargarMenus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const borrarCategoria = async (item) => {
    const ok = window.confirm(`¿Eliminar la categoría "${item.nombre}"?`);
    if (!ok) return;

    limpiarMensajes();

    try {
      setLoading(true);
      await eliminarCategoria(item.id);
      setMensaje("Categoría eliminada correctamente.");
      setFormCategoria(categoriaInicial);
      setModoCrearCategoria(true);
      await cargarCategorias();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const borrarAlergeno = async (item) => {
    const ok = window.confirm(`¿Eliminar el alérgeno "${item.nombre}"?`);
    if (!ok) return;

    limpiarMensajes();

    try {
      setLoading(true);
      await eliminarAlergeno(item.id);
      setMensaje("Alérgeno eliminado correctamente.");
      setFormAlergeno(alergenoInicial);
      setModoCrearAlergeno(true);

      await cargarAlergenos();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const borrarProducto = async (item) => {
    const ok = window.confirm(`¿Eliminar el producto "${item.nombre}"?`);
    if (!ok) return;

    limpiarMensajes();

    try {
      setLoading(true);
      await eliminarProducto(item.id);
      setMensaje("Producto eliminado correctamente.");
      setFormProducto(productoInicial);
      setModoCrearProducto(true);

      if (previewImagen) URL.revokeObjectURL(previewImagen);
      setPreviewImagen("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFileInputKey(Date.now());

      await cargarProductos();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const borrarMesa = async (item) => {
    const ok = window.confirm(`¿Eliminar la mesa "${item.numero}"?`);
    if (!ok) return;

    limpiarMensajes();

    try {
      setLoading(true);
      await eliminarMesa(item.id);
      setMensaje("Mesa eliminada correctamente.");
      setFormMesa(mesaInicial);
      setModoCrearMesa(true);
      await cargarMesas();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefrescar = async () => {
    await cargarTodo();
  };

  const renderUsuarios = () => (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Administración
            </p>
            <h2 className="text-2xl font-black text-slate-900">Panel general</h2>
          </div>

          <button
            type="button"
            onClick={handleRefrescar}
            disabled={loading}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refrescando..." : "Refrescar"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Usuarios</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{resumen.usuarios}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Menús</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{resumen.menus}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Categorías</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{resumen.categorias}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Alérgenos</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{resumen.alergenos}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Productos</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{resumen.productos}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Mesas</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{resumen.mesas}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-700">Usuario actual</p>
          <p className="mt-1 text-base text-slate-900">{user?.usuario || "-"}</p>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Gestión</p>
            <h3 className="text-xl font-black text-slate-900">Usuarios</h3>
          </div>

          <button
            type="button"
            onClick={() => nuevaEntidad("usuario")}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Nuevo
          </button>
        </div>

        <form onSubmit={guardarUsuario} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Usuario</label>
            <input
              type="text"
              name="usuario"
              value={formUsuario.usuario}
              onChange={handleUsuarioChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {modoCrearUsuario ? "Contraseña" : "Nueva contraseña (opcional)"}
            </label>
            <input
              type="password"
              name="password"
              value={formUsuario.password}
              onChange={handleUsuarioChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Rol</label>
            <select
              name="rol_id"
              value={formUsuario.rol_id}
              onChange={handleUsuarioChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            >
              <option value="">Selecciona un rol</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.nombre}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
            <input
              type="checkbox"
              name="activo"
              checked={formUsuario.activo}
              onChange={handleUsuarioChange}
            />
            <span className="text-sm font-medium text-slate-700">Usuario activo</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {modoCrearUsuario ? "Crear usuario" : "Guardar cambios"}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {usuarios.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-black text-slate-900">{item.usuario}</h4>
                  <p className="text-sm text-slate-500">Rol: {item.rol}</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                    Number(item.activo) === 1
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {Number(item.activo) === 1 ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => seleccionarUsuario(item)}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => cambiarEstadoUsuario(item)}
                  className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  {Number(item.activo) === 1 ? "Desactivar" : "Activar"}
                </button>

                <button
                  type="button"
                  onClick={() => borrarUsuario(item)}
                  className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderMenus = () => (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Gestión</p>
            <h3 className="text-xl font-black text-slate-900">Menús</h3>
          </div>

          <button
            type="button"
            onClick={() => nuevaEntidad("menu")}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Nuevo
          </button>
        </div>

        <form onSubmit={guardarMenu} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formMenu.nombre}
              onChange={handleMenuChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Coste</label>
            <input
              type="number"
              step="0.01"
              name="coste"
              value={formMenu.coste}
              onChange={handleMenuChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
            <input
              type="checkbox"
              name="activo"
              checked={formMenu.activo}
              onChange={handleMenuChange}
            />
            <span className="text-sm font-medium text-slate-700">Menú activo</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {modoCrearMenu ? "Crear menú" : "Guardar cambios"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-3">
          {menus.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-black text-slate-900">{item.nombre}</h4>
                  <p className="text-sm text-slate-500">{Number(item.coste).toFixed(2)} €</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                    Number(item.activo) === 1
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {Number(item.activo) === 1 ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => seleccionarMenu(item)}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => borrarMenu(item)}
                  className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderCategorias = () => (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900">Categorías</h3>
          <button
            type="button"
            onClick={() => nuevaEntidad("categoria")}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Nueva
          </button>
        </div>

        <form onSubmit={guardarCategoria} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formCategoria.nombre}
              onChange={handleCategoriaChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {modoCrearCategoria ? "Crear categoría" : "Guardar cambios"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-3">
          {categorias.map((item) => (
            <article
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div>
                <h4 className="text-base font-black text-slate-900">{item.nombre}</h4>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => seleccionarCategoria(item)}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => borrarCategoria(item)}
                  className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderAlergenos = () => (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900">Alérgenos</h3>
          <button
            type="button"
            onClick={() => nuevaEntidad("alergeno")}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Nuevo
          </button>
        </div>

        <form onSubmit={guardarAlergeno} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formAlergeno.nombre}
              onChange={handleAlergenoChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>



          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {modoCrearAlergeno ? "Crear alérgeno" : "Guardar cambios"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-3">
          {alergenos.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-black text-slate-900">{item.nombre}</h4>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => seleccionarAlergeno(item)}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => borrarAlergeno(item)}
                  className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderProductos = () => (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900">Productos</h3>
          <button
            type="button"
            onClick={() => nuevaEntidad("producto")}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Nuevo
          </button>
        </div>

        <form onSubmit={guardarProducto} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formProducto.nombre}
              onChange={handleProductoChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Categoría</label>
            <select
              name="categoriaId"
              value={formProducto.categoriaId}
              onChange={handleProductoChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
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
            <label className="mb-2 block text-sm font-medium text-slate-700">Precio</label>
            <input
              type="number"
              step="0.01"
              name="precio"
              value={formProducto.precio}
              onChange={handleProductoChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
            <input
              type="checkbox"
              name="disponible"
              checked={formProducto.disponible}
              onChange={handleProductoChange}
            />
            <span className="text-sm font-medium text-slate-700">Disponible</span>
          </label>

          <div>
            <p className="mb-2 block text-sm font-medium text-slate-700">Alérgenos</p>
            <div className="flex flex-wrap gap-2">
              {alergenos.map((alergeno) => {
                const activo = formProducto.alergenos.includes(Number(alergeno.id));

                return (
                  <button
                    key={alergeno.id}
                    type="button"
                    onClick={() => toggleAlergenoProducto(Number(alergeno.id))}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activo
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    {alergeno.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 block text-sm font-medium text-slate-700">Menús en los que aparece</p>
            <div className="flex flex-wrap gap-2">
              {menus.map((menu) => {
                const activo = formProducto.menus.includes(Number(menu.id));

                return (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => toggleMenuProducto(Number(menu.id))}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activo
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    {menu.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              procesarImagenProducto(file);
            }}
            className={`rounded-2xl border-2 border-dashed p-4 text-center transition ${
              isDragging ? "border-slate-900 bg-slate-100" : "border-slate-300 bg-slate-50"
            }`}
          >
            <input
              key={fileInputKey}
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => procesarImagenProducto(e.target.files?.[0])}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {subiendoImagen ? "Subiendo..." : "Subir imagen"}
            </button>

            <p className="mt-2 text-sm text-slate-500">
              Arrastra una imagen aquí o pulsa para seleccionar.
            </p>

            {(previewImagen || formProducto.imagen) && (
              <div className="mt-4">
                <img
                  src={previewImagen || getImageUrl(formProducto.imagen)}
                  alt="Preview producto"
                  className="mx-auto h-28 w-28 rounded-2xl object-cover ring-1 ring-slate-200"
                />

                <button
                  type="button"
                  onClick={limpiarImagenProducto}
                  className="mt-3 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Quitar imagen
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {modoCrearProducto ? "Crear producto" : "Guardar cambios"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-3">
          {productos.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div className="flex gap-4">
                {item.imagen ? (
                  <img
                    src={getImageUrl(item.imagen)}
                    alt={item.nombre}
                    className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-200 text-xs text-slate-500">
                    Sin imagen
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-black text-slate-900">{item.nombre}</h4>
                  <p className="text-sm text-slate-500">
                    Categoría: {getNombreCategoria(item.categoriaId)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Precio: {Number(item.precio).toFixed(2)} €
                  </p>
                  <p className="text-sm text-slate-500">
                    Estado: {Number(item.disponible) === 1 ? "Disponible" : "No disponible"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(item.alergenos || []).map((a) => (
                  <span
                    key={a.id}
                    className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100"
                  >
                    {a.nombre}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(item.menuNombres || []).map((nombre, idx) => (
                  <span
                    key={`${item.id}-menu-${idx}`}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100"
                  >
                    {nombre}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => seleccionarProducto(item)}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => borrarProducto(item)}
                  className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderMesas = () => (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900">Mesas</h3>
          <button
            type="button"
            onClick={() => nuevaEntidad("mesa")}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Nueva
          </button>
        </div>

        <form onSubmit={guardarMesa} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Número</label>
            <input
              type="number"
              name="numero"
              value={formMesa.numero}
              onChange={handleMesaChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Capacidad</label>
            <input
              type="number"
              name="capacidad"
              value={formMesa.capacidad}
              onChange={handleMesaChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Comensales actuales
            </label>
            <input
              type="number"
              name="numComensales"
              value={formMesa.numComensales}
              onChange={handleMesaChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Menú asignado</label>
            <select
              name="menuId"
              value={formMesa.menuId}
              onChange={handleMesaChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            >
              <option value="">Sin menú</option>
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Estado</label>
            <select
              name="estado"
              value={formMesa.estado}
              onChange={handleMesaChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            >
              <option value="libre">Libre</option>
              <option value="ocupada">Ocupada</option>
              <option value="mantenimiento">Mantenimiento</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {modoCrearMesa ? "Crear mesa" : "Guardar cambios"}
          </button>
        </form>

        {!modoCrearMesa && formMesa.id ? (
          <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-700">Código acceso</p>
              <p className="mt-1 font-mono text-lg font-black text-slate-900">
                {formMesa.codigoAcceso || "Sin código"}
              </p>
              <p className="text-sm text-slate-500">
                Generado: {formatearFecha(formMesa.codigoGeneradoAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGenerarCodigoMesa(formMesa.id)}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Generar código
              </button>

              <button
                type="button"
                onClick={() => handleResetearCodigoMesa(formMesa.id)}
                className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Resetear código
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-3">
          {mesas.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-black text-slate-900">Mesa {item.numero}</h4>
                  <p className="text-sm text-slate-500">Capacidad: {item.capacidad}</p>
                  <p className="text-sm text-slate-500">
                    Comensales: {item.numComensales ?? 0}
                  </p>
                  <p className="text-sm text-slate-500">
                    Menú: {getNombreMenu(item.menuId)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Código: {item.codigoAcceso || "Sin código"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Generado: {formatearFecha(item.codigoGeneradoAt)}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                    item.estado === "libre"
                      ? "bg-emerald-100 text-emerald-700"
                      : item.estado === "ocupada"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {item.estado}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => seleccionarMesa(item)}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerarCodigoMesa(item.id)}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Generar código
                </button>

                <button
                  type="button"
                  onClick={() => handleResetearCodigoMesa(item.id)}
                  className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Resetear código
                </button>

                <button
                  type="button"
                  onClick={() => borrarMesa(item)}
                  className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Panel administrador</p>
            <h1 className="text-3xl font-bold text-slate-900">Administración</h1>
            <p className="mt-1 text-slate-500">Usuario: {user?.usuario}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefrescar}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refrescando..." : "Refrescar"}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="rounded-xl bg-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-300"
            >
              Volver
            </button>

            <button
              type="button"
              onClick={onSalir}
              className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                tab === item.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mb-6 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Cargando datos...
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {mensaje ? (
          <div className="mb-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {mensaje}
          </div>
        ) : null}

        {tab === "usuarios" && renderUsuarios()}
        {tab === "menus" && renderMenus()}
        {tab === "categorias" && renderCategorias()}
        {tab === "alergenos" && renderAlergenos()}
        {tab === "productos" && renderProductos()}
        {tab === "mesas" && renderMesas()}
      </div>
    </div>
  );
}