import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProtectedRoute } from "./pages/ProtectedRoute";
import { SitesPage } from "./pages/SitesPage";
import { SiteLayout } from "./pages/SiteLayout";
import { SiteDetailPage } from "./pages/SiteDetailPage";
import { BlockUnitsPage } from "./pages/BlockUnitsPage";
import { PersonsPage } from "./pages/PersonsPage";
import { PersonDetailPage } from "./pages/PersonDetailPage";
import { SiteFinancePage } from "./pages/SiteFinancePage";
import { AccountingPage } from "./pages/AccountingPage";
import { MetersPage } from "./pages/MetersPage";
import { RequestsPage } from "./pages/RequestsPage";
import { MaintenancePage } from "./pages/MaintenancePage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/sites/:siteId" element={<SiteLayout />}>
              <Route index element={<SiteDetailPage />} />
              <Route path="finance" element={<SiteFinancePage />} />
              <Route path="accounting" element={<AccountingPage />} />
              <Route path="meters" element={<MetersPage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="maintenance" element={<MaintenancePage />} />
              <Route path="blocks/:blockId" element={<BlockUnitsPage />} />
            </Route>
            <Route path="/persons" element={<PersonsPage />} />
            <Route path="/persons/:personId" element={<PersonDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
