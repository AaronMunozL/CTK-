/**
 * UsuarioView — interfaz de cliente para hacer pedidos desde la mesa.
 *
 * El cliente llega aquí tras validar el código de acceso de su mesa.
 * Props:
 *   - mesa: objeto con id, numero, estado, capacidad, numComensales, menuId
 *   - onSalir: callback para volver al inicio (cierra la sesión de mesa)
 *
 * Funcionalidades:
 *   - Carta: grid de productos filtrables por categoría, búsqueda y alérgenos.
 *     Solo se muestran los productos disponibles y pertenecientes al menú asignado.
 *   - Carrito: modal flotante con el resumen del pedido antes de confirmar.
 *   - Historial: modal con todos los pedidos realizados en esta mesa y el total.
 *   - Terminar mesa: libera la mesa y redirige al inicio.
 */
import { useEffect, useMemo, useState } from "react";
import {
  getProductos,
  crearPedidoUsuario,
  getImageUrl,
  getHistorialMesa,
  getMenus,
  terminarMesa,
} from "../../api";

function formatearPrecio(valor) {
  const numero = Number(valor || 0);
  return `${numero.toFixed(2)} €`;
}

function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha";
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function estadoMesaColor(estado) {
  switch (estado) {
    case "libre":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
    case "ocupada":
      return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
    case "mantenimiento":
      return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function chipColor(activo) {
  return activo
    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/15"
    : "bg-white text-slate-700 ring-1 ring-slate-200";
}

function estadoPedidoColor(estado) {
  switch (estado) {
    case "pendiente":
      return "bg-amber-100 text-amber-700";
    case "en preparacion":
      return "bg-blue-100 text-blue-700";
    case "listo":
      return "bg-emerald-100 text-emerald-700";
    case "servido":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function HeroIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-none stroke-current"
        strokeWidth="1.8"
      >
        <path d="M7 3v3" />
        <path d="M17 3v3" />
        <path d="M4 9h16" />
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M9 13h6" />
        <path d="M9 16h4" />
      </svg>
    </div>
  );
}

function EmptyPlate() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7 fill-none stroke-current"
        strokeWidth="1.6"
      >
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </div>
  );
}

