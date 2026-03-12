import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthGuard from "./components/AuthGuard";

const TrainerLogin = lazy(() => import("./pages/TrainerLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const MemberLogin = lazy(() => import("./pages/MemberLogin"));
const MemberDashboard = lazy(() => import("./pages/MemberDashboard"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">로딩 중...</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  );
}
