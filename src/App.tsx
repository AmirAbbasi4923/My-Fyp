import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import SplashScreen from "@/components/SplashScreen";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import Home from "@/pages/Home";
import DoctorSignup from "@/pages/DoctorSignup";
import DoctorDashboard from "@/pages/DoctorDashboard";
import PatientPortal from "@/pages/PatientPortal";
import AdminPanel from "@/pages/AdminPanel";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/doctor-signup" element={<DoctorSignup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/home" element={<Home />} />
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="/patient-portal" element={<PatientPortal />} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
