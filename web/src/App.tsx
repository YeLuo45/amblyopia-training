import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { initDB } from './lib/offline';

// Pages
import AuthPage from './pages/AuthPage';
import ParentDashboard from './pages/ParentDashboard';
import ChildSelect from './pages/ChildSelect';
import GameLobby from './pages/GameLobby';
import GameRunner from './pages/GameRunner';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Doctor Pages
import DoctorAuthPage from './pages/doctor/DoctorAuthPage';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import AddPatient from './pages/doctor/AddPatient';
import PatientDetail from './pages/doctor/PatientDetail';
import PlanEditor from './pages/doctor/PlanEditor';
import FhirExport from './pages/doctor/FhirExport';

// Initialize offline DB
initDB().catch(console.error);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, selectedChild } = useAuth();

  return (
    <Routes>
      {/* Parent/Family Routes */}
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/select-child" element={
        <ProtectedRoute>
          <ChildSelect />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <ParentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/games" element={
        <ProtectedRoute>
          {!selectedChild ? <Navigate to="/select-child" replace /> : <GameLobby />}
        </ProtectedRoute>
      } />
      <Route path="/game/:gameId" element={
        <ProtectedRoute>
          {!selectedChild ? <Navigate to="/select-child" replace /> : <GameRunner />}
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />

      {/* Doctor Routes */}
      <Route path="/doctor/auth" element={<DoctorAuthPage />} />
      <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
      <Route path="/doctor/patients/add" element={<AddPatient />} />
      <Route path="/doctor/patients/:childId" element={<PatientDetail />} />
      <Route path="/doctor/patients/:childId/plan" element={<PlanEditor />} />
      <Route path="/fhir-export/:childId" element={<FhirExport />} />

      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/auth'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
