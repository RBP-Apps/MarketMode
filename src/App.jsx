"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import AdminDashboard from "./pages/admin/Dashboard"
import AdminAssignTask from "./pages/admin/AssignTask"
import SurveyReportPage from "./pages/SurveyReport"
import QuotationsendPage from "./pages/Quatationsend"
import FollowupPage from "./pages/Followup"
import OrderPlacePage from "./pages/OrderPlace"
import IPAssigmentPage from "./pages/IPAssigment"
import DispatchmaterialPage from "./pages/Dispatchmaterial"
import InformToCustomerPage from "./pages/InformToCustomer"
import MaterialreceivedPage from "./pages/Materialreceived"
import InstallationPage from "./pages/Installation"
import BillingPage from "./pages/Billing"
import CspdclForSynconizationPage from "./pages/CspdclForSynconization"
import InspectionPage from "./pages/Inspection"
import ProjectCommissioningPage from "./pages/ProjectCommissioning"
import RedemptionPage from "./pages/Redemption"
import SubsidyDisbursalPage from "./pages/SubsidyDisbursal"
import PaymentPage from "./pages/Payment"
import EnergyAnalysis from "./pages/EnergyAnalysis"
import AnalysisGraphPage from "./pages/Analysisgraph"
import { DeviceProvider } from "./pages/graph/DeviceContext"
import AllGraph from "./pages/AllGraph"

import "./index.css"

// Auth wrapper component to protect routes
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const username = sessionStorage.getItem("username")
  const userRole = sessionStorage.getItem("role")

  // If no user is logged in, redirect to login
  if (!username) {
    return <Navigate to="/login" replace />
  }

  // If this is an admin-only route and user is not admin, redirect to tasks
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard/admin" replace />
  }

  return children
}

function App() {

  return (
    <DeviceProvider>
      <Router>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Login route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Dashboard redirect */}
          <Route path="/dashboard" element={<Navigate to="/dashboard/admin" replace />} />

          {/* Admin & User Dashboard route */}
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Assign Task route - only for admin */}
          <Route
            path="/dashboard/assign-task"
            element={
              <ProtectedRoute allowedRoles={["admin", "user"]}>
                <AdminAssignTask />
              </ProtectedRoute>
            }
          />

          {/* Survey Report route for user */}
          <Route
            path="/dashboard/SurveyReport"
            element={
              <ProtectedRoute>
                <SurveyReportPage />
              </ProtectedRoute>
            }
          />
          {/*Quotationsend route for user */}
          <Route
            path="/dashboard/Quotationsend"
            element={
              <ProtectedRoute>
                <QuotationsendPage />
              </ProtectedRoute>
            }
          />
          {/*Follow up route for user */}
          <Route
            path="/dashboard/Followup"
            element={
              <ProtectedRoute>
                <FollowupPage />
              </ProtectedRoute>
            }
          />

          {/*Order Place route for user */}
          <Route
            path="/dashboard/OrderPlace"
            element={
              <ProtectedRoute>
                <OrderPlacePage />
              </ProtectedRoute>
            }
          />

          {/*IP Assignment route for user */}
          <Route
            path="/dashboard/IPAssigment"
            element={
              <ProtectedRoute>
                <IPAssigmentPage />
              </ProtectedRoute>
            }
          />

          {/*Dispatchmaterial route for user */}
          <Route
            path="/dashboard/Dispatchmaterial"
            element={
              <ProtectedRoute>
                <DispatchmaterialPage />
              </ProtectedRoute>
            }
          />

          {/*InformToCustomer route for user */}
          <Route
            path="/dashboard/InformToCustomer"
            element={
              <ProtectedRoute>
                <InformToCustomerPage />
              </ProtectedRoute>
            }
          />

          {/*Materialreceived route for user */}
          <Route
            path="/dashboard/Materialreceived"
            element={
              <ProtectedRoute>
                <MaterialreceivedPage />
              </ProtectedRoute>
            }
          />

          {/*Installation route for user */}
          <Route
            path="/dashboard/Installation"
            element={
              <ProtectedRoute>
                <InstallationPage />
              </ProtectedRoute>
            }
          />

          {/*Billing route for user */}
          <Route
            path="/dashboard/Billing"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />

          {/*CspdclForSynconization route for user */}
          <Route
            path="/dashboard/CspdclForSynconization"
            element={
              <ProtectedRoute>
                <CspdclForSynconizationPage />
              </ProtectedRoute>
            }
          />

          {/*Inspection route for user */}
          <Route
            path="/dashboard/Inspection"
            element={
              <ProtectedRoute>
                <InspectionPage />
              </ProtectedRoute>
            }
          />

          {/*ProjectCommissioning route for user */}
          <Route
            path="/dashboard/ProjectCommissioning"
            element={
              <ProtectedRoute>
                <ProjectCommissioningPage />
              </ProtectedRoute>
            }
          />

          {/*Redemption route for user */}
          <Route
            path="/dashboard/Redemption"
            element={
              <ProtectedRoute>
                <RedemptionPage />
              </ProtectedRoute>
            }
          />

          {/*SubsidyDisbursal route for user */}
          <Route
            path="/dashboard/SubsidyDisbursal"
            element={
              <ProtectedRoute>
                <SubsidyDisbursalPage />
              </ProtectedRoute>
            }
          />

          {/*Payment route for user */}
          <Route
            path="/dashboard/Payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/energy-analysis"
            element={
              <ProtectedRoute>
                <EnergyAnalysis />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/analysis-graph"
            element={
              <ProtectedRoute>
                <AnalysisGraphPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/all-graph"
            element={
              <ProtectedRoute>
                <AllGraph />
              </ProtectedRoute>
            }
          />


          {/* Backward compatibility redirects */}
          <Route path="/admin/*" element={<Navigate to="/dashboard/admin" replace />} />
          <Route path="/admin/dashboard" element={<Navigate to="/dashboard/admin" replace />} />
          <Route path="/admin/assign-task" element={<Navigate to="/dashboard/assign-task" replace />} />
          <Route path="/user/*" element={<Navigate to="/dashboard/admin" replace />} />
        </Routes>
      </Router>
    </DeviceProvider>
  )
}

export default App