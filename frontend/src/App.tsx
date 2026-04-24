import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { useAuthStore } from '@/store/authStore'

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
  return (
    <Routes>
      {/* Auth routes (no navbar) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
