import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { useClinicScope } from './auth/ClinicScopeContext';

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
import MachineComplaints from './pages/MachineComplaints';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Permissions from './pages/Permissions';
import Staff from './pages/hr/Staff';
import StaffProfile from './pages/hr/StaffProfile';
import Employees from './pages/hr/Employees';
import Attendance from './pages/hr/Attendance';
import Leave from './pages/hr/Leave';
import Payroll from './pages/hr/Payroll';
import HrReports from './pages/hr/HrReports';

/** Routes each role to its landing page. */
function Home() {
  const { user } = useAuth();
  const { activeClinicId } = useClinicScope();
  if (user?.role === 'SUPER_ADMIN') {
    // With a clinic selected, the super admin sees that clinic's dashboard;
    // otherwise their home is the clinics admin area.
    return activeClinicId ? <Dashboard /> : <Navigate to="/clinics" replace />;
  }
  if (user?.role === 'HR') return <Navigate to="/hr/staff" replace />;
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
            <ProtectedRoute roles={['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <PatientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/consultations"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
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
            <ProtectedRoute roles={['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <ConsultationDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visit-history"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <VisitHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST']}>
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/machines"
          element={
            <ProtectedRoute
              roles={['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST']}
            >
              <Machines />
            </ProtectedRoute>
          }
        />
        <Route
          path="/machine-complaints"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'CLINIC_ADMIN']}>
              <MachineComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'CLINIC_ADMIN']}>
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

        {/* HR module — Super Admin & HR (staff accounts + operational records). */}
        <Route
          path="/hr/staff"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'HR']}>
              <Staff />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/staff/:id"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'HR']}>
              <StaffProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/employees"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'HR']}>
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/attendance"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'HR']}>
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/leave"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'HR']}>
              <Leave />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/payroll"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'HR']}>
              <Payroll />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/reports"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'HR']}>
              <HrReports />
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
