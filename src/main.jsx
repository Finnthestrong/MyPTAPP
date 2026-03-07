import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import MemberLogin from './pages/MemberLogin.jsx'
import MemberDashboard from './pages/MemberDashboard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<App />} />
        <Route path="/member" element={<MemberLogin />} />
        <Route path="/member/dashboard" element={<MemberDashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
