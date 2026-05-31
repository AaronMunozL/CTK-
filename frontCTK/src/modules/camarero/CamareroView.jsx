/**
 * CamareroView — panel del personal de sala.
 *
 * Pestañas:
 *   - Mesas: visión general del estado de todas las mesas. Al seleccionar
 *     una mesa se activa el formulario de nuevo pedido a la derecha.
 *   - Pedidos: listado de pedidos con filtro por estado y detalle de líneas.
 *     El camarero puede cambiar el estado del pedido y de cada línea.
 *
 * Estados del pedido:  pendiente → en preparacion → listo
 * Estados de una línea: pendiente → en preparacion → lista → servido
 */
import { useEffect, useMemo, useState } from "react";
import {
  getMesas,
  getMenus,
  getProductos,
  getPedidosCocina,
  crearPedidoUsuario,
  actualizarEstadoPedido,
  actualizarEstadoLineaPedido,
} from "../../api";

const pedidoInicial = {
  mesaId: "",
  productos: [],
  notas: "",
};

const lineaInicial = {
  productoId: "",
  cantidad: 1,
  precio: 0,
  observaciones: "",
};

export default function CamareroView({ user, onSalir, onBack }) {
  const [mesas, setMesas] = useState([]);
  const [menus, setMenus] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [tab, setTab] = useState("mesas");
  const [mesaActiva, setMesaActiva] = useState(null);
  const [pedidoForm, setPedidoForm] = useState(pedidoInicial);
  const [lineaForm, setLineaForm] = useState(lineaInicial);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("activos");

  const limpiarMensajes = () => {
    setMensaje("");
    setError("");
  };

  const formatearFecha = (valor) => {
    if (!valor) return "-";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return fecha.toLocaleString("es-ES");
  };

  // Funciones de carga individuales con try/catch propio para que los errores
  // sean visibles al usuario cuando se llaman en solitario (ej. tras crear pedido)
  const cargarMesas = async () => {
    try {
      const res = await getMesas();
      setMesas(res.mesas || []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las mesas.");
    }
  };

  const cargarMenus = async () => {
    try {
      const res = await getMenus();
      setMenus(res.menus || []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los menús.");
    }
  };

  const cargarProductos = async () => {
    try {
      const res = await getProductos();
      setProductos(res.productos || []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los productos.");
    }
  };

  const cargarPedidos = async () => {
    try {
      const res = await getPedidosCocina();
      setPedidos(res.pedidos || []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los pedidos.");
    }
  };

  const cargarTodo = async () => {
    try {
      setLoading(true);
      limpiarMensajes();
      await Promise.all([cargarMesas(), cargarMenus(), cargarProductos(), cargarPedidos()]);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const resumen = useMemo(() => {
    const pedidosActivos = pedidos.filter((p) =>
      ["pendiente", "en preparacion", "listo"].includes(p.estado)
    );

    return {
      mesas: mesas.length,
      libres: mesas.filter((m) => m.estado === "libre").length,
      ocupadas: mesas.filter((m) => m.estado === "ocupada").length,
      reservadas: mesas.filter((m) => m.estado === "reservada").length,
      pedidos: pedidos.length,
      activos: pedidosActivos.length,
    };
  }, [mesas, pedidos]);

  const getNombreMenu = (menuId) => {
    if (menuId === null || menuId === "" || menuId === undefined) return "Sin asignar";
    const menu = menus.find((m) => Number(m.id) === Number(menuId));
    return menu ? menu.nombre : "Sin asignar";
  };

  const getProductoPorId = (id) =>
    productos.find((p) => Number(p.id) === Number(id));

  const getEstadoBadge = (estado) => {
    if (estado === "pendiente") return "bg-amber-100 text-amber-700";
    if (estado === "en preparacion") return "bg-blue-100 text-blue-700";
    if (estado === "listo" || estado === "lista") return "bg-emerald-100 text-emerald-700";
    if (estado === "servido") return "bg-slate-200 text-slate-700";
    return "bg-slate-100 text-slate-700";
  };

  const getEstadoMesaBadge = (estado) => {
    if (estado === "libre") return "bg-emerald-100 text-emerald-700";
    if (estado === "ocupada") return "bg-amber-100 text-amber-700";
    if (estado === "reservada") return "bg-blue-100 text-blue-700";
    if (estado === "mantenimiento") return "bg-rose-100 text-rose-700";
    return "bg-slate-100 text-slate-700";
  };

  const seleccionarMesa = (mesa) => {
    setMesaActiva(mesa);
    setPedidoSeleccionado(null);
    setPedidoForm({
      mesaId: mesa.id,
      productos: [],
      notas: "",
    });
    setLineaForm(lineaInicial);
    limpiarMensajes();
  };

  const agregarLinea = () => {
    if (!lineaForm.productoId || Number(lineaForm.cantidad) <= 0) {
      setError("Selecciona un producto y una cantidad válida.");
      return;
    }

    const producto = getProductoPorId(lineaForm.productoId);

    if (!producto) {
      setError("El producto seleccionado no existe.");
      return;
    }

    const cantidad = Number(lineaForm.cantidad);
    const precio = Number(producto.precio || 0);

    setPedidoForm((prev) => ({
      ...prev,
      productos: [
        ...prev.productos,
        {
          productoId: Number(producto.id),
          nombre: producto.nombre,
          cantidad,
          precio,
          observaciones: lineaForm.observaciones.trim(),
        },
      ],
    }));

    setLineaForm(lineaInicial);
    setError("");
  };

  const eliminarLinea = (index) => {
    setPedidoForm((prev) => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index),
    }));
  };

  const guardarPedido = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!pedidoForm.mesaId) {
      setError("Debes seleccionar una mesa.");
      return;
    }

    if (!pedidoForm.productos.length) {
      setError("Añade al menos un producto al pedido.");
      return;
    }

    try {
      setLoading(true);

      await crearPedidoUsuario({
        mesaId: Number(pedidoForm.mesaId),
        productos: pedidoForm.productos.map((linea) => ({
          productoId: Number(linea.productoId),
          cantidad: Number(linea.cantidad),
          precio: Number(linea.precio),
          observaciones: linea.observaciones || "",
        })),
        notas: pedidoForm.notas.trim(),
      });

      setMensaje("Pedido creado correctamente.");
      setPedidoForm(pedidoInicial);
      setLineaForm(lineaInicial);
      setMesaActiva(null);
      await cargarMesas();
      await cargarPedidos();
    } catch (err) {
      setError(err.message || "No se pudo crear el pedido.");
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstadoPedido = async (pedido, estado) => {
    limpiarMensajes();

    try {
      setLoading(true);
      await actualizarEstadoPedido({
        id: pedido.id,
        estado,
      });

      setMensaje(`Pedido marcado como ${estado}.`);
      await cargarPedidos();

      if (pedidoSeleccionado && Number(pedidoSeleccionado.id) === Number(pedido.id)) {
        const res = await getPedidosCocina();
        const actual = res.pedidos?.find((p) => Number(p.id) === Number(pedido.id));
        setPedidoSeleccionado(actual || null);
      }
    } catch (err) {
      setError(err.message || "No se pudo actualizar el pedido.");
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstadoLinea = async (lineaId, estado) => {
    limpiarMensajes();

    try {
      setLoading(true);
      await actualizarEstadoLineaPedido({
        id: lineaId,
        estado,
      });

      setMensaje("Línea actualizada correctamente.");
      const res = await getPedidosCocina();
      setPedidos(res.pedidos || []);

      if (pedidoSeleccionado) {
        const actualizado = res.pedidos?.find(
          (p) => Number(p.id) === Number(pedidoSeleccionado.id)
        );
        if (actualizado) setPedidoSeleccionado(actualizado);
      }
    } catch (err) {
      setError(err.message || "No se pudo actualizar la línea.");
    } finally {
      setLoading(false);
    }
  };

  const verPedido = async (pedido) => {
    setPedidoSeleccionado(pedido);
    setTab("pedidos");
    limpiarMensajes();
  };

  const pedidosFiltrados = useMemo(() => {
    // 'activos' agrupa los tres estados intermedios que requieren atención
    if (filtroEstado === "activos") {
      return pedidos.filter((p) =>
        ["pendiente", "en preparacion", "listo"].includes(p.estado)
      );
    }

    if (filtroEstado === "todos") return pedidos;

    return pedidos.filter((p) => p.estado === filtroEstado);
  }, [pedidos, filtroEstado]);

  const totalPedidoSeleccionado = useMemo(() => {
    if (!pedidoSeleccionado?.lineas?.length) return 0;

    return pedidoSeleccionado.lineas.reduce(
      (acc, linea) =>
        acc +
        Number(linea.precioUnitario || linea.precio || 0) *
          Number(linea.cantidad || 0),
      0
    );
  }, [pedidoSeleccionado]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Panel camarero</p>
            <h1 className="text-3xl font-bold text-slate-900">Servicio de mesas</h1>
            <p className="mt-1 text-slate-500">Usuario: {user?.usuario}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cargarTodo}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Refrescando..." : "Refrescar"}
            </button>

            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl bg-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-300"
              >
                Volver
              </button>
            ) : null}

            <button
              type="button"
              onClick={onSalir}
              className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Mesas</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{resumen.mesas}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Libres</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{resumen.libres}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Ocupadas</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{resumen.ocupadas}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Reservadas</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{resumen.reservadas}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Pedidos</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{resumen.pedidos}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Activos</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{resumen.activos}</p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</div>
        ) : null}

        {mensaje ? (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">{mensaje}</div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { key: "mesas", label: "Mesas" },
            { key: "pedidos", label: "Pedidos" },
          ].map((item) => (
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

        {tab === "mesas" ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Mesas</h2>
                  <p className="text-sm text-slate-500">
                    Selecciona una mesa para abrir pedido
                  </p>
                </div>
                <span className="text-sm text-slate-500">{mesas.length} registradas</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mesas.map((mesa) => {
                  const activa =
                    mesaActiva && Number(mesaActiva.id) === Number(mesa.id);

                  return (
                    <button
                      key={mesa.id}
                      type="button"
                      onClick={() => seleccionarMesa(mesa)}
                      className={`rounded-3xl border p-5 text-left transition ${
                        activa
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">Mesa</p>
                          <p className="text-2xl font-bold text-slate-900">{mesa.numero}</p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getEstadoMesaBadge(
                            mesa.estado
                          )}`}
                        >
                          {mesa.estado}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1 text-sm text-slate-500">
                        <p>Capacidad: {mesa.capacidad}</p>
                        <p>Comensales: {mesa.numComensales ?? 0}</p>
                        <p>Menú: {getNombreMenu(mesa.menuId)}</p>
                        <p>Código: {mesa.codigoAcceso || "Sin código"}</p>
                        <p>Generado: {formatearFecha(mesa.codigoGeneradoAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Nuevo pedido</h2>
              <p className="mt-1 text-sm text-slate-500">
                Selecciona una mesa y añade productos para enviar el pedido.
              </p>

              <form onSubmit={guardarPedido} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Mesa</label>
                  <select
                    value={pedidoForm.mesaId}
                    onChange={(e) =>
                      setPedidoForm((prev) => ({
                        ...prev,
                        mesaId: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  >
                    <option value="">Selecciona una mesa</option>
                    {mesas.map((mesa) => (
                      <option key={mesa.id} value={mesa.id}>
                        Mesa {mesa.numero}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Notas generales
                  </label>
                  <textarea
                    value={pedidoForm.notas}
                    onChange={(e) =>
                      setPedidoForm((prev) => ({
                        ...prev,
                        notas: e.target.value,
                      }))
                    }
                    rows="3"
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    placeholder="Observaciones del pedido..."
                  />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700">Añadir línea</h3>

                  <div className="mt-3 grid gap-3">
                    <select
                      value={lineaForm.productoId}
                      onChange={(e) => {
                        const producto = getProductoPorId(e.target.value);
                        setLineaForm((prev) => ({
                          ...prev,
                          productoId: e.target.value,
                          precio: producto ? Number(producto.precio || 0) : 0,
                        }));
                      }}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    >
                      <option value="">Selecciona producto</option>
                      {productos
                        .filter((p) => Number(p.disponible) === 1)
                        .map((producto) => (
                          <option key={producto.id} value={producto.id}>
                            {producto.nombre} - {Number(producto.precio).toFixed(2)} €
                          </option>
                        ))}
                    </select>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="number"
                        min="1"
                        value={lineaForm.cantidad}
                        onChange={(e) =>
                          setLineaForm((prev) => ({
                            ...prev,
                            cantidad: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                        placeholder="Cantidad"
                      />

                      <input
                        type="number"
                        step="0.01"
                        value={lineaForm.precio}
                        readOnly
                        className="w-full rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
                      />
                    </div>

                    <textarea
                      value={lineaForm.observaciones}
                      onChange={(e) =>
                        setLineaForm((prev) => ({
                          ...prev,
                          observaciones: e.target.value,
                        }))
                      }
                      rows="2"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                      placeholder="Observaciones de la línea..."
                    />

                    <button
                      type="button"
                      onClick={agregarLinea}
                      className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                    >
                      Añadir línea
                    </button>
                  </div>
                </div>

                {pedidoForm.productos.length > 0 ? (
                  <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700">Líneas del pedido</h3>

                    {pedidoForm.productos.map((linea, index) => (
                      <div
                        key={`${linea.productoId}-${index}`}
                        className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{linea.nombre}</p>
                            <p className="text-sm text-slate-500">
                              {linea.cantidad} x {Number(linea.precio).toFixed(2)} €
                            </p>
                            {linea.observaciones ? (
                              <p className="mt-1 text-sm text-slate-500">
                                Nota: {linea.observaciones}
                              </p>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => eliminarLinea(index)}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? "Enviando..." : "Crear pedido"}
                </button>
              </form>
            </section>
          </div>
        ) : null}

        {tab === "pedidos" ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Pedidos activos</h2>
                  <p className="text-sm text-slate-500">Control rápido de cocina y sala</p>
                </div>

                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-900"
                >
                  <option value="activos">Activos</option>
                  <option value="todos">Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en preparacion">En preparación</option>
                  <option value="listo">Listo</option>
                </select>
              </div>

              <div className="space-y-3">
                {pedidosFiltrados.map((pedido) => (
                  <article
                    key={pedido.id}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Pedido #{pedido.id}
                        </h3>
                        <p className="text-sm text-slate-500">
                          Mesa {pedido.mesaNumero || pedido.mesa_numero || pedido.mesaId}
                        </p>
                        <p className="text-sm text-slate-500">
                          Creado: {formatearFecha(pedido.createdAt || pedido.created_at)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getEstadoBadge(
                          pedido.estado
                        )}`}
                      >
                        {pedido.estado}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => verPedido(pedido)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Ver detalle
                      </button>

                      <button
                        type="button"
                        onClick={() => cambiarEstadoPedido(pedido, "en preparacion")}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        En preparación
                      </button>

                      <button
                        type="button"
                        onClick={() => cambiarEstadoPedido(pedido, "listo")}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Listo
                      </button>
                      {/* 'servido' no es un estado válido para el pedido (solo para líneas),
                          por eso se ha eliminado ese botón */}
                    </div>
                  </article>
                ))}

                {pedidosFiltrados.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500 ring-1 ring-slate-200">
                    No hay pedidos con ese filtro.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Detalle del pedido</h2>

              {!pedidoSeleccionado ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-slate-500 ring-1 ring-slate-200">
                  Selecciona un pedido para ver sus líneas.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-sm text-slate-500">Pedido</p>
                    <p className="text-2xl font-bold text-slate-900">
                      #{pedidoSeleccionado.id}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Mesa{" "}
                      {pedidoSeleccionado.mesaNumero ||
                        pedidoSeleccionado.mesa_numero ||
                        "-"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Estado:{" "}
                      <span className="font-semibold text-slate-900">
                        {pedidoSeleccionado.estado}
                      </span>
                    </p>
                    <p className="text-sm text-slate-500">
                      Total: {totalPedidoSeleccionado.toFixed(2)} €
                    </p>
                  </div>

                  <div className="space-y-3">
                    {(pedidoSeleccionado.lineas || []).map((linea) => (
                      <article
                        key={linea.id}
                        className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {linea.productoNombre || linea.nombre || "Producto"}
                            </p>
                            <p className="text-sm text-slate-500">
                              Cantidad: {linea.cantidad} ·{" "}
                              {Number(
                                linea.precioUnitario || linea.precio || 0
                              ).toFixed(2)}{" "}
                              €
                            </p>
                            {linea.observaciones ? (
                              <p className="mt-1 text-sm text-slate-500">
                                {linea.observaciones}
                              </p>
                            ) : null}
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getEstadoBadge(
                              linea.estado
                            )}`}
                          >
                            {linea.estado}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => cambiarEstadoLinea(linea.id, "en preparacion")}
                            className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            En preparación
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstadoLinea(linea.id, "lista")}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                          >
                            Lista
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstadoLinea(linea.id, "servido")}
                            className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                          >
                            Servido
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}