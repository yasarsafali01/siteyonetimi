import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getCurrentUserType } from "../api/client";

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Sakin hesapları sadece kendi paneline erişebilir; yönetici rotalarına
  // doğrudan URL ile gidilirse otomatik yönlendirilir.
  if (getCurrentUserType() === "sakin" && !location.pathname.startsWith("/resident")) {
    return <Navigate to="/resident" replace />;
  }

  return <Outlet />;
}