export default function UsuarioView({
  user,
  mesa,
  onSalir,
  onMesaTerminada,
}) {
  const [loadingCarta, setLoadingCarta] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [terminandoMesa, setTerminandoMesa] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [productos, setProductos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [menus, setMenus] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [alergenosActivos, setAlergenosActivos] = useState([]);
  const [notas, setNotas] = useState("");
  const [cantidades, setCantidades] = useState({});

  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const categorias = useMemo(() => {
    const mapa = new Map();

    productos.forEach((producto) => {
      const id = String(producto.categoriaId ?? "sin-categoria");
      const nombre = producto.categoriaNombre || "Sin categoría";

      if (!mapa.has(id)) {
        mapa.set(id, { id, nombre });
      }
    });

    return [{ id: "todas", nombre: "Todo" }, ...Array.from(mapa.values())];
  }, [productos]);

  const alergenosDisponibles = useMemo(() => {
    const mapa = new Map();

    productos.forEach((producto) => {
      (producto.alergenos || []).forEach((alergeno) => {
        const id = Number(alergeno.id);

        if (!mapa.has(id)) {
          mapa.set(id, {
            id,
            nombre: alergeno.nombre,
          });
        }
      });
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [productos]);

  const menuAsignado = useMemo(() => {
    if (!mesa?.menuId) return null;
    return menus.find((menu) => Number(menu.id) === Number(mesa.menuId)) || null;
  }, [menus, mesa]);

  const numComensales = useMemo(() => {
    return Math.max(0, Number(mesa?.numComensales || 0));
  }, [mesa]);

  const costeMenuUnitario = useMemo(() => {
    return Number(menuAsignado?.coste || 0);
  }, [menuAsignado]);

  const costeMenuTotal = useMemo(() => {
    return costeMenuUnitario * numComensales;
  }, [costeMenuUnitario, numComensales]);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return productos.filter((producto) => {
      const coincideCategoria =
        categoriaActiva === "todas" ||
        String(producto.categoriaId) === String(categoriaActiva);

      const coincideBusqueda =
        texto === "" ||
        String(producto.nombre || "").toLowerCase().includes(texto) ||
        String(producto.categoriaNombre || "").toLowerCase().includes(texto);

      const disponible = Number(producto.disponible) === 1;

      const idsAlergenosProducto = (producto.alergenos || []).map((a) =>
        Number(a.id)
      );

      // Filtro de alérgenos: el usuario selecciona alérgenos que QUIERE incluir;
      // se muestran solo productos que los tengan todos (lógica AND)
      const coincideAlergenos =
        alergenosActivos.length === 0 ||
        alergenosActivos.every((id) => idsAlergenosProducto.includes(id));

      // Si la mesa tiene menú asignado solo se muestran productos de ese menú
      const coincideMenu =
        !mesa?.menuId ||
        !Array.isArray(producto.menuIds) ||
        producto.menuIds.includes(Number(mesa.menuId));

      return (
        coincideCategoria &&
        coincideBusqueda &&
        disponible &&
        coincideAlergenos &&
        coincideMenu
      );
    });
  }, [productos, categoriaActiva, busqueda, alergenosActivos, mesa]);

  // El carrito se deriva de `cantidades` (mapa productoId→cantidad) y la lista
  // de productos. Solo incluye ítems con cantidad > 0.
  const carrito = useMemo(() => {
    return productos
      .map((producto) => {
        const cantidad = Number(cantidades[producto.id] || 0);
        if (cantidad <= 0) return null;

        return {
          productoId: Number(producto.id),
          nombre: producto.nombre,
          precio: Number(producto.precio || 0),
          cantidad,
          subtotal: Number(producto.precio || 0) * cantidad,
          imagen: producto.imagen,
        };
      })
      .filter(Boolean);
  }, [productos, cantidades]);

  const totalItems = useMemo(
    () => carrito.reduce((acc, item) => acc + item.cantidad, 0),
    [carrito]
  );

  const totalPedido = useMemo(
    () => carrito.reduce((acc, item) => acc + item.subtotal, 0),
    [carrito]
  );

  const totalHistorialPedidos = useMemo(() => {
    return historial.reduce(
      (acc, item) => acc + Number(item.totalFacturado || 0),
      0
    );
  }, [historial]);

  const totalHistorialConMenu = useMemo(() => {
    return totalHistorialPedidos + costeMenuTotal;
  }, [totalHistorialPedidos, costeMenuTotal]);

  const limpiarMensajes = () => {
    setError("");
    setMensaje("");
  };

  const cargarCarta = async () => {
    try {
      setLoadingCarta(true);
      const res = await getProductos();
      setProductos(Array.isArray(res?.productos) ? res.productos : []);
    } catch (err) {
      setError(err.message || "No se pudo cargar la carta.");
    } finally {
      setLoadingCarta(false);
    }
  };

  const cargarMenus = async () => {
    try {
      setLoadingMenus(true);
      const res = await getMenus();
      setMenus(Array.isArray(res?.menus) ? res.menus : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los menús.");
    } finally {
      setLoadingMenus(false);
    }
  };

  const cargarHistorial = async () => {
    if (!mesa?.id) return;

    try {
      setLoadingHistorial(true);
      const res = await getHistorialMesa(Number(mesa.id));
      setHistorial(Array.isArray(res?.historial) ? res.historial : []);
    } catch (err) {
      setError(err.message || "No se pudo cargar el historial.");
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    cargarCarta();
    cargarMenus();
  }, []);

  const abrirHistorial = async () => {
    limpiarMensajes();
    setMostrarHistorial(true);
    await cargarHistorial();
  };

  const toggleAlergeno = (id) => {
    limpiarMensajes();

    setAlergenosActivos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const cambiarCantidad = (productoId, delta) => {
    limpiarMensajes();

    setCantidades((prev) => {
      const actual = Number(prev[productoId] || 0);
      const siguiente = Math.max(0, actual + delta);

      if (siguiente === 0) {
        const copia = { ...prev };
        delete copia[productoId];
        return copia;
      }

      return {
        ...prev,
        [productoId]: siguiente,
      };
    });
  };

  const enviarPedido = async () => {
    limpiarMensajes();

    if (!mesa?.id) {
      setError("No hay una mesa activa.");
      return;
    }

    if (carrito.length === 0) {
      setError("Añade al menos un producto al pedido.");
      return;
    }

    try {
      setEnviandoPedido(true);

      await crearPedidoUsuario({
        mesaId: Number(mesa.id),
        productos: carrito.map((item) => ({
          productoId: Number(item.productoId),
          cantidad: Number(item.cantidad),
          precio: Number(item.precio),
        })),
        notas: notas.trim(),
      });

      setCantidades({});
      setNotas("");
      setMostrarCarrito(false);
      setMensaje(
        `Pedido enviado correctamente. Total productos: ${formatearPrecio(
          totalPedido
        )}`
      );
      await cargarHistorial();
    } catch (err) {
      setError(err.message || "No se pudo enviar el pedido.");
    } finally {
      setEnviandoPedido(false);
    }
  };

  const handleTerminarMesa = async () => {
    limpiarMensajes();

    if (!mesa?.id) {
      setError("No hay una mesa activa.");
      return;
    }

    const confirmado = window.confirm(
      `¿Seguro que quieres terminar la mesa ${mesa.numero}?`
    );

    if (!confirmado) return;

    try {
      setTerminandoMesa(true);
      await terminarMesa(Number(mesa.id));
      setMensaje("La mesa se ha terminado correctamente.");

      if (typeof onMesaTerminada === "function") {
        onMesaTerminada();
        return;
      }

      if (typeof onSalir === "function") {
        onSalir();
      }
    } catch (err) {
      setError(err.message || "No se pudo terminar la mesa.");
    } finally {
      setTerminandoMesa(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 -mx-4 border-b border-white/60 bg-stone-50/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <HeroIcon />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Zona de usuario
                </p>
                <h1 className="truncate text-lg font-black sm:text-2xl">
                  Pedido desde mesa
                </h1>
                <p className="truncate text-sm text-slate-500">
                  Usuario: {user?.usuario || "Invitado"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleTerminarMesa}
                disabled={terminandoMesa}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {terminandoMesa ? "Terminando..." : "Terminar mesa"}
              </button>

              <button
                type="button"
                onClick={onSalir}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-2xl shadow-slate-900/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-300">
                  Mesa activa
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Mesa {String(mesa?.numero ?? "-").padStart(2, "0")}
                </h2>
                <p className="mt-3 max-w-xl text-sm text-slate-300">
                  Haz tu pedido cómodamente desde el móvil y envíalo directamente
                  a cocina.
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] ${estadoMesaColor(
                  mesa?.estado
                )}`}
              >
                {mesa?.estado || "sin estado"}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                  Capacidad
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {mesa?.capacidad ?? "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                  Comensales
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {numComensales}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                  Menú asignado
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {menuAsignado?.nombre ||
                    (mesa?.menuId ? `#${mesa.menuId}` : "Sin menú")}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                  Precio menú total
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {loadingMenus ? "Cargando..." : formatearPrecio(costeMenuTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200">
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Mesa y pedidos
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-900">
                  Consulta tu actividad
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Revisa el historial de pedidos realizados en esta mesa.
                </p>
              </div>

              <button
                type="button"
                onClick={abrirHistorial}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Ver historial
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {mensaje ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
            {mensaje}
          </div>
        ) : null}

        <section className="mt-6 rounded-[2rem] bg-white p-4 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Buscar plato
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o categoría"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
              />
            </div>

            <div className="w-full lg:max-w-[18rem]">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Notas del pedido
              </label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Sin cebolla, poco hecho..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">
              Categorías
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categorias.map((categoria) => (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() => setCategoriaActiva(categoria.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${chipColor(
                    String(categoriaActiva) === String(categoria.id)
                  )}`}
                >
                  {categoria.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">
                Filtrar por alérgenos
              </p>

              {alergenosActivos.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setAlergenosActivos([])}
                  className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  Limpiar filtros
                </button>
              ) : null}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {alergenosDisponibles.length === 0 ? (
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-500">
                  No hay alérgenos disponibles
                </span>
              ) : (
                alergenosDisponibles.map((alergeno) => (
                  <button
                    key={alergeno.id}
                    type="button"
                    onClick={() => toggleAlergeno(alergeno.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${chipColor(
                      alergenosActivos.includes(alergeno.id)
                    )}`}
                  >
                    {alergeno.nombre}
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 flex-1">
          {loadingCarta ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[2rem] bg-white shadow-lg ring-1 ring-slate-200"
                >
                  <div className="h-48 animate-pulse bg-slate-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[2rem] bg-white px-6 py-14 text-center shadow-xl shadow-slate-200/60 ring-1 ring-slate-200">
              <EmptyPlate />
              <h3 className="mt-5 text-xl font-black text-slate-900">
                No hay productos con esos filtros
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Cambia la búsqueda, la categoría o los alérgenos seleccionados.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {productosFiltrados.map((producto) => {
                const cantidad = Number(cantidades[producto.id] || 0);

                return (
                  <article
                    key={producto.id}
                    className="group overflow-hidden rounded-[2rem] bg-white shadow-lg shadow-slate-200/60 ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative h-52 overflow-hidden bg-slate-100">
                      {producto.imagen ? (
                        <img
                          src={getImageUrl(producto.imagen)}
                          alt={producto.nombre}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400">
                          <EmptyPlate />
                        </div>
                      )}

                      <div className="absolute left-4 top-4">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-700 shadow-sm backdrop-blur">
                          {producto.categoriaNombre}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black text-slate-900">
                            {producto.nombre}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatearPrecio(producto.precio)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                            Number(producto.disponible) === 1
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {Number(producto.disponible) === 1
                            ? "Disponible"
                            : "No disponible"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(producto.alergenos || []).length === 0 ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                            Sin alérgenos registrados
                          </span>
                        ) : (
                          producto.alergenos.map((alergeno) => (
                            <span
                              key={alergeno.id}
                              className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100"
                            >
                              {alergeno.nombre}
                            </span>
                          ))
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(producto.menuNombres || []).length === 0 ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                            Sin menús asignados
                          </span>
                        ) : (
                          producto.menuNombres.map((menuNombre) => (
                            <span
                              key={menuNombre}
                              className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100"
                            >
                              {menuNombre}
                            </span>
                          ))
                        )}
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <div className="flex items-center gap-3 rounded-full bg-slate-100 p-1">
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(producto.id, -1)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-slate-900 transition hover:bg-slate-900 hover:text-white"
                          >
                            -
                          </button>

                          <span className="min-w-[2rem] text-center text-sm font-black text-slate-900">
                            {cantidad}
                          </span>

                          <button
                            type="button"
                            onClick={() => cambiarCantidad(producto.id, 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-lg font-black text-white transition hover:bg-slate-800"
                          >
                            +
                          </button>
                        </div>

                        <p className="text-sm font-semibold text-slate-500">
                          {cantidad > 0
                            ? `Subtotal: ${formatearPrecio(
                                Number(producto.precio || 0) * cantidad
                              )}`
                            : "Añade unidades"}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Pedido actual
            </p>
            <p className="truncate text-sm text-slate-600">
              {totalItems} producto(s) añadidos
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Total productos
              </p>
              <p className="text-lg font-black text-slate-900">
                {formatearPrecio(totalPedido)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMostrarCarrito(true)}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
            >
              Ver pedido
            </button>
          </div>
        </div>
      </div>

      {mostrarCarrito ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Resumen
                </p>
                <h3 className="text-xl font-black text-slate-900">
                  Tu pedido
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setMostrarCarrito(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-900 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[58vh] overflow-y-auto px-5 py-4 sm:px-6">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <EmptyPlate />
                  <h4 className="mt-4 text-lg font-black text-slate-900">
                    Tu pedido está vacío
                  </h4>
                  <p className="mt-2 text-sm text-slate-500">
                    Añade productos desde la carta para enviar a cocina.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {carrito.map((item) => (
                    <div
                      key={item.productoId}
                      className="flex items-center gap-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        {item.imagen ? (
                          <img
                            src={getImageUrl(item.imagen)}
                            alt={item.nombre}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <EmptyPlate />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-base font-black text-slate-900">
                          {item.nombre}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatearPrecio(item.precio)} × {item.cantidad}
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          {formatearPrecio(item.subtotal)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 rounded-full bg-white p-1 ring-1 ring-slate-200">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.productoId, -1)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-base font-black text-slate-900 transition hover:bg-slate-900 hover:text-white"
                        >
                          -
                        </button>
                        <span className="min-w-[1.8rem] text-center text-sm font-black text-slate-900">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.productoId, 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-base font-black text-white transition hover:bg-slate-800"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 rounded-2xl bg-slate-900 p-5 text-white">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Productos</span>
                  <span>{totalItems}</span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base font-semibold">Total pedido</span>
                  <span className="text-2xl font-black">
                    {formatearPrecio(totalPedido)}
                  </span>
                </div>

                {notas.trim() ? (
                  <p className="mt-3 text-sm text-slate-300">
                    Notas: {notas.trim()}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={enviarPedido}
                disabled={carrito.length === 0 || enviandoPedido}
                className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviandoPedido ? "Enviando pedido..." : "Confirmar pedido"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mostrarHistorial ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Historial
                </p>
                <h3 className="text-xl font-black text-slate-900">
                  Pedidos de la mesa
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setMostrarHistorial(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-900 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4 sm:px-6">
              {loadingHistorial ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                    >
                      <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
                      <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              ) : historial.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <EmptyPlate />
                  <h4 className="mt-4 text-lg font-black text-slate-900">
                    Sin pedidos todavía
                  </h4>
                  <p className="mt-2 text-sm text-slate-500">
                    Cuando envíes pedidos, aparecerán aquí.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-100 px-4 py-3 ring-1 ring-slate-200">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Total pedidos
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        {formatearPrecio(totalHistorialPedidos)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-100 px-4 py-3 ring-1 ring-slate-200">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Menú total
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        {formatearPrecio(costeMenuTotal)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                        Total general
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {formatearPrecio(totalHistorialConMenu)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {historial.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[2rem] bg-slate-50 p-4 ring-1 ring-slate-200"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Pedido #{item.pedidoId || item.id}
                            </p>
                            <h4 className="mt-1 text-lg font-black text-slate-900">
                              {formatearFecha(item.fechaApertura || item.createdAt)}
                            </h4>
                          </div>

                          <div className="text-right">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${estadoPedidoColor(
                                item.pedidoEstado || item.estado
                              )}`}
                            >
                              {item.pedidoEstado || item.estado || "registrado"}
                            </span>
                            <p className="mt-2 text-sm font-black text-slate-900">
                              {formatearPrecio(item.totalFacturado)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Mesa
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {item.mesaNumero ?? mesa?.numero ?? "-"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Comensales
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {item.numComensales ?? mesa?.numComensales ?? 0}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Menú
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {menuAsignado?.nombre ||
                                (item.menuId || mesa?.menuId ? `#${item.menuId || mesa?.menuId}` : "Sin menú")}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          {(item.lineas || []).length === 0 ? (
                            <p className="text-sm text-slate-500">
                              Sin líneas registradas.
                            </p>
                          ) : (
                            item.lineas.map((linea) => (
                              <div
                                key={linea.id}
                                className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    {linea.productoNombre}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatearPrecio(linea.precioUnitario)} × {linea.cantidad}
                                    {linea.observaciones
                                      ? ` · ${linea.observaciones}`
                                      : ""}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${estadoPedidoColor(
                                    linea.estado
                                  )}`}
                                >
                                  {linea.estado || "pendiente"}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}