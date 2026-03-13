"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import AdminDashboard from "./pages/admin/Dashboard"
import AdminAssignTask from "./pages/admin/AssignTask"
import UserDashboard from "./pages/user/Dashboard"
import UserTasks from "./pages/user/Tasks"
import AdminLayout from "./components/layout/AdminLayout"
import UserLayout from "./components/layout/UserLayout"
import AllTasks from "./pages/admin/AllTasks"
import "./index.css"

// Authentication wrapper component
const PrivateRoute = ({ children, allowedRoles }) => {
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const userData = sessionStorage.getItem('userData')
    if (userData) {
      const parsedUserData = JSON.parse(userData)
      setIsAuthenticated(true)
      setUserRole(parsedUserData.role)
    }
  }, [])

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!allowedRoles.includes(userRole)) {
    // Redirect to unauthorized page or dashboard based on role
    return userRole === 'admin' 
      ? <Navigate to="/admin/dashboard" replace /> 
      : <Navigate to="/user/dashboard" replace />
  }

  return children
}

function App() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Check for user preference
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      setDarkMode(true)
      document.documentElement.classList.add("dark")
    } else {
      setDarkMode(false)
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (darkMode) {
      document.documentElement.classList.remove("dark")
      localStorage.theme = "light"
    } else {
      document.documentElement.classList.add("dark")
      localStorage.theme = "dark"
    }
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <Navigate to="/admin/dashboard" replace />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <AdminDashboard />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/assign-task"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <AdminAssignTask />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/tasks"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <AllTasks />
              </AdminLayout>
            </PrivateRoute>
          }
        />

        {/* User Routes */}
        <Route
          path="/user"
          element={
            <PrivateRoute allowedRoles={['user']}>
              <UserLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <Navigate to="/user/dashboard" replace />
              </UserLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/user/dashboard"
          element={
            <PrivateRoute allowedRoles={['user']}>
              <UserLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <UserDashboard />
              </UserLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/user/tasks"
          element={
            <PrivateRoute allowedRoles={['user']}>
              <UserLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <UserTasks />
              </UserLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App