import React, { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";

const HomeRoute = lazy(() => import('./routes/Home'));
const AboutRoute = lazy(() => import('./routes/About'));
const ContactRoute = lazy(() => import('./routes/Contact'));
const LoginRoute = lazy(() => import('./routes/login'));
const SignUpRoute = lazy(() => import('./routes/SignUp'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminRoute = lazy(() => import('./components/admin/AdminRoute'));
const TradeHistoryRoute = lazy(() => import('./routes/TradeHistory'));
const AutoTradingRoute = lazy(() => import('./routes/AutoTrading'));
const ResetPasswordRoute = lazy(() => import('./routes/ResetPassword'));
const ResetPasswordConfirmRoute = lazy(() => import('./routes/ResetPasswordConfirm'));
const TradeExecutionRoute = lazy(() => import('./routes/TradeExecution'));
const VerifyEmailRoute = lazy(() => import('./routes/VerifyEmail'));

const DefaultLayout: React.FC = () => (
  <div className="bg-gradient-to-b from-indigo-900 via-purple-800 to-black text-white min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);

const MinimalLayout: React.FC = () => (
  <div className="bg-gradient-to-b from-indigo-900 via-purple-800 to-black text-white min-h-screen flex flex-col">
    <main className="flex-1">
      <Outlet />
    </main>
  </div>
);

const App: React.FC = () => {
  const basename = import.meta.env.BASE_URL || "/";

  return (
    <Router
      basename={basename}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <NotificationProvider>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>}>
            <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route element={<MinimalLayout />}>
              <Route path="/about" element={<AboutRoute />} />
              <Route path="/contact" element={<ContactRoute />} />
              <Route path="/auto-trading" element={<AutoTradingRoute />} />
            </Route>
            <Route element={<DefaultLayout />}>
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/signup" element={<SignUpRoute />} />
              <Route path="/reset-password" element={<ResetPasswordRoute />} />
                <Route path="/reset-password/confirm" element={<ResetPasswordConfirmRoute />} />
                <Route path="/verify-email" element={<VerifyEmailRoute />} />
              <Route path="/trade-history" element={<TradeHistoryRoute />} />
              <Route path="/trade-execution" element={<TradeExecutionRoute />} />
              <Route element={<AdminRoute />}>
                <Route path="admin" element={<AdminDashboard />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
