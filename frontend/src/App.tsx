import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProtectedRoute } from "./pages/ProtectedRoute";
import { SitesPage } from "./pages/SitesPage";
import { SiteDetailPage } from "./pages/SiteDetailPage";
import { BlockUnitsPage } from "./pages/BlockUnitsPage";
import { PersonsPage } from "./pages/PersonsPage";
import { PersonDetailPage } from "./pages/PersonDetailPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/sites/:siteId" element={<SiteDetailPage />} />
            <Route path="/sites/:siteId/blocks/:blockId" element={<BlockUnitsPage />} />
            <Route path="/persons" element={<PersonsPage />} />
            <Route path="/persons/:personId" element={<PersonDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
