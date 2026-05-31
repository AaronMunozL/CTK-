/**
 * Footer genérico de la aplicación CTK.
 * Se muestra al pie de todas las pantallas.
 */

const REDES = [
  {
    nombre: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    nombre: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    nombre: "X / Twitter",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    nombre: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-700 bg-slate-800">
      <div className="mx-auto max-w-7xl px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">

          {/* Marca */}
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white px-3 py-1 text-xs font-black tracking-widest text-slate-900">
              CTK
            </span>
            <span className="text-sm font-semibold text-slate-300">
              Sistema de gestión de restaurante
            </span>
          </div>

          {/* Iconos redes sociales */}
          <div className="flex items-center gap-3">
            {REDES.map((red) => (
              <button
                key={red.nombre}
                type="button"
                aria-label={red.nombre}
                title={red.nombre}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-slate-300 ring-1 ring-slate-600 transition hover:bg-white hover:text-slate-900"
              >
                {red.icon}
              </button>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-xs text-slate-500">
            © {year} CTK · Todos los derechos reservados
          </p>

        </div>
      </div>
    </footer>
  );
}
