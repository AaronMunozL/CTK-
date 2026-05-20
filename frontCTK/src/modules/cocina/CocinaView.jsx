const pedidos = [
  { id: 1, mesa: 4, plato: "Maki salmón", estado: "pendiente" },
  { id: 2, mesa: 2, plato: "Gyozas", estado: "pendiente" },
];

export default function CocinaView({ user, onSalir, onBack }) {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap gap-3">
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

        <div className="rounded-3xl bg-white p-6 shadow">
          <p className="text-sm text-slate-500">Panel cocina</p>
          <h1 className="text-3xl font-bold">Pedidos de cocina</h1>
          <p className="mt-2 text-slate-500">
            Usuario: {user?.usuario}
          </p>
        </div>
      </div>
    </div>
  );
}