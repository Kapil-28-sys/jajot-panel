import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages
import AdminRoutes from "./routes/AdminRoutes";
import VendorRoutes from "./routes/VendorRoutes";
import ProtectedAdminPage from "./components/common/ProtectedAdminPage";

import Login from "./pages/auth/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/vendor" element={<Navigate to="/vendor/admin" replace />} />

        <Route
          path="/admin/*"
          element={
            <ProtectedAdminPage>
              <AdminRoutes />
            </ProtectedAdminPage>
          }
        />

        <Route
          path="/vendor/*"
          element={
            <ProtectedAdminPage>
              <VendorRoutes />
            </ProtectedAdminPage>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
