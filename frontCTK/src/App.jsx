import { useState } from "react";
import LandingView from "./components/LandingView";
import StaffLoginView from "./components/StaffLoginView";
import AdminView from "./modules/admin/AdminView";
import CocinaView from "./modules/cocina/CocinaView";
import RecepcionView from "./modules/recepcion/RecepcionView";
import CamareroView from "./modules/camarero/CamareroView";
import UsuarioView from "./modules/usuario/UsuarioView";

function App() {
  const [screen, setScreen] = useState("landing");
  const [staffUser, setStaffUser] = useState(null);
  const [codigoMesa, setCodigoMesa] = useState("");

  const handleCodigoValido = (codigo) => {
    setCodigoMesa(codigo);
    setScreen("usuario");
  };

  const handleStaffLogin = (user) => {
    setStaffUser(user);

    if (user.rol === "administrador") {
      setScreen("admin");
      return;
    }

    if (user.rol === "cocina") {
      setScreen("cocina");
      return;
    }

    if (user.rol === "recepcion") {
      setScreen("recepcion");
      return;
    }

    if (user.rol === "camarero") {
      setScreen("camarero");
      return;
    }

    setScreen("landing");
  };

  const volverInicio = () => {
    setScreen("landing");
    setStaffUser(null);
    setCodigoMesa("");
  };

  const volverAdmin = () => {
    setScreen("admin");
  };

  if (screen === "landing") {
    return (
      <LandingView
        onOpenStaffLogin={() => setScreen("staff-login")}
        onCodigoValido={handleCodigoValido}
      />
    );
  }

  if (screen === "staff-login") {
    return (
      <StaffLoginView
        onBack={volverInicio}
        onLoginSuccess={handleStaffLogin}
      />
    );
  }

  if (screen === "usuario") {
    return <UsuarioView codigoMesa={codigoMesa} onSalir={volverInicio} />;
  }

  if (screen === "admin") {
    return (
      <AdminView
        user={staffUser}
        onSalir={volverInicio}
        onNavigate={setScreen}
      />
    );
  }

  if (screen === "cocina") {
    return (
      <CocinaView
        user={staffUser}
        onSalir={volverInicio}
        onBack={staffUser?.rol === "administrador" ? volverAdmin : null}
      />
    );
  }

  if (screen === "recepcion") {
    return (
      <RecepcionView
        user={staffUser}
        onSalir={volverInicio}
        onBack={staffUser?.rol === "administrador" ? volverAdmin : null}
      />
    );
  }

  if (screen === "camarero") {
    return (
      <CamareroView
        user={staffUser}
        onSalir={volverInicio}
        onBack={staffUser?.rol === "administrador" ? volverAdmin : null}
      />
    );
  }

  return null;
}

export default App;