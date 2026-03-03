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
import BookingScanPage from './pages/BookingScanPage';
import CustomerLayout from './pages/customer/CustomerLayout';
import WaitlistPage from './pages/customer/WaitlistPage';
import WaitlistStatusPage from './pages/customer/WaitlistStatusPage';
import BookingPage from './pages/customer/BookingPage';
import MealBookingPage from './pages/customer/MealBookingPage';
import BookingStatusPage from './pages/customer/BookingStatusPage';
import LandingPage from './pages/LandingPage';
import CustomerLoginPage from './pages/customer/CustomerLoginPage';
import CustomerSignupPage from './pages/customer/CustomerSignupPage';
import CustomerHomePage from './pages/customer/CustomerHomePage';
import JoinQueuePage from './pages/customer/JoinQueuePage';
import QueueStatusPage from './pages/customer/QueueStatusPage';
import OrderPage from './pages/customer/OrderPage';

function App() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Customer Auth */}
      <Route path="/customer/login" element={<CustomerLoginPage />} />
      <Route path="/customer/signup" element={<CustomerSignupPage />} />
      <Route path="/customer/home" element={<CustomerHomePage />} />

      {/* Queue (QR scan flow — standalone pages, no CustomerLayout) */}
      <Route path="/join" element={<JoinQueuePage />} />
      <Route path="/queue/status" element={<QueueStatusPage />} />
      <Route path="/order" element={<OrderPage />} />

      {/* Admin Portal */}
      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/qr-links" element={<QRLinksPage />} />
        <Route path="/scan" element={<BookingScanPage />} />
      </Route>

      {/* Customer Portal (Public) */}
      <Route element={<CustomerLayout />}>
        <Route path="/waitlist" element={<WaitlistPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/booking/meal" element={<MealBookingPage />} />
        <Route path="/booking/status" element={<BookingStatusPage />} />
        <Route path="/waitlist/status" element={<WaitlistStatusPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
