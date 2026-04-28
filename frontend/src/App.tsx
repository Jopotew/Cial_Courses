import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'

import { Landing } from '@/pages/Landing'
import { Catalog } from '@/pages/Catalog'
import { CourseDetail } from '@/pages/CourseDetail'
import { NotFound } from '@/pages/NotFound'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { Dashboard } from '@/pages/student/Dashboard'
import { Profile } from '@/pages/student/Profile'
import { AdminOverview } from '@/pages/admin/Overview'
import { AdminCourses } from '@/pages/admin/Courses'
import { AdminUsers } from '@/pages/admin/Users'
import { PaymentResult } from '@/pages/PaymentResult'
import { CourseLearn } from '@/pages/CourseLearn'

function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}

function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

function AdminRoute() {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}

export function App() {
  const { login, isAuthenticated } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      setInitialized(true)
      return
    }
    const token = localStorage.getItem('access_token')
    if (!token) {
      setInitialized(true)
      return
    }
    // Token found — restore user. If 401, the axios interceptor tries refresh automatically.
    authApi.me()
      .then(login)
      .catch(() => {})
      .finally(() => setInitialized(true))
  }, [])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Cargando…</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Auth routes (no navbar) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* MercadoPago back_urls */}
      <Route path="/payment/success" element={<PaymentResult result="success" />} />
      <Route path="/payment/failure" element={<PaymentResult result="failure" />} />
      <Route path="/payment/pending" element={<PaymentResult result="pending" />} />

      {/* Admin routes */}
      <Route element={<AdminRoute />}>
        <Route element={<><Navbar /><AdminLayout /></>}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>
      </Route>

      {/* Main layout routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/courses/:id" element={<CourseDetail />} />

        {/* Protected student routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Course learn — no site navbar, own layout */}
      <Route element={<ProtectedRoute />}>
        <Route path="/courses/:id/learn" element={<CourseLearn />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
