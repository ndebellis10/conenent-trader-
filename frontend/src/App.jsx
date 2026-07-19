import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, RequireAuth } from './contexts/AuthContext'
import CookieBanner from './components/CookieBanner'
import Privacy      from './pages/Privacy'
import Terms        from './pages/Terms'
import LandingPage       from './pages/LandingPage'
import LoginPage         from './pages/LoginPage'
import SignupPage        from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import WelcomePage       from './pages/WelcomePage'
import Dashboard         from './pages/app/Dashboard'
import LogTrade          from './pages/app/LogTrade'
import TradeHistory      from './pages/app/TradeHistory'
import Analytics         from './pages/app/Analytics'
import Playbook          from './pages/app/Playbook'
import FaithJournal      from './pages/app/FaithJournal'
import Settings          from './pages/app/Settings'
import DayView           from './pages/app/DayView'
import DailyGoals        from './pages/app/DailyGoals'
import Backtest          from './pages/app/Backtest'
import CourseMaterial    from './pages/app/CourseMaterial'
import TradeView         from './pages/app/TradeView'
import Reports           from './pages/app/Reports'

import News              from './pages/app/News'
import Leaderboard       from './pages/app/Leaderboard'
import AdminUsers        from './pages/app/AdminUsers'
import FaithAI           from './pages/app/FaithAI'
import AppLayout         from './layouts/AppLayout'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#242424', color: '#F5F5F5', border: '1px solid #3A3A3A' },
            success: { iconTheme: { primary: '#3B82F6', secondary: '#1A1A1A' } },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/"                element={<LandingPage />} />
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/signup"          element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/welcome"         element={<WelcomePage />} />
          <Route path="/privacy"         element={<Privacy />} />
          <Route path="/terms"           element={<Terms />} />

          {/* Protected app */}
          <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
            {/* Landing on the app goes to Ask Alan; the dashboard has its own path */}
            <Route index          element={<Navigate to="/app/faith-ai" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="log"     element={<LogTrade />} />
            <Route path="history" element={<TradeHistory />} />
            <Route path="analytics"      element={<Analytics />} />
            <Route path="playbook"       element={<Playbook />} />
            <Route path="faith"          element={<FaithJournal />} />
            <Route path="dayview"        element={<DayView />} />
            <Route path="goals"          element={<DailyGoals />} />
            <Route path="tradeview"      element={<TradeView />} />
            <Route path="news"           element={<News />} />
            <Route path="backtest"       element={<Backtest />} />
            <Route path="course"         element={<CourseMaterial />} />
            <Route path="reports"        element={<Reports />} />
            <Route path="settings"       element={<Settings />} />
            <Route path="leaderboard"   element={<Leaderboard />} />
            <Route path="admin-users"   element={<AdminUsers />} />
            <Route path="faith-ai"      element={<FaithAI />} />
          </Route>
        </Routes>

        {/* Cookie consent banner — shown once, dismissed to localStorage */}
        <CookieBanner />
      </BrowserRouter>
    </AuthProvider>
  )
}
