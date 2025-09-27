
import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import UpdatePasswordPage from '@/pages/UpdatePasswordPage';
import Dashboard from '@/pages/Dashboard';
import DeviceManagement from '@/pages/DeviceManagement';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import SensorCalibrationPage from '@/pages/SensorCalibrationPage';
import AuditLogsPage from '@/pages/AuditLogsPage';
import DataExportPage from '@/pages/DataExportPage';
import RealTimeSensorView from '@/pages/RealTimeSensorView_Fixed';
import UserManagementPage from '@/pages/UserManagementPage';
import SystemAdminPage from '@/pages/SystemAdminPage';
import APIDocumentationPage from '@/pages/APIDocumentationPage'; 
import CustomAlertRulesPage from '@/pages/CustomAlertRulesPage'; 
import AlertTemplatesPage from '@/pages/AlertTemplatesPage'; 
import OrganizationSettingsPage from '@/pages/OrganizationSettingsPage';
import OrganizationInvitesPage from '@/pages/OrganizationInvitesPage';
import AcceptInvitePage from '@/pages/AcceptInvitePage';
import { Loader2 } from 'lucide-react';

const WaterBubbleBackground = () => {
  useEffect(() => {
    const bubbleContainer = document.createElement('div');
    bubbleContainer.className = 'water-bubble-background';
    document.body.appendChild(bubbleContainer);

    const createBubble = () => {
      if (!document.body.contains(bubbleContainer)) return; 
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const size = Math.random() * 60 + 20; 
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${Math.random() * 100}vw`;
      bubble.style.animationDuration = `${Math.random() * 5 + 8}s`; 
      bubble.style.animationDelay = `${Math.random() * 3}s`;
      bubbleContainer.appendChild(bubble);

      setTimeout(() => {
        if (bubbleContainer.contains(bubble)) {
          bubble.remove();
        }
      }, parseFloat(bubble.style.animationDuration) * 1000 + parseFloat(bubble.style.animationDelay) * 1000 + 100); // Add buffer
    };

    const intervalId = setInterval(createBubble, 700); 

    return () => {
      clearInterval(intervalId);
      if (document.body.contains(bubbleContainer)) {
        document.body.removeChild(bubbleContainer);
      }
    };
  }, []);

  return null;
};

const ThemeApplicator = () => {
  const { preferences, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && preferences) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(preferences.theme || 'dark');
    }
  }, [preferences, authLoading]);
  return null;
};

const AppContent = () => {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <ThemeApplicator />
      <WaterBubbleBackground />
      <Router>
        <div className="min-h-screen">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />
            
            <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/devices" element={<ProtectedRoute><Layout><DeviceManagement /></Layout></ProtectedRoute>} />
            <Route path="/realtime-sensors" element={<ProtectedRoute><Layout><RealTimeSensorView /></Layout></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
            <Route path="/calibration" element={<ProtectedRoute><Layout><SensorCalibrationPage /></Layout></ProtectedRoute>} />
            <Route path="/export-data" element={<ProtectedRoute><Layout><DataExportPage /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="/api-docs" element={<ProtectedRoute><Layout><APIDocumentationPage /></Layout></ProtectedRoute>} />
            <Route path="/alert-rules" element={<ProtectedRoute><Layout><CustomAlertRulesPage /></Layout></ProtectedRoute>} />
            <Route path="/alert-templates" element={<ProtectedRoute><Layout><AlertTemplatesPage /></Layout></ProtectedRoute>} />

            <Route path="/user-management" element={<ProtectedRoute requiredRole="admin"><Layout><UserManagementPage /></Layout></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute requiredRole="admin"><Layout><AuditLogsPage /></Layout></ProtectedRoute>} />
            <Route path="/system-admin" element={<ProtectedRoute requiredRole="admin"><Layout><SystemAdminPage /></Layout></ProtectedRoute>} />
            <Route path="/organization-settings" element={<ProtectedRoute requiredRole="admin"><Layout><OrganizationSettingsPage /></Layout></ProtectedRoute>} />
            <Route path="/organization-invites" element={<ProtectedRoute requiredRole="admin"><Layout><OrganizationInvitesPage /></Layout></ProtectedRoute>} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </>
  );
}


function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
