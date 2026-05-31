/**
 * App.jsx — componente raíz y enrutador del frontend.
 *
 * Gestiona la navegación entre pantallas mediante un estado `screen` (string).
 * No usa React Router: cada pantalla es un componente montado condicionalmente.
 *
 * Flujo principal:
 *   landing → staff-login → staff-module-selector → [admin|cocina|recepcion|camarero]
 *   landing → (código de mesa) → usuario
 */
import { useState } from "react";
import LandingView from "./components/LandingView";
import StaffLoginView from "./components/StaffLoginView";
import AdminView from "./modules/admin/AdminView";
import CocinaView from "./modules/cocina/CocinaView";
import RecepcionView from "./modules/recepcion/RecepcionView";
import CamareroView from "./modules/camarero/CamareroView";
import UsuarioView from "./modules/usuario/UsuarioView";
import Footer from "./components/Footer";
import Header from "./components/Header";

/**
 * Pantalla de selección de módulo, visible tras el login del personal.
 * Construye las opciones según el rol del usuario: el administrador
 * accede a todos los módulos; cada otro rol solo al suyo.
 */
function ModuleSelectorView({ user, onSelect, onSalir }) {
  const rol = (user?.rol || "").toLowerCase();

  const opciones = [];

  if (rol === "administrador") {
    opciones.push(
      { key: "admin", label: "Administración" },
      { key: "cocina", label: "Cocina" },
      { key: "recepcion", label: "Recepción" },
      { key: "camarero", label: "Camarero" }
    );
  }

  if (rol === "cocina") {
    opciones.push({ key: "cocina", label: "Cocina" });
  }

  if (rol === "recepcion") {
    opciones.push({ key: "recepcion", label: "Recepción" });
  }

  if (rol === "camarero") {
    opciones.push({ key: "camarero", label: "Camarero" });
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="text-sm text-slate-500">Acceso de personal</p>
          <h1 className="text-3xl font-bold mt-2">Selecciona un módulo</h1>
          <p className="mt-2 text-slate-600">
            Usuario: <span className="font-semibold">{user?.usuario}</span> · Rol:{" "}
            <span className="font-semibold">{user?.rol}</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {opciones.map((opcion) => (
            <button
              key={opcion.key}
              onClick={() => onSelect(opcion.key)}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:border-blue-500 hover:bg-blue-50"
            >
              <p className="text-sm text-slate-500">Módulo</p>
              <p className="mt-2 text-xl font-bold">{opcion.label}</p>
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onSalir}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Pantalla activa: 'landing' | 'staff-login' | 'staff-module-selector' |
  //                  'admin' | 'cocina' | 'recepcion' | 'camarero' | 'usuario'
  const [screen, setScreen] = useState("landing");
  // Usuario del personal autenticado (null si es cliente sin login)
  const [staffUser, setStaffUser] = useState(null);
  // Mesa del cliente validada mediante código de acceso
  const [mesaUsuario, setMesaUsuario] = useState(null);

  const handleCodigoValido = (mesa) => {
    setMesaUsuario(mesa);
    setScreen("usuario");
  };

  const handleStaffLogin = (user) => {
    setStaffUser(user);
    setScreen("staff-module-selector");
  };

  // Resetea todo el estado y vuelve a la pantalla inicial
  const volverInicio = () => {
    setScreen("landing");
    setStaffUser(null);
    setMesaUsuario(null);
  };

  const volverSelectorModulos = () => {
    setScreen("staff-module-selector");
  };

  /**
   * Envuelve cualquier pantalla con Header + contenido + Footer.
   * onStaffLogin: si se pasa, el Header muestra el botón "Acceso trabajadores".
   */
  const withLayout = (children, onStaffLogin = null) => (
    <div className="flex min-h-screen flex-col">
      <Header onOpenStaffLogin={onStaffLogin} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );

  if (screen === "landing") {
    return withLayout(
      <LandingView
        onCodigoValido={handleCodigoValido}
      />,
      () => setScreen("staff-login")
    );
  }

  if (screen === "staff-login") {
    return withLayout(
      <StaffLoginView
        onBack={volverInicio}
        onLoginSuccess={handleStaffLogin}
      />
    );
  }

  if (screen === "staff-module-selector") {
    return withLayout(
      <ModuleSelectorView
        user={staffUser}
        onSelect={setScreen}
        onSalir={volverInicio}
      />
    );
  }

  if (screen === "usuario") {
    return withLayout(
      <UsuarioView
        user={staffUser}
        mesa={mesaUsuario}
        onSalir={volverInicio}
        onBack={volverInicio}
      />
    );
  }

  if (screen === "admin") {
    return withLayout(
      <AdminView
        user={staffUser}
        onSalir={volverInicio}
        onBack={volverSelectorModulos}
        onNavigate={setScreen}
      />
    );
  }

  if (screen === "cocina") {
    return withLayout(
      <CocinaView
        user={staffUser}
        onSalir={volverInicio}
        onBack={volverSelectorModulos}
      />
    );
  }

  if (screen === "recepcion") {
    return withLayout(
      <RecepcionView
        user={staffUser}
        onSalir={volverInicio}
        onBack={volverSelectorModulos}
      />
    );
  }

  if (screen === "camarero") {
    return withLayout(
      <CamareroView
        user={staffUser}
        onSalir={volverInicio}
        onBack={volverSelectorModulos}
      />
    );
  }

  return null;
}

export default App;