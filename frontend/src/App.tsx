import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './auth/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clinics from './pages/Clinics';
import Patients from './pages/Patients';
import PatientProfile from './pages/PatientProfile';
import Consultations from './pages/Consultations';
import ConsultationForm from './pages/ConsultationForm';
import ConsultationDetail from './pages/ConsultationDetail';
import VisitHistory from './pages/VisitHistory';
import Payments from './pages/Payments';
import Machines from './pages/Machines';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Permissions from './pages/Permissions';

/** Sends super admins to /clinics, clinic users to the dashboard. */
function Home() {
  const { user } = useAuth();
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/clinics" replace />;
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route
          path="/clinics"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <Clinics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients"
          element={
            <ProtectedRoute roles={['CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute roles={['CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <PatientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/consultations"
          element={
            <ProtectedRoute roles={['CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <Consultations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/consultations/new"
          element={
            <ProtectedRoute roles={['CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <ConsultationForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/consultations/:id"
          element={
            <ProtectedRoute roles={['CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <ConsultationDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visit-history"
          element={
            <ProtectedRoute roles={['CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <VisitHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute roles={['CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route path="/machines" element={<Machines />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'CLINIC_ADMIN']}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={['CLINIC_ADMIN']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/permissions"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <Permissions />
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
