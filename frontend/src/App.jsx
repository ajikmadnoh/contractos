import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import SetupWizardPage from './pages/auth/SetupWizardPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import FinancePage from './pages/finance/FinancePage';
import InvoicingPage from './pages/invoicing/InvoicingPage';
import HRPage from './pages/hr/HRPage';
import BQPage from './pages/bq/BQPage';
import ProfilesPage from './pages/profiles/ProfilesPage';
import UserManagementPage from './pages/users/UserManagementPage';
import SettingsPage from './pages/settings/SettingsPage';
import DashboardLayout from './layouts/DashboardLayout';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/setup" element={<PrivateRoute><SetupWizardPage /></PrivateRoute>} />

      {/* Protected — inside dashboard layout */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="invoicing" element={<InvoicingPage />} />
        <Route path="hr" element={<HRPage />} />
        <Route path="bq" element={<BQPage />} />
        <Route path="profiles" element={<ProfilesPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
