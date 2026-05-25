import { useEffect, useMemo, useState } from "react";
import {
  getPedidosCocina,
  actualizarEstadoPedido,
  actualizarEstadoLineaPedido,
  eliminarPedidoCocina,
} from "../../api";

const ESTADOS_PEDIDO = ["pendiente", "en preparacion", "listo"];
const ESTADOS_LINEA = ["pendiente", "en preparacion", "lista", "servido"];

export default function CocinaView({ user, onBack, onSalir }) {
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [filtroMesa, setFiltroMesa] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const limpiarMensajes = () => {
    setError("");
    setMensaje("");
  };

  const cargarPedidos = async (silencioso = false) => {
    try {
      if (!silencioso) setLoading(true);
      limpiarMensajes();
      const res = await getPedidosCocina();
      setPedidos(res.pedidos || []);
    } catch (err) {
      setError(err.message || "Error al cargar pedidos de cocina.");
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      cargarPedidos(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      const coincideMesa =
        filtroMesa === "" ||
        String(pedido.mesaNumero || pedido.mesaid || "").includes(filtroMesa);

      const texto = [
        pedido.id,
        pedido.estado,
        pedido.mesaNumero,
        ...(pedido.lineas || []).map((l) => l.productoNombre || ""),
        ...(pedido.lineas || []).map((l) => l.observaciones || ""),
      ]
        .join(" ")
        .toLowerCase();

      const coincideBusqueda =
        busqueda.trim() === "" || texto.includes(busqueda.toLowerCase());

      return coincideMesa && coincideBusqueda;
    });
  }, [pedidos, filtroMesa, busqueda]);

  const resumen = useMemo(() => {
    return {
      pendiente: pedidosFiltrados.filter((p) => p.estado === "pendiente").length,
      enPreparacion: pedidosFiltrados.filter((p) => p.estado === "en preparacion").length,
      listo: pedidosFiltrados.filter((p) => p.estado === "listo").length,
      total: pedidosFiltrados.length,
    };
  }, [pedidosFiltrados]);

  const pedidosPendientes = pedidosFiltrados.filter((p) => p.estado === "pendiente");
  const pedidosPreparacion = pedidosFiltrados.filter((p) => p.estado === "en preparacion");
  const pedidosListos = pedidosFiltrados.filter((p) => p.estado === "listo");

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    const f = new Date(fecha);
    if (Number.isNaN(f.getTime())) return fecha;

    return f.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calcularTotalPedido = (pedido) => {
    return (pedido.lineas || []).reduce((acc, linea) => {
      return acc + Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0);
    }, 0);
  };

  const cambiarEstadoPedido = async (pedidoId, nuevoEstado) => {
    try {
      setActualizando(true);
      limpiarMensajes();

      await actualizarEstadoPedido({
        id: pedidoId,
        estado: nuevoEstado,
      });

      setMensaje(`Pedido #${pedidoId} actualizado a "${nuevoEstado}".`);
      await cargarPedidos(true);
    } catch (err) {
      setError(err.message || "No se pudo actualizar el estado del pedido.");
    } finally {
      setActualizando(false);
    }
  };

  const cambiarEstadoLinea = async (lineaId, nuevoEstado) => {
    try {
      setActualizando(true);
      limpiarMensajes();

      await actualizarEstadoLineaPedido({
        id: lineaId,
        estado: nuevoEstado,
      });

      setMensaje(`Línea #${lineaId} actualizada a "${nuevoEstado}".`);
      await cargarPedidos(true);
    } catch (err) {
      setError(err.message || "No se pudo actualizar el estado de la línea.");
    } finally {
      setActualizando(false);
    }
  };

  const eliminarPedido = async (pedido) => {
    const ok = window.confirm(
      `¿Eliminar el pedido #${pedido.id} de la mesa ${pedido.mesaNumero || pedido.mesaid}?`
    );
    if (!ok) return;

    try {
      setActualizando(true);
      limpiarMensajes();

      await eliminarPedidoCocina(pedido.id);
      setMensaje(`Pedido #${pedido.id} eliminado correctamente.`);
      await cargarPedidos(true);
    } catch (err) {
      setError(err.message || "No se pudo eliminar el pedido.");
    } finally {
      setActualizando(false);
    }
  };

  const marcarPedidoEnPreparacion = (pedido) => {
    cambiarEstadoPedido(pedido.id, "en preparacion");
  };

  const marcarPedidoListo = (pedido) => {
    cambiarEstadoPedido(pedido.id, "listo");
  };

  const volverPedidoPendiente = (pedido) => {
    cambiarEstadoPedido(pedido.id, "pendiente");
  };

  const renderAccionesPedido = (pedido) => {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {pedido.estado === "pendiente" && (
          <button
            onClick={() => marcarPedidoEnPreparacion(pedido)}
            disabled={actualizando}
            className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Pasar a preparación
          </button>
        )}

        {pedido.estado === "en preparacion" && (
          <>
            <button
              onClick={() => marcarPedidoListo(pedido)}
              disabled={actualizando}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Marcar como listo
            </button>

            <button
              onClick={() => volverPedidoPendiente(pedido)}
              disabled={actualizando}
              className="rounded-xl bg-slate-300 px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-60"
            >
              Volver a pendiente
            </button>
          </>
        )}

        {pedido.estado === "listo" && (
          <>
            <button
              onClick={() => cambiarEstadoPedido(pedido.id, "en preparacion")}
              disabled={actualizando}
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Reabrir pedido
            </button>

            <button
              onClick={() => eliminarPedido(pedido)}
              disabled={actualizando}
              className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Eliminar pedido
            </button>
          </>
        )}
      </div>
    );
  };

  const renderLinea = (linea) => {
    return (
      <div key={linea.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Producto</p>
            <h4 className="text-lg font-bold">
              {linea.productoNombre || `Producto #${linea.productoId}`}
            </h4>

            <div className="mt-1 text-sm text-slate-600">
              <p>Cantidad: {linea.cantidad}</p>
              <p>Estado: {linea.estado}</p>
              <p>Precio unitario: {Number(linea.precioUnitario || 0).toFixed(2)} €</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-500">Subtotal</p>
            <p className="text-lg font-bold">
              {(Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0)).toFixed(2)} €
            </p>
          </div>
        </div>

        {linea.observaciones ? (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <span className="font-semibold">Observaciones:</span> {linea.observaciones}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {linea.estado !== "pendiente" && (
            <button
              onClick={() => cambiarEstadoLinea(linea.id, "pendiente")}
              disabled={actualizando}
              className="rounded-xl bg-slate-200 px-3 py-2 text-sm text-slate-800 disabled:opacity-60"
            >
              Pendiente
            </button>
          )}

          {linea.estado !== "en preparacion" && (
            <button
              onClick={() => cambiarEstadoLinea(linea.id, "en preparacion")}
              disabled={actualizando}
              className="rounded-xl bg-amber-500 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              En preparación
            </button>
          )}

          {linea.estado !== "lista" && (
            <button
              onClick={() => cambiarEstadoLinea(linea.id, "lista")}
              disabled={actualizando}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              Lista
            </button>
          )}

          {linea.estado !== "servido" && (
            <button
              onClick={() => cambiarEstadoLinea(linea.id, "servido")}
              disabled={actualizando}
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              Servido
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPedidoCard = (pedido) => {
    return (
      <article key={pedido.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Pedido #{pedido.id}</p>
            <h3 className="text-2xl font-bold">Mesa {pedido.mesaNumero || pedido.mesaid}</h3>

            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>Estado: {pedido.estado}</p>
              <p>Fecha: {formatearFecha(pedido.createdAt || pedido.createdat)}</p>
              <p>Líneas: {(pedido.lineas || []).length}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold">{calcularTotalPedido(pedido).toFixed(2)} €</p>
          </div>
        </div>

        {renderAccionesPedido(pedido)}

        <div className="mt-5 space-y-3">
          {(pedido.lineas || []).length > 0 ? (
            pedido.lineas.map(renderLinea)
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Este pedido no tiene líneas cargadas.
            </div>
          )}
        </div>
      </article>
    );
  };

  const renderColumna = (titulo, colorClase, items) => {
    return (
      <div className="rounded-3xl bg-white p-5 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`text-xl font-bold ${colorClase}`}>{titulo}</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            {items.length}
          </span>
        </div>

        <div className="space-y-4">
          {items.length > 0 ? (
            items.map(renderPedidoCard)
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
              No hay pedidos en esta columna.
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 shadow">
          <p className="text-lg font-medium text-slate-600">Cargando panel de cocina...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Módulo de cocina</p>
            <h1 className="text-3xl font-bold">Gestión de pedidos</h1>
            <p className="mt-1 text-slate-500">
              Usuario: {user?.usuario} {user?.rol ? `· Rol: ${user.rol}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onBack}
              className="rounded-xl bg-slate-200 px-4 py-2 text-slate-800"
            >
              Volver
            </button>

            <button
              onClick={() => cargarPedidos()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white"
            >
              Refrescar
            </button>

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
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{resumen.pendiente}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">En preparación</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">{resumen.enPreparacion}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Listos</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{resumen.listo}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-bold">{resumen.total}</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Buscar</label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Mesa, pedido, producto, observaciones..."
                className="mt-1 w-full rounded-2xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Filtrar por mesa</label>
              <input
                type="text"
                value={filtroMesa}
                onChange={(e) => setFiltroMesa(e.target.value)}
                placeholder="Ej: 3"
                className="mt-1 w-full rounded-2xl border px-4 py-3"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 rounded-2xl border px-4 py-3">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span className="text-sm">Auto refresco cada 10 segundos</span>
              </label>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</div>
          ) : null}

          {mensaje ? (
            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">{mensaje}</div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          {renderColumna("Pendientes", "text-amber-600", pedidosPendientes)}
          {renderColumna("En preparación", "text-orange-600", pedidosPreparacion)}
          {renderColumna("Listos", "text-emerald-600", pedidosListos)}
        </div>
      </div>
    </div>
  );
}