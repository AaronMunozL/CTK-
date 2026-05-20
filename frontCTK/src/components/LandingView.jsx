import { useState } from "react";
import { validarCodigoMesa } from "../api";

export default function LandingView({ onOpenStaffLogin, onCodigoValido }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await validarCodigoMesa(codigo);
      if (res.ok) onCodigoValido(codigo);
    } catch (err) {
      setError("Código no válido");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="p-4">
        <button
          onClick={onOpenStaffLogin}
          className="rounded-xl bg-white px-4 py-2 shadow"
        >
          Acceso trabajadores
        </button>
      </header>

      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">Introduce tu código</h1>
          <p className="mt-2 text-slate-500">
            Accede al menú de tu mesa con el código facilitado por recepción.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: 123456"
              className="w-full rounded-2xl border px-4 py-4"
            />

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-white"
            >
              Entrar
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}