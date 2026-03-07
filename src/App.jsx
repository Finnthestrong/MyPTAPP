import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TrainerLogin from "./pages/TrainerLogin";
import AuthGuard from "./components/AuthGuard";
import AdminDashboard from "./pages/AdminDashboard";
import MemberLogin from "./pages/MemberLogin";
import MemberDashboard from "./pages/MemberDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/member" replace />} />
        <Route path="/login" element={<TrainerLogin />} />
        <Route
          path="/admin"
          element={
            <AuthGuard>
              <AdminDashboard />
            </AuthGuard>
          }
        />
        <Route path="/member" element={<MemberLogin />} />
        <Route path="/member/dashboard" element={<MemberDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
