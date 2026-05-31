import { useState } from "react";
import { validarCodigoMesa } from "../api";

const CODIGO_LENGTH = 6;

function normalizarCodigo(valor) {
  return String(valor ?? "").replace(/\D/g, "").slice(0, CODIGO_LENGTH);
}

export default function LandingView({ onCodigoValido }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const codigoLimpio = normalizarCodigo(codigo);

    if (codigoLimpio.length !== CODIGO_LENGTH) {
      setError("El código debe tener 6 dígitos.");
      return;
    }

    try {
      setLoading(true);
      const res = await validarCodigoMesa(codigoLimpio);

      if (res?.ok && res?.mesa) {
        onCodigoValido(res.mesa);
        return;
      }

      setError("Código no válido");
    } catch (err) {
      setError(err.message || "Código no válido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">Introduce tu código</h1>
          <p className="mt-2 text-slate-500">
            Accede al menú de tu mesa con el código facilitado por recepción.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={CODIGO_LENGTH}
              value={codigo}
              onChange={(e) => {
                setError("");
                setCodigo(normalizarCodigo(e.target.value));
              }}
              placeholder="Ej: 123456"
              className="w-full rounded-2xl border px-4 py-4 text-center text-2xl tracking-[0.3em]"
            />

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-white disabled:opacity-60"
            >
              {loading ? "Validando..." : "Entrar"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}