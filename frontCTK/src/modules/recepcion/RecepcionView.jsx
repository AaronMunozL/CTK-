/**
 * RecepcionView — panel de gestión de mesas para el personal de recepción.
 *
 * Funcionalidades:
 *   - Ver todas las mesas con su estado, capacidad y código de acceso actual.
 *   - Crear y editar mesas (número, capacidad, estado, comensales, menú asignado).
 *   - Generar o resetear el código de 6 dígitos que los clientes usan para acceder.
 *
 * El formulario actúa en modo "crear" o "editar" según `modoCrear`.
 * Al pulsar una mesa en el grid se carga en el formulario de edición.
 */
import { useEffect, useMemo, useState } from "react";
import {
  getMesas,
  getMenus,
  crearMesa,
  actualizarMesa,
  generarCodigoMesa,
  resetearCodigoMesa,
  getHistorialTerminados,
  marcarPagado,
} from "../../api";

const formInicial = {
  id: null,
  numero: "",
  capacidad: "",
  estado: "libre",
  numComensales: 0,
  menuId: "",
  codigoAcceso: "",
  codigoActivo: 0,
  codigoGeneradoAt: null,
};

export default function RecepcionView({ user, onSalir, onBack }) {
  const [tab, setTab] = useState("mesas");

  // ── Estado pestaña Mesas ──
  const [mesas, setMesas] = useState([]);
  const [form, setForm] = useState(formInicial);
  const [modoCrear, setModoCrear] = useState(false);
  const [menus, setMenus] = useState([]);

  // ── Estado pestaña Cobros ──
  const [sesiones, setSesiones] = useState([]);
  const [loadingCobros, setLoadingCobros] = useState(false);
  const [filtroCobros, setFiltroCobros] = useState("pendientes"); // 'pendientes' | 'pagados' | 'todos'

  // ── Estado compartido ──
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const limpiarMensajes = () => {
    setMensaje("");
    setError("");
  };

  const cargarMenus = async () => {
    try {
      const res = await getMenus();
      setMenus(res.menus || []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los menús.");
    }
  };

  const cargarMesas = async () => {
    try {
      setError("");
      const res = await getMesas();
      setMesas(res.mesas || []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las mesas.");
    }
  };

  const cargarCobros = async () => {
    try {
      setLoadingCobros(true);
      const res = await getHistorialTerminados();
      setSesiones(res.sesiones || []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los cobros.");
    } finally {
      setLoadingCobros(false);
    }
  };

  const cargarTodo = async () => {
    try {
      setLoading(true);
      limpiarMensajes();
      await Promise.all([cargarMesas(), cargarMenus()]);
    } catch (err) {
      setError(err.message || "Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // Cargar cobros cuando se activa esa pestaña
  useEffect(() => {
    if (tab === "cobros") cargarCobros();
  }, [tab]);

  const resumen = useMemo(() => {
    return {
      total: mesas.length,
      libres: mesas.filter((m) => m.estado === "libre").length,
      ocupadas: mesas.filter((m) => m.estado === "ocupada").length,
      reservadas: mesas.filter((m) => m.estado === "reservada").length,
      mantenimiento: mesas.filter((m) => m.estado === "mantenimiento").length,
    };
  }, [mesas]);

  const formatearFecha = (valor) => {
    if (!valor) return "-";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return fecha.toLocaleString("es-ES");
  };

  const seleccionarMesa = (mesa) => {
    setModoCrear(false);
    setForm({
      id: mesa.id,
      numero: mesa.numero ?? "",
      capacidad: mesa.capacidad ?? "",
      estado: mesa.estado ?? "libre",
      numComensales: mesa.numComensales ?? 0,
      menuId: mesa.menuId ?? "",
      codigoAcceso: mesa.codigoAcceso || "",
      codigoActivo: Number(mesa.codigoActivo) || 0,
      codigoGeneradoAt: mesa.codigoGeneradoAt || null,
    });
    limpiarMensajes();
  };

  const nuevaMesa = () => {
    setModoCrear(true);
    setForm(formInicial);
    limpiarMensajes();
  };

  const limpiarFormulario = () => {
    setModoCrear(false);
    setForm(formInicial);
    limpiarMensajes();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const guardarMesa = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!form.numero || Number(form.numero) <= 0) {
      setError("El número de mesa debe ser mayor que 0.");
      return;
    }

    if (!form.capacidad || Number(form.capacidad) <= 0) {
      setError("La capacidad debe ser mayor que 0.");
      return;
    }

    if (Number(form.numComensales) < 0) {
      setError("Los comensales no pueden ser negativos.");
      return;
    }

    if (Number(form.numComensales) > Number(form.capacidad)) {
      setError("Los comensales no pueden superar la capacidad.");
      return;
    }

    const numeroDuplicado = mesas.some(
      (mesa) =>
        Number(mesa.numero) === Number(form.numero) &&
        (modoCrear || Number(mesa.id) !== Number(form.id))
    );

    if (numeroDuplicado) {
      setError("Ya existe otra mesa con ese número.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        numero: Number(form.numero),
        capacidad: Number(form.capacidad),
        estado: form.estado,
        numComensales: Number(form.numComensales),
        menuId: form.menuId === "" ? null : Number(form.menuId),
      };

      if (modoCrear) {
        await crearMesa(payload);
        setMensaje("Mesa creada correctamente.");
        setForm(formInicial);
        setModoCrear(false);
      } else {
        await actualizarMesa({
          id: form.id,
          ...payload,
        });
        setMensaje("Mesa actualizada correctamente.");
      }

      // cargarMesas() actualiza el estado `mesas`; para reflejar los nuevos
      // datos en el formulario buscamos la mesa en la lista ya cargada.
      const resMesas = await getMesas();
      setMesas(resMesas.mesas || []);

      if (!modoCrear && form.id) {
        const actualizada = (resMesas.mesas || []).find(
          (m) => Number(m.id) === Number(form.id)
        );
        if (actualizada) {
          seleccionarMesa(actualizada);
        }
      }
    } catch (err) {
      setError(err.message || "No se pudo guardar la mesa.");
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

      if (!modoCrear && Number(form.id) === Number(mesaId)) {
        const resMesas = await getMesas();
        const actualizada = (resMesas.mesas || []).find(
          (m) => Number(m.id) === Number(mesaId)
        );
        if (actualizada) seleccionarMesa(actualizada);
      }
    } catch (err) {
      setError(err.message || "No se pudo generar el código.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetearCodigoMesa = async (mesaId) => {
    const ok = window.confirm(
      "¿Seguro que quieres invalidar el código actual de esta mesa?"
    );
    if (!ok) return;

    limpiarMensajes();

    try {
      setLoading(true);
      await resetearCodigoMesa(mesaId);
      setMensaje("Código reseteado correctamente.");
      await cargarMesas();

      if (!modoCrear && Number(form.id) === Number(mesaId)) {
        const resMesas = await getMesas();
        const actualizada = (resMesas.mesas || []).find(
          (m) => Number(m.id) === Number(mesaId)
        );
        if (actualizada) seleccionarMesa(actualizada);
      }
    } catch (err) {
      setError(err.message || "No se pudo resetear el código.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarPagado = async (sesion, pagado) => {
    limpiarMensajes();
    try {
      await marcarPagado(sesion.mesaId, sesion.fechaCierre, pagado);
      setMensaje(pagado ? "Sesión marcada como pagada." : "Sesión marcada como pendiente.");
      await cargarCobros();
    } catch (err) {
      setError(err.message || "No se pudo actualizar el estado de pago.");
    }
  };

  const sesionesFiltradas = useMemo(() => {
    if (filtroCobros === "pendientes") return sesiones.filter((s) => !s.pagado);
    if (filtroCobros === "pagados")    return sesiones.filter((s) => s.pagado);
    return sesiones;
  }, [sesiones, filtroCobros]);

  const colorEstado = (estado) => {
    if (estado === "libre") return "bg-emerald-100 text-emerald-700";
    if (estado === "ocupada") return "bg-amber-100 text-amber-700";
    if (estado === "reservada") return "bg-blue-100 text-blue-700";
    if (estado === "mantenimiento") return "bg-rose-100 text-rose-700";
    return "bg-slate-100 text-slate-700";
  };

  const getNombreMenu = (menuId) => {
    if (menuId === null || menuId === "" || menuId === undefined) {
      return "Sin asignar";
    }

    const menu = menus.find((m) => Number(m.id) === Number(menuId));
    return menu ? menu.nombre : "Sin asignar";
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Panel recepción</p>
            <h1 className="text-3xl font-bold text-slate-900">Gestión de mesas</h1>
            <p className="mt-1 text-slate-500">Usuario: {user?.usuario}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={tab === "cobros" ? cargarCobros : cargarTodo}
              disabled={loading || loadingCobros}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading || loadingCobros ? "Refrescando..." : "Refrescar"}
            </button>

            {tab === "mesas" && (
              <button
                type="button"
                onClick={nuevaMesa}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              >
                Crear mesa
              </button>
            )}

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl bg-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-300"
              >
                Volver
              </button>
            )}

            <button
              type="button"
              onClick={onSalir}
              className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{resumen.total}</p>
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
            <p className="text-sm text-slate-500">Mantenimiento</p>
            <p className="mt-2 text-3xl font-bold text-rose-600">
              {resumen.mantenimiento}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</div>
        )}

        {mensaje && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">
            {mensaje}
          </div>
        )}

        {/* ── Pestañas ── */}
        <div className="mt-6 flex gap-2">
          {[
            { key: "mesas",  label: "Mesas" },
            { key: "cobros", label: `Cobros${sesiones.filter(s => !s.pagado).length > 0 ? ` (${sesiones.filter(s => !s.pagado).length})` : ""}` },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                tab === t.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Pestaña Cobros ── */}
        {tab === "cobros" && (
          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Cobros pendientes</h2>
                <p className="text-sm text-slate-500">Sesiones terminadas listas para cobrar</p>
              </div>
              <div className="flex gap-2">
                {["pendientes", "pagados", "todos"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFiltroCobros(f)}
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold capitalize transition ${
                      filtroCobros === f
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {loadingCobros ? (
              <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
                Cargando cobros...
              </div>
            ) : sesionesFiltradas.length === 0 ? (
              <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
                No hay sesiones {filtroCobros === "pendientes" ? "pendientes de cobro" : filtroCobros === "pagados" ? "pagadas" : ""}.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sesionesFiltradas.map((sesion) => (
                  <article
                    key={`${sesion.mesaId}-${sesion.fechaCierre}`}
                    className={`rounded-3xl p-6 shadow-sm ring-1 transition ${
                      sesion.pagado
                        ? "bg-emerald-50 ring-emerald-200"
                        : "bg-white ring-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">Mesa</p>
                        <p className="text-3xl font-black text-slate-900">{sesion.mesaNumero}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          sesion.pagado
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {sesion.pagado ? "Pagado" : "Pendiente"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1 text-sm text-slate-600">
                      <p>Cerrada: {new Date(sesion.fechaCierre).toLocaleString("es-ES")}</p>
                      <p>Comensales: {sesion.numComensales}</p>
                      {sesion.menuNombre && (
                        <p>Menú: {sesion.menuNombre} ({Number(sesion.menuCoste).toFixed(2)} € × {sesion.numComensales})</p>
                      )}
                      <p>Pedidos: {sesion.numPedidos}</p>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-white">
                      {sesion.menuNombre && (
                        <div className="flex justify-between text-sm text-slate-300">
                          <span>Productos</span>
                          <span>{Number(sesion.totalProductos).toFixed(2)} €</span>
                        </div>
                      )}
                      {sesion.menuNombre && (
                        <div className="flex justify-between text-sm text-slate-300">
                          <span>Menú</span>
                          <span>{Number(sesion.totalMenu).toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="text-2xl font-black">{Number(sesion.total).toFixed(2)} €</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      {sesion.pagado ? (
                        <button
                          type="button"
                          onClick={() => handleMarcarPagado(sesion, false)}
                          className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-300"
                        >
                          Marcar como pendiente
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarcarPagado(sesion, true)}
                          className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          Marcar como pagado ✓
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Pestaña Mesas ── */}
        {tab === "mesas" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Mesas</h2>
                <p className="text-sm text-slate-500">Pulsa una mesa para editarla</p>
              </div>

              <span className="text-sm text-slate-500">{mesas.length} registradas</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mesas.map((mesa) => {
                const activa = !modoCrear && Number(form.id) === Number(mesa.id);

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
                        className={`rounded-full px-3 py-1 text-xs font-medium ${colorEstado(
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

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        Editar
                      </span>

                      <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                        Código
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                {modoCrear ? "Crear mesa" : "Editar mesa"}
              </h2>

              {!modoCrear && form.id ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Mesa #{form.numero}
                </span>
              ) : null}
            </div>

            <form onSubmit={guardarMesa} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Número de mesa
                </label>
                <input
                  type="number"
                  name="numero"
                  value={form.numero}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Capacidad
                </label>
                <input
                  type="number"
                  name="capacidad"
                  value={form.capacidad}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Estado
                </label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="libre">Libre</option>
                  <option value="ocupada">Ocupada</option>
                  <option value="reservada">Reservada</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Comensales actuales
                </label>
                <input
                  type="number"
                  name="numComensales"
                  value={form.numComensales}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Menú asignado
                </label>
                <select
                  name="menuId"
                  value={form.menuId}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="">Sin asignar</option>
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.nombre} - {Number(menu.coste).toFixed(2)} €
                    </option>
                  ))}
                </select>
              </div>

              {!modoCrear && form.id ? (
                <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Código acceso</p>
                    <p className="mt-1 font-mono text-lg font-black text-slate-900">
                      {form.codigoAcceso || "Sin código"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Generado: {formatearFecha(form.codigoGeneradoAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerarCodigoMesa(form.id)}
                      disabled={loading}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      Generar código
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetearCodigoMesa(form.id)}
                      disabled={loading}
                      className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                    >
                      Resetear código
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : modoCrear
                    ? "Crear mesa"
                    : "Guardar cambios"}
                </button>

                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="rounded-2xl bg-slate-200 px-4 py-3 text-slate-800 hover:bg-slate-300"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}