import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import CustomersPage from './pages/CustomersPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import QRLinksPage from './pages/QRLinksPage';
import CustomerLayout from './pages/customer/CustomerLayout';
import WaitlistPage from './pages/customer/WaitlistPage';
import WaitlistStatusPage from './pages/customer/WaitlistStatusPage';
import BookingPage from './pages/customer/BookingPage';

function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Admin Portal */}
      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/qr-links" element={<QRLinksPage />} />
      </Route>

      {/* Customer Portal (Public) */}
      <Route element={<CustomerLayout />}>
        <Route path="/waitlist" element={<WaitlistPage />} />
        <Route path="/booking" element={<BookingPage />} />
      </Route>
      <Route path="/waitlist/status/:id" element={<WaitlistStatusPage />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
