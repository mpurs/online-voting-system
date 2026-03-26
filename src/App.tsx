/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import { AuthProvider, useAuth } from './components/AuthContext';

function AppRoutes() {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const isAdminEmail = user?.email === 'tumelomak0813@gmail.com';
  const isAuthorizedAdmin = userData?.role === 'admin' || isAdminEmail;

  // If user is logged in but has no profile data (and isn't the admin who gets auto-created)
  // redirect them to register to complete their profile.
  const needsProfile = user && !userData && !isAdminEmail;

  return (
    <Layout userRole={userData?.role}>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user || needsProfile ? <Register /> : <Navigate to="/dashboard" />} />
        
        <Route path="/dashboard" element={user && !needsProfile ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user && !needsProfile ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/admin" element={isAuthorizedAdmin ? <Admin /> : <Navigate to="/login" />} />
        
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}




