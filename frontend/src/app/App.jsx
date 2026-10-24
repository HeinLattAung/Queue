import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AdminLayout from "../shared/layout/AdminLayout";
import LoginPage from "../features/auth/pages/LoginPage";
import SignupPage from "../features/auth/pages/SignupPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import CalendarPage from "../features/bookings/pages/CalendarPage";
import CustomersPage from "../features/customers/pages/CustomersPage";
import StatsPage from "../features/analytics/pages/StatsPage";
import SettingsPage from "../features/business/pages/SettingsPage";
import ProfilePage from "../features/profile/pages/ProfilePage";
import QRLinksPage from "../features/business/pages/QRLinksPage";
import BookingScanPage from "../features/bookings/pages/BookingScanPage";
import CustomerLayout from "../shared/layout/CustomerLayout";
import WaitlistPage from "../features/queue/pages/WaitlistPage";
import WaitlistStatusPage from "../features/queue/pages/WaitlistStatusPage";
import BookingPage from "../features/bookings/pages/BookingPage";
import MealBookingPage from "../features/bookings/pages/MealBookingPage";
import BookingStatusPage from "../features/bookings/pages/BookingStatusPage";
import LandingPage from "../features/home/pages/LandingPage";
import CustomerLoginPage from "../features/auth/pages/CustomerLoginPage";
import CustomerSignupPage from "../features/auth/pages/CustomerSignupPage";
import CustomerHomePage from "../features/home/pages/CustomerHomePage";
import JoinQueuePage from "../features/queue/pages/JoinQueuePage";
import QueueStatusPage from "../features/queue/pages/QueueStatusPage";
import OrderPage from "../features/orders/pages/OrderPage";

function App() {
  const { pathname } = useLocation();
  const customer =
    pathname.startsWith("/customer") ||
    [
      "/join",
      "/order",
      "/booking",
      "/booking/meal",
      "/booking/status",
      "/waitlist",
      "/waitlist/status",
    ].includes(pathname);
  return (
    <div className={customer ? "guest-surface" : ""}>
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
    </div>
  );
}

export default App;
