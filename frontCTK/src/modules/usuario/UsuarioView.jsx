const productos = [
  { id: 1, nombre: "Maki salmón", precio: 8.9, disponible: true },
  { id: 2, nombre: "Gyozas", precio: 6.5, disponible: true },
  { id: 3, nombre: "Helado", precio: 4.2, disponible: false },
];

export default function UsuarioView({ codigoMesa, onSalir }) {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Código: {codigoMesa}</p>
            <h1 className="text-3xl font-bold">Menú disponible</h1>
          </div>

          <button onClick={onSalir} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
            Salir
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {productos.map((producto) => (
            <div key={producto.id} className="rounded-3xl bg-white p-5 shadow">
              <h3 className="text-xl font-bold">{producto.nombre}</h3>
              <p className="mt-2 text-slate-500">{producto.precio.toFixed(2)} €</p>
              <p className="mt-1">
                {producto.disponible ? "Disponible" : "No disponible"}
              </p>

              <button
                disabled={!producto.disponible}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white disabled:bg-slate-300"
              >
                Pedir
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}