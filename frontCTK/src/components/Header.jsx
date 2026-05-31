/**
 * Header genérico de la aplicación CTK.
 * Se muestra en la parte superior de todas las pantallas.
 *
 * Props:
 *   onOpenStaffLogin — si se pasa, muestra el botón "Acceso trabajadores" a la derecha.
 *                      En pantallas de personal (admin, cocina, etc.) no se pasa y el botón no aparece.
 */
export default function Header({ onOpenStaffLogin }) {
  return (
    <header className="border-b border-slate-700 bg-slate-800">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Marca */}
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-white px-3 py-1 text-xs font-black tracking-widest text-slate-900">
            CTK
          </span>
          <span className="text-sm font-semibold text-slate-300">
            Sistema de gestión de restaurante
          </span>
        </div>

        {/* Botón de acceso al personal (solo en landing) */}
        {onOpenStaffLogin && (
          <button
            type="button"
            onClick={onOpenStaffLogin}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow transition hover:bg-slate-100"
          >
            Acceso trabajadores
          </button>
        )}

      </div>
    </header>
  );
}
