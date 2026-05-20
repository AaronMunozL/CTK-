import { useEffect, useMemo, useState } from "react";
import { getMesas, getMenus, crearMesa, actualizarMesa } from "../../api";

const formInicial = {
  id: null,
  numero: "",
  capacidad: "",
  estado: "libre",
  numComensales: 0,
  menuId: "",
};

export default function RecepcionView({ user, onSalir, onBack }) {
  const [mesas, setMesas] = useState([]);
  const [form, setForm] = useState(formInicial);
  const [modoCrear, setModoCrear] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [menus, setMenus] = useState([]);

  const cargarMenus = async () => {
    try {
      const res = await getMenus();
      setMenus(res.menus || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const cargarMesas = async () => {
    try {
      setError("");
      const res = await getMesas();
      setMesas(res.mesas || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    cargarMesas();
    cargarMenus();
  }, []);

  const resumen = useMemo(() => {
    return {
      total: mesas.length,
      libres: mesas.filter((m) => m.estado === "libre").length,
      ocupadas: mesas.filter((m) => m.estado === "ocupada").length,
      reservadas: mesas.filter((m) => m.estado === "reservada").length,
    };
  }, [mesas]);

  const seleccionarMesa = (mesa) => {
    setModoCrear(false);
    setForm({
      id: mesa.id,
      numero: mesa.numero,
      capacidad: mesa.capacidad,
      estado: mesa.estado,
      numComensales: mesa.numComensales,
      menuId: mesa.menuId ?? "",
    });
    setMensaje("");
    setError("");
  };

  const nuevaMesa = () => {
    setModoCrear(true);
    setForm(formInicial);
    setMensaje("");
    setError("");
  };

  const limpiarFormulario = () => {
    setModoCrear(false);
    setForm(formInicial);
    setMensaje("");
    setError("");
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
    setMensaje("");
    setError("");

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
        (modoCrear || mesa.id !== form.id)
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

      await cargarMesas();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const colorEstado = (estado) => {
    if (estado === "libre") return "bg-green-100 text-green-700";
    if (estado === "ocupada") return "bg-red-100 text-red-700";
    if (estado === "reservada") return "bg-amber-100 text-amber-700";
    if (estado === "mantenimiento") return "bg-slate-200 text-slate-700";
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
            <h1 className="text-3xl font-bold">Gestión de mesas</h1>
            <p className="mt-1 text-slate-500">Usuario: {user?.usuario}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={nuevaMesa}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white"
            >
              Crear mesa
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="rounded-xl bg-slate-200 px-4 py-2 text-slate-800"
              >
                Volver a admin
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
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-bold">{resumen.total}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Libres</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {resumen.libres}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Ocupadas</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {resumen.ocupadas}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Reservadas</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {resumen.reservadas}
            </p>
          </div>
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Mesas</h2>
              <span className="text-sm text-slate-500">
                Pulsa una mesa para editarla
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mesas.map((mesa) => {
                const activa = !modoCrear && form.id === mesa.id;

                return (
                  <button
                    key={mesa.id}
                    onClick={() => seleccionarMesa(mesa)}
                    className={`rounded-3xl border p-5 text-left transition ${activa
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">Mesa</p>
                        <p className="text-2xl font-bold">{mesa.numero}</p>
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
                      <p>Comensales: {mesa.numComensales}</p>
                      <p>
                      <p>Menú: {getNombreMenu(mesa.menuId)}</p>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">
              {modoCrear ? "Crear mesa" : "Editar mesa"}
            </h2>

            <form onSubmit={guardarMesa} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium">
                  Número de mesa
                </label>
                <input
                  type="number"
                  name="numero"
                  value={form.numero}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-2xl border px-4 py-3"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Capacidad</label>
                <input
                  type="number"
                  name="capacidad"
                  value={form.capacidad}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-2xl border px-4 py-3"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Estado</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-2xl border px-4 py-3"
                >
                  <option value="libre">Libre</option>
                  <option value="ocupada">Ocupada</option>
                  <option value="reservada">Reservada</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">
                  Comensales actuales
                </label>
                <input
                  type="number"
                  name="numComensales"
                  value={form.numComensales}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-2xl border px-4 py-3"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Menú asignado</label>
                <select
                  name="menuId"
                  value={form.menuId}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-2xl border px-4 py-3"
                >
                  <option value="">Sin asignar</option>
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.nombre} - {Number(menu.coste).toFixed(2)} €
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-white disabled:opacity-60"
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
                  className="rounded-2xl bg-slate-200 px-4 py-3 text-slate-800"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}