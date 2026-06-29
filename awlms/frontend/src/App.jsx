import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HrOnlyRoute from './components/HrOnlyRoute.jsx';
import HrLayout from './layouts/HrLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ApplicantPortalPage from './pages/ApplicantPortalPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HomeRedirect from './pages/HomeRedirect.jsx';
import HrDashboardHome from './pages/hr/HrDashboardHome.jsx';
import HrRecruitmentModule from './pages/hr/HrRecruitmentModule.jsx';
import HrAiReportsPage from './pages/hr/HrAiReportsPage.jsx';
import HrEmployeesPage from './pages/hr/HrEmployeesPage.jsx';
import HrHistoryPage from './pages/hr/HrHistoryPage.jsx';
import HrSettingsPage from './pages/hr/HrSettingsPage.jsx';
import HrDocumentVerificationPage from './pages/hr/HrDocumentVerificationPage.jsx';
import HrAiChatPage from './pages/hr/HrAiChatPage.jsx';
import HrMessagesPage from './pages/hr/HrMessagesPage.jsx';
import EmployeeOnlyRoute from './components/EmployeeOnlyRoute.jsx';
import EmployeeLayout from './layouts/EmployeeLayout.jsx';
import EmployeeDashboardHome from './pages/employee/EmployeeDashboardHome.jsx';
import EmployeeNotificationsPage from './pages/employee/EmployeeNotificationsPage.jsx';
import EmployeeDirectoryPage from './pages/employee/EmployeeDirectoryPage.jsx';
import EmployeeSettingsPage from './pages/employee/EmployeeSettingsPage.jsx';
import ApplyPage from './pages/public/ApplyPage.jsx';
import ApplicantDocumentsPage from './pages/public/ApplicantDocumentsPage.jsx';
import CareersPage from './pages/public/CareersPage.jsx';
import InterviewPage from './pages/public/InterviewPage.jsx';
import ApplicantVerificationPage from './pages/public/ApplicantVerificationPage.jsx';
import ApplicantRegisterPage from './pages/public/ApplicantRegisterPage.jsx';
import ManagerOnlyRoute from './components/ManagerOnlyRoute.jsx';
import ManagerLayout from './layouts/ManagerLayout.jsx';
import ManagerHome from './pages/manager/ManagerHome.jsx';
import ManagerEmployeesPage from './pages/manager/ManagerEmployeesPage.jsx';
import ManagerSettingsPage from './pages/manager/ManagerSettingsPage.jsx';
import AdminOnlyRoute from './components/AdminOnlyRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminHrAccounts from './pages/admin/AdminHrAccounts.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/apply/:jobId" element={<ApplyPage />} />
          <Route path="/applicant-documents" element={<ApplicantDocumentsPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/interview/:token" element={<InterviewPage />} />
          <Route path="/verify-email" element={<ApplicantVerificationPage />} />
          <Route path="/register" element={<ApplicantRegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/applicant-portal" element={<ApplicantPortalPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/hr" element={<HrOnlyRoute />}>
              <Route element={<HrLayout />}>
                <Route index element={<HrDashboardHome />} />
                <Route path="recruitment" element={<HrRecruitmentModule />} />
                <Route path="ai-reports" element={<HrAiReportsPage />} />
                <Route path="documents" element={<HrDocumentVerificationPage />} />
                <Route path="employees" element={<HrEmployeesPage />} />
                <Route path="messages" element={<HrMessagesPage />} />
                <Route path="history" element={<HrHistoryPage />} />
                <Route path="settings" element={<HrSettingsPage />} />
                <Route path="ai-chat" element={<HrAiChatPage variant="hr" />} />
              </Route>
            </Route>
            <Route path="/employee" element={<EmployeeOnlyRoute />}>
              <Route element={<EmployeeLayout />}>
                <Route index element={<EmployeeDashboardHome />} />
                <Route path="notifications" element={<EmployeeNotificationsPage />} />
                <Route path="directory" element={<EmployeeDirectoryPage />} />
                <Route path="settings" element={<EmployeeSettingsPage />} />
                <Route path="ai-chat" element={<HrAiChatPage variant="employee" />} />
              </Route>
            </Route>
            <Route path="/manager" element={<ManagerOnlyRoute />}>
              <Route element={<ManagerLayout />}>
                <Route index element={<ManagerHome />} />
                <Route path="employees" element={<ManagerEmployeesPage />} />
                <Route path="settings" element={<ManagerSettingsPage />} />
                <Route path="ai-chat" element={<HrAiChatPage variant="manager" />} />
              </Route>
            </Route>
            <Route path="/admin" element={<AdminOnlyRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="hr-accounts" element={<AdminHrAccounts />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
