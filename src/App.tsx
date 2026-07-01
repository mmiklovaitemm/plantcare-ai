import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import CollectionPage from './pages/CollectionPage'
import EncyclopediaPage from './pages/EncyclopediaPage'
import SettingsPage from './pages/SettingsPage'
import CalendarPage from './pages/CalendarPage'
import JournalPage from './pages/JournalPage'
import AIChatPage from './pages/AIChatPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard"    element={<DashboardPage />} />
        <Route path="/collection"   element={<CollectionPage />} />
        <Route path="/encyclopedia" element={<EncyclopediaPage />} />
        <Route path="/calendar"     element={<CalendarPage />} />
        <Route path="/journal"      element={<JournalPage />} />
        <Route path="/ai"           element={<AIChatPage />} />
        <Route path="/settings"     element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
