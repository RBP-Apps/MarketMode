"use client"

import { useState, useEffect } from "react"

import {
  BarChart3,
  CheckCircle2,
  Clock,
  ListTodo,
  AlertTriangle,
  Filter,
  Wrench,
  Network,
  RefreshCw,
  DollarSign,
} from "lucide-react"

import AdminLayout from "../../components/layout/AdminLayout.jsx"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export default function FMSDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // State for FMS data
  const [fmsData, setFmsData] = useState({
    totalEnquiry: 0,
    installation: 0,
    pendingInstallation: 0,
    commissions: 0,
    ipAssignment: 0,
    projectTypesData: [],
    allRecords: [],
    loading: true,
    error: null,
  })

  // Safe access to cell value
  const getCellValue = (row, index) => {
    if (!row || !row.c || index >= row.c.length) return null
    const cell = row.c[index]
    return cell && "v" in cell ? cell.v : null
  }

  // Check if value is not null or empty
  const isNotNull = (value) => {
    return value !== null && value !== undefined && value !== "" && value !== 0
  }

  // Fetch FMS data from Google Sheets
  const fetchFMSData = async () => {
    try {
      setFmsData((prev) => ({ ...prev, loading: true, error: null }))
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4/gviz/tq?tqx=out:json&sheet=FMS`,
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch FMS sheet data: ${response.status}`)
      }

      const text = await response.text()
      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}")
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonString)

      console.log("Fetched FMS data:", {
        totalRows: data.table.rows.length,
        firstFewRows: data.table.rows.slice(2).map((row, idx) => ({
          rowIndex: idx,
          rowData: row.c ? row.c.map((cell) => cell?.v) : row,
        })),
      })

      // Initialize counters
      let totalEnquiry = 0
      let installation = 0
      let pendingInstallation = 0
      let commissions = 0
      let ipAssignment = 0

      // Project types tracking
      const projectTypesCount = {
        Residential: 0,
        Society: 0,
        Commercial: 0,
        Others: 0,
      }

      const allRecords = []

      // Process rows starting from row 11 (slice from index 10)
      data.table.rows.slice(2).forEach((row, index) => {
        const rowIndex = index + 2 // Adjust for original row index

        // Column B (index 1) - Total Enquiry
        const enquiryValue = getCellValue(row, 1)
        if (isNotNull(enquiryValue)) {
          totalEnquiry++
        }

        // Installation logic: CA (index 78) NOT NULL AND CB (index 79) NOT NULL
        const caValue = getCellValue(row, 78) // Column CA
        const cbValue = getCellValue(row, 79) // Column CB

        if (isNotNull(caValue) && isNotNull(cbValue)) {
          installation++
        }

        // Pending Installation: CA (index 78) NOT NULL AND CB (index 79) NULL
        if (isNotNull(caValue) && !isNotNull(cbValue)) {
          pendingInstallation++
        }

        // Commissions: DM (index 116) NOT NULL AND DN (index 117) NOT NULL
        const dmValue = getCellValue(row, 116) // Column DM
        const dnValue = getCellValue(row, 117) // Column DN

        if (isNotNull(dmValue) && isNotNull(dnValue)) {
          commissions++
        }

        // IP Assignment: BB (index 53) NOT NULL AND BC (index 54) NOT NULL
        const bbValue = getCellValue(row, 53) // Column BB
        const bcValue = getCellValue(row, 54) // Column BC

        if (isNotNull(bbValue) && isNotNull(bcValue)) {
          ipAssignment++
        }

        // Project Types from Column R (index 17)
        const projectType = getCellValue(row, 17)
        if (projectType && typeof projectType === "string") {
          const type = projectType.trim()
          if (projectTypesCount.hasOwnProperty(type)) {
            projectTypesCount[type]++
          } else {
            projectTypesCount["Others"]++
          }
        }

        // Store record for filtering/searching
        if (isNotNull(enquiryValue)) {
          allRecords.push({
            id: rowIndex,
            enquiry: enquiryValue,
            projectType: projectType || "Unknown",
            caValue,
            cbValue,
            bbValue,
            bcValue,
            dmValue,
            dnValue,
            installationStatus:
              isNotNull(caValue) && isNotNull(cbValue) ? "Completed" : isNotNull(caValue) ? "Pending" : "Not Started",
            ipStatus: isNotNull(bbValue) && isNotNull(bcValue) ? "Assigned" : "Not Assigned",
            commissionStatus: isNotNull(dmValue) && isNotNull(dnValue) ? "Completed" : "Pending",
          })
        }
      })

      // Convert project types to chart data
      const projectTypesData = Object.entries(projectTypesCount)
        .filter(([type, count]) => count > 0)
        .map(([type, count]) => ({
          name: type,
          value: count,
          color:
            type === "Residential"
              ? "#8b5cf6"
              : type === "Society"
                ? "#06b6d4"
                : type === "Commercial"
                  ? "#f59e0b"
                  : "#ef4444",
        }))

      setFmsData({
        totalEnquiry,
        installation,
        pendingInstallation,
        commissions,
        ipAssignment,
        projectTypesData,
        allRecords,
        loading: false,
        error: null,
      })

      console.log("FMS Data Summary:", {
        totalEnquiry,
        installation,
        pendingInstallation,
        commissions,
        ipAssignment,
        projectTypesData,
      })
    } catch (error) {
      console.error("Error fetching FMS data:", error)
      setFmsData((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }))
    }
  }

  useEffect(() => {
    fetchFMSData()
  }, [])

  // Filter records based on search and status
  const filteredRecords = fmsData.allRecords.filter((record) => {
    // Filter by status
    if (filterStatus !== "all") {
      if (filterStatus === "installation-complete" && record.installationStatus !== "Completed") return false
      if (filterStatus === "installation-pending" && record.installationStatus !== "Pending") return false
    }

    // Filter by search query
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      if (record.projectType && record.projectType.toLowerCase().includes(query)) return true
      if (record.enquiry && record.enquiry.toString().toLowerCase().includes(query)) return true
      if (record.installationStatus && record.installationStatus.toLowerCase().includes(query)) return true
      return false
    }

    return true
  })

  // Project Types Chart Component
  const ProjectTypesChart = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={fmsData.projectTypesData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {fmsData.projectTypesData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  // Installation Chart
  const InstallationChart = () => {
    const chartData = [
      {
        name: "Installation",
        Completed: fmsData.installation,
        Pending: fmsData.pendingInstallation,
      },
    ]

    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" fontSize={12} stroke="#888888" tickLine={false} axisLine={false} />
          <YAxis fontSize={12} stroke="#888888" tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Records Table Component
  const RecordsTable = () => {
    return (
      <div className="rounded-xl border border-purple-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-purple-100">
            <thead className="bg-gradient-to-r from-purple-50 to-violet-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider"
                >
                  Enquiry ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider"
                >
                  Project Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider"
                >
                  Installation
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider"
                >
                  IP Assignment
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider"
                >
                  Commission
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-purple-50">
              {filteredRecords.slice(0, 100).map((record) => (
                <tr key={record.id} className="hover:bg-purple-25 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.enquiry}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.projectType}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        record.installationStatus === "Completed"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : record.installationStatus === "Pending"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-gray-100 text-gray-800 border border-gray-200"
                      }`}
                    >
                      {record.installationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        record.ipStatus === "Assigned"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {record.ipStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        record.commissionStatus === "Completed"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {record.commissionStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRecords.length > 100 && (
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-violet-50 border-t border-purple-100">
            <p className="text-sm text-purple-600 font-medium">Showing first 100 of {filteredRecords.length} records</p>
          </div>
        )}
      </div>
    )
  }

  if (fmsData.loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
              <div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-400 rounded-full animate-spin mx-auto"
                style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
              ></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-purple-700">Loading FMS Dashboard</h3>
              <p className="text-purple-600">Fetching latest data from Google Sheets...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (fmsData.error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-red-700">Error Loading Data</h3>
              <p className="text-red-600 text-sm">{fmsData.error}</p>
            </div>
            <button
              onClick={fetchFMSData}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Loading
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8 p-6">
        {/* Header */}
        {/* Main Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <ListTodo className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">Total Enquiry</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-blue-700">{fmsData.totalEnquiry}</p>
                <p className="text-sm text-blue-600">Total enquiries received</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Wrench className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-600">Installation</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-emerald-700">{fmsData.installation}</p>
                <p className="text-sm text-emerald-600">Completed installations</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-amber-600">Pending Installation</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-amber-700">{fmsData.pendingInstallation}</p>
                <p className="text-sm text-amber-600">Awaiting installation</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">Commissions</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-green-700">{fmsData.commissions}</p>
                <p className="text-sm text-green-600">Completed commissions</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Network className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-purple-600">IP Assignment</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-purple-700">{fmsData.ipAssignment}</p>
                <p className="text-sm text-purple-600">IP addresses assigned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <div className="flex space-x-1 bg-purple-100 p-1 rounded-xl">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "analytics", label: "Analytics", icon: CheckCircle2 },
              { id: "records", label: "Records", icon: ListTodo },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-200 font-medium ${
                  activeTab === tab.id
                    ? "bg-white text-purple-700 shadow-md"
                    : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-7">
                <div className="lg:col-span-4 rounded-2xl border border-purple-200 shadow-lg bg-white overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 p-6">
                    <h3 className="text-lg font-semibold text-purple-700">Installation Status</h3>
                    <p className="text-purple-600 text-sm mt-1">Completed and pending installations</p>
                  </div>
                  <div className="p-6">
                    <InstallationChart />
                  </div>
                </div>

                <div className="lg:col-span-3 rounded-2xl border border-purple-200 shadow-lg bg-white overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 p-6">
                    <h3 className="text-lg font-semibold text-purple-700">Project Types</h3>
                    <p className="text-purple-600 text-sm mt-1">Distribution by project category</p>
                  </div>
                  <div className="p-6">
                    <ProjectTypesChart />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="rounded-2xl border border-purple-200 shadow-lg bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 p-6">
                <h3 className="text-lg font-semibold text-purple-700">FMS Analytics</h3>
                <p className="text-purple-600 text-sm mt-1">Detailed performance metrics and insights</p>
              </div>
              <div className="p-6">
                <div className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
                      <div className="text-sm font-semibold text-purple-700">Installation Rate</div>
                      <div className="text-2xl font-bold text-purple-800">
                        {fmsData.totalEnquiry > 0
                          ? ((fmsData.installation / fmsData.totalEnquiry) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                      <div className="w-full h-3 bg-purple-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${fmsData.totalEnquiry > 0 ? (fmsData.installation / fmsData.totalEnquiry) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                      <div className="text-sm font-semibold text-blue-700">IP Assignment Rate</div>
                      <div className="text-2xl font-bold text-blue-800">
                        {fmsData.totalEnquiry > 0
                          ? ((fmsData.ipAssignment / fmsData.totalEnquiry) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                      <div className="w-full h-3 bg-blue-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${fmsData.totalEnquiry > 0 ? (fmsData.ipAssignment / fmsData.totalEnquiry) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                      <div className="text-sm font-semibold text-green-700">Commission Rate</div>
                      <div className="text-2xl font-bold text-green-800">
                        {fmsData.totalEnquiry > 0 ? ((fmsData.commissions / fmsData.totalEnquiry) * 100).toFixed(1) : 0}
                        %
                      </div>
                      <div className="w-full h-3 bg-green-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${fmsData.totalEnquiry > 0 ? (fmsData.commissions / fmsData.totalEnquiry) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-6">
                    <h4 className="text-lg font-semibold text-purple-700 mb-6">Performance Summary</h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                      {[
                        { label: "Total Enquiries Processed", value: fmsData.totalEnquiry, color: "purple" },
                        { label: "Installations Completed", value: fmsData.installation, color: "emerald" },
                        { label: "Pending Installations", value: fmsData.pendingInstallation, color: "amber" },
                        { label: "Commissions Completed", value: fmsData.commissions, color: "green" },
                        { label: "IP Assignments", value: fmsData.ipAssignment, color: "blue" },
                      ].map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-white rounded-lg border border-purple-100"
                        >
                          <span className="text-sm text-gray-600 font-medium">{item.label}</span>
                          <span className={`font-bold text-${item.color}-700`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "records" && (
            <div className="rounded-2xl border border-purple-200 shadow-lg bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 p-6">
                <h3 className="text-lg font-semibold text-purple-700">FMS Records</h3>
                <p className="text-purple-600 text-sm mt-1">Detailed view of all FMS records</p>
              </div>
              <div className="p-6">
                <div className="flex flex-col gap-4 md:flex-row mb-6">
                  <div className="flex-1 space-y-2">
                    <label htmlFor="search" className="flex items-center text-purple-700 font-medium">
                      <Filter className="h-4 w-4 mr-2" />
                      Search Records
                    </label>
                    <input
                      id="search"
                      placeholder="Search by enquiry ID, project type, or status"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-purple-200 p-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2 md:w-[200px]">
                    <label htmlFor="status-filter" className="flex items-center text-purple-700 font-medium">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter by Status
                    </label>
                    <select
                      id="status-filter"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-xl border border-purple-200 p-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    >
                      <option value="all">All Records</option>
                      <option value="installation-complete">Installation Complete</option>
                      <option value="installation-pending">Installation Pending</option>
                    </select>
                  </div>
                </div>

                {filteredRecords.length === 0 ? (
                  <div className="text-center p-12 text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ListTodo className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium">No records found</p>
                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  <div className="overflow-hidden" style={{ maxHeight: "600px", overflowY: "auto" }}>
                    <RecordsTable />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
