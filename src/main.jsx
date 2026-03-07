import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import TrainerLogin from './pages/TrainerLogin.jsx'
import AuthGuard from './components/AuthGuard.jsx'
import MemberLogin from './pages/MemberLogin.jsx'
import MemberDashboard from './pages/MemberDashboard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<TrainerLogin />} />
        <Route path="/admin" element={<AuthGuard><App /></AuthGuard>} />
        <Route path="/member" element={<MemberLogin />} />
        <Route path="/member/dashboard" element={<MemberDashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
