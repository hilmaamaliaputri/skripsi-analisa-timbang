import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CaptureQR from './pages/CaptureQR'
import CaptureOCR from './pages/CaptureOCR'
import Review from './pages/Review'
import History from './pages/History'
import Detail from './pages/Detail'
import Settings from './pages/Settings'
import { useAuth } from './store/auth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'login', element: <Login /> },
      { path: 'dashboard', element: <RequireAuth><Dashboard /></RequireAuth> },
      { path: 'capture/qr', element: <RequireAuth><CaptureQR /></RequireAuth> },
      { path: 'capture/ocr', element: <RequireAuth><CaptureOCR /></RequireAuth> },
      { path: 'capture/review', element: <RequireAuth><Review /></RequireAuth> },
      { path: 'history', element: <RequireAuth><History /></RequireAuth> },
      { path: 'history/:id', element: <RequireAuth><Detail /></RequireAuth> },
      { path: 'settings', element: <RequireAuth><Settings /></RequireAuth> },
    ],
  },
])
