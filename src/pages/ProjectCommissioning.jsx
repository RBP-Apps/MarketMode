"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, Package } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Updated Configuration object
const CONFIG = {
  // Updated Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbw1k2SxGQ3xopYDCGDmZSYFyS3y3mSB5YJhR9SRDO6CavtmGg3h84PRSfwdnHQGt4MV/exec",
  // Updated Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1Cc8RltkrZMfeSgHqnrJ1zdTx-NDu1BpLnh5O7i711Pc",
  // Sheet names
  SOURCE_SHEET_NAME: "FMS",
  DROPDOWN_SHEET_NAME: "Drop-Down Value",
  // Updated page configuration
  PAGE_CONFIG: {
    title: "Project Commission",
    historyTitle: "Project Commission History",
    description: "Manage pending project commission records",
    historyDescription: "View completed project commission records",
  },
}

// Debounce hook for search optimization
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function ProjectCommissionPage() {
  const [pendingData, setPendingData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [dropdownOptions, setDropdownOptions] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [selectedRows, setSelectedRows] = useState({})
  const [statusValues, setStatusValues] = useState({})
  const [dateValues, setDateValues] = useState({})

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const formatTimestamp = useCallback(() => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, "0")
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const year = now.getFullYear()
    const hours = now.getHours().toString().padStart(2, "0")
    const minutes = now.getMinutes().toString().padStart(2, "0")
    const seconds = now.getSeconds().toString().padStart(2, "0")
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
  }, [])

  const formatDateOnly = useCallback((dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }, [])

  const isEmpty = useCallback((value) => {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
  }, [])

  useEffect(() => {
    const role = sessionStorage.getItem("role")
    const user = sessionStorage.getItem("username")
    setUserRole(role || "")
    setUsername(user || "")
  }, [])

  // Fetch dropdown options from Drop-Down Value sheet Column H2:H
  const fetchDropdownOptions = useCallback(async () => {
    try {
      const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.DROPDOWN_SHEET_NAME}&action=fetch`)

      if (!response.ok) {
        throw new Error(`Failed to fetch dropdown data: ${response.status}`)
      }

      const text = await response.text()
      let data

      try {
        data = JSON.parse(text)
      } catch (parseError) {
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = text.substring(jsonStart, jsonEnd + 1)
          data = JSON.parse(jsonString)
        } else {
          throw new Error("Invalid JSON response from server")
        }
      }

      let rows = []
      if (data.table && data.table.rows) {
        rows = data.table.rows
      } else if (Array.isArray(data)) {
        rows = data
      } else if (data.values) {
        rows = data.values.map((row) => ({ c: row.map((val) => ({ v: val })) }))
      }

      // Extract values from column H (index 7) starting from row 2
      const options = []
      rows.forEach((row, rowIndex) => {
        if (rowIndex >= 1) {
          // Skip header row (row 1)
          let rowValues = []
          if (row.c) {
            rowValues = row.c.map((cell) => (cell && cell.v !== undefined ? cell.v : ""))
          } else if (Array.isArray(row)) {
            rowValues = row
          }

          const optionValue = rowValues[7] // Column H (index 7)
          if (!isEmpty(optionValue)) {
            options.push(optionValue.toString())
          }
        }
      })

      setDropdownOptions(options)
    } catch (error) {
      console.error("Error fetching dropdown options:", error)
      setDropdownOptions([])
    }
  }, [isEmpty])

  // Optimized data fetching with updated column mappings
  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch both main data and dropdown options
      await fetchDropdownOptions()

      const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SOURCE_SHEET_NAME}&action=fetch`)

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`)
      }

      const text = await response.text()
      let data

      try {
        data = JSON.parse(text)
      } catch (parseError) {
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = text.substring(jsonStart, jsonEnd + 1)
          data = JSON.parse(jsonString)
        } else {
          throw new Error("Invalid JSON response from server")
        }
      }

      const pending = []
      const history = []
      let rows = []

      if (data.table && data.table.rows) {
        rows = data.table.rows
      } else if (Array.isArray(data)) {
        rows = data
      } else if (data.values) {
        rows = data.values.map((row) => ({ c: row.map((val) => ({ v: val })) }))
      }

      rows.forEach((row, rowIndex) => {
        // Skip header rows and only process from row 7 onwards (rowIndex 6 in 0-based indexing)
        if (rowIndex < 6) return

        let rowValues = []
        if (row.c) {
          rowValues = row.c.map((cell) => (cell && cell.v !== undefined ? cell.v : ""))
        } else if (Array.isArray(row)) {
          rowValues = row
        } else {
          return
        }

        // Updated conditions: Column DM (index 116) not null and Column DN (index 117)
        const columnDM = rowValues[116] // Column DM (index 116)
        const columnDN = rowValues[117] // Column DN (index 117)

        const hasColumnDM = !isEmpty(columnDM)
        if (!hasColumnDM) return // Skip if column DM is empty

        const googleSheetsRowIndex = rowIndex + 1
        const enquiryNumber = rowValues[1] || ""

        const stableId = enquiryNumber
          ? `enquiry_${enquiryNumber}_${googleSheetsRowIndex}`
          : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

        const rowData = {
          _id: stableId,
          _rowIndex: googleSheetsRowIndex,
          _enquiryNumber: enquiryNumber,
          // Basic info columns
          enquiryNumber: rowValues[1] || "", // B
          beneficiaryName: rowValues[2] || "", // C
          address: rowValues[3] || "", // D
          contactNumber: rowValues[6] || "", // G
          surveyorName: rowValues[29] || "", // AD
          // Project Commission specific columns - Updated mappings
          powerPurchaseAgreement: rowValues[100] || "", // CW (was CV)
          vendorConsumerAgreement: rowValues[101] || "", // CX (was CW)
          quotationCopy: rowValues[102] || "", // CY (was CX)
          applicationCopy: rowValues[103] || "", // CZ (was CY)
          electricityBill: rowValues[109] || "", // DF (was DE)
          witnessIdProof: rowValues[110] || "", // DG (was DF)
          inspection: rowValues[114] || "", // DK (was DJ)
          date: rowValues[115] || "", // DL
          projectCommission: rowValues[119] || "", // DP
          actualDate: rowValues[117] || "", // DN
        }

        // Check if Column DN is null for pending, not null for history
        const isColumnDNEmpty = isEmpty(columnDN)

        if (isColumnDNEmpty) {
          pending.push(rowData)
        } else {
          history.push(rowData)
        }
      })

      setPendingData(pending)
      setHistoryData(history)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching sheet data:", error)
      setError("Failed to load Project Commission data: " + error.message)
      setLoading(false)
    }
  }, [isEmpty, fetchDropdownOptions])

  useEffect(() => {
    fetchSheetData()
  }, [fetchSheetData])

  // Initialize status and date values with existing data
  useEffect(() => {
    const initialStatusValues = {}
    const initialDateValues = {}

    pendingData.forEach((record) => {
      if (record.projectCommission && record.projectCommission !== "") {
        initialStatusValues[record._id] = record.projectCommission
      }
      if (record.date && record.date !== "") {
        initialDateValues[record._id] = record.date
      }
    })

    setStatusValues(initialStatusValues)
    setDateValues(initialDateValues)
  }, [pendingData])

  // Optimized filtered data with debounced search
  const filteredPendingData = useMemo(() => {
    return debouncedSearchTerm
      ? pendingData.filter((record) =>
        Object.values(record).some(
          (value) => value && value.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
        ),
      )
      : pendingData
  }, [pendingData, debouncedSearchTerm])

  const filteredHistoryData = useMemo(() => {
    return debouncedSearchTerm
      ? historyData.filter((record) =>
        Object.values(record).some(
          (value) => value && value.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
        ),
      )
      : historyData
  }, [historyData, debouncedSearchTerm])

  const handleRowSelection = useCallback((recordId, isChecked) => {
    setSelectedRows((prev) => ({
      ...prev,
      [recordId]: isChecked,
    }))
  }, [])

  const handleStatusChange = useCallback((recordId, status) => {
    setStatusValues((prev) => ({
      ...prev,
      [recordId]: status,
    }))
  }, [])

  const handleDateChange = useCallback((recordId, date) => {
    setDateValues((prev) => ({
      ...prev,
      [recordId]: date,
    }))
  }, [])

  const handleSubmit = async () => {
    const selectedRecordIds = Object.keys(selectedRows).filter((id) => selectedRows[id])

    if (selectedRecordIds.length === 0) {
      alert("Please select at least one record to submit")
      return
    }

    // Check if all selected records have status selected
    const missingStatus = selectedRecordIds.filter((id) => !statusValues[id] || statusValues[id] === "Select")
    if (missingStatus.length > 0) {
      alert("Please select status for all selected records")
      return
    }

    // Check if records with "Done" status have dates selected
    const doneRecordsWithoutDate = selectedRecordIds.filter(
      (id) => statusValues[id] === "Done" && (!dateValues[id] || dateValues[id] === ""),
    )
    if (doneRecordsWithoutDate.length > 0) {
      alert("Please select date for all records with 'Done' status")
      return
    }

    setIsSubmitting(true)
    try {
      const updatePromises = selectedRecordIds.map(async (recordId) => {
        const record = pendingData.find((r) => r._id === recordId)
        const status = statusValues[recordId]
        const selectedDate = dateValues[recordId]

        if (!record) return

        // Create array with 120 empty strings to ensure we have enough columns
        const rowData = Array(120).fill("")

        // Set specific columns based on updated mappings:
        // Column DP (index 119) - Status (Project Commission)
        rowData[119] = status

        // Column DQ (index 120) - Date (only if provided)
        if (selectedDate) {
          rowData[120] = formatDateOnly(selectedDate)
        }

        // Column DN (index 117) - Actual timestamp (only if status is "Done")
        if (status === "Done") {
          rowData[117] = formatTimestamp()
        }

        // Prepare update data for this specific record
        const updateData = {
          action: "update",
          sheetName: CONFIG.SOURCE_SHEET_NAME,
          rowIndex: record._rowIndex,
          rowData: JSON.stringify(rowData),
        }

        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(updateData).toString(),
        })

        return response.json()
      })

      const results = await Promise.all(updatePromises)
      const failedUpdates = results.filter((result) => !result.success)

      if (failedUpdates.length > 0) {
        throw new Error("Some updates failed")
      }

      setSuccessMessage(`Successfully updated ${selectedRecordIds.length} project commission record(s)`)

      // Update local state
      const updatedRecords = selectedRecordIds.map((recordId) => {
        const record = pendingData.find((r) => r._id === recordId)
        const status = statusValues[recordId]
        const selectedDate = dateValues[recordId]

        return {
          ...record,
          projectCommission: status,
          date: selectedDate ? formatDateOnly(selectedDate) : record.date,
          actualDate: status === "Done" ? formatTimestamp() : record.actualDate,
        }
      })

      // Only move records to history if status is "Done"
      const doneRecords = updatedRecords.filter((record) => record.projectCommission === "Done")

      // Update pending data: remove only "Done" records, keep and update all others
      setPendingData((prev) => {
        return prev
          .map((record) => {
            const updatedRecord = updatedRecords.find((updated) => updated._id === record._id)
            if (updatedRecord) {
              // If this record was updated and is NOT "Done", return the updated version
              if (updatedRecord.projectCommission !== "Done") {
                return updatedRecord
              }
              // If this record was updated and IS "Done", it will be filtered out below
              return null
            }
            // If this record was not updated, keep it as is
            return record
          })
          .filter((record) => record !== null) // Remove null entries (the "Done" records)
      })

      if (doneRecords.length > 0) {
        setHistoryData((prev) => [...doneRecords, ...prev])
      }

      // Clear selections and values
      setSelectedRows({})
      setStatusValues({})
      setDateValues({})

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error updating project commission:", error)
      alert("Failed to update project commission: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history")
    setSearchTerm("")
    setSelectedRows({})
    setStatusValues({})
    setDateValues({})
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-xl font-bold tracking-tight text-blue-700">{CONFIG.PAGE_CONFIG.title}</h1>
          <div className="flex space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder={showHistory ? "Search history..." : "Search pending records..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section Toggle Buttons */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => toggleSection("pending")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${!showHistory
              ? "border-blue-500 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            <div className="flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Pending Commission ({filteredPendingData.length})
            </div>
          </button>
          <button
            onClick={() => toggleSection("history")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${showHistory
              ? "border-blue-500 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            <div className="flex items-center">
              <History className="h-4 w-4 mr-2" />
              Commission History ({filteredHistoryData.length})
            </div>
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              {successMessage}
            </div>
            <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Submit Button for Pending Section */}
        {!showHistory && Object.values(selectedRows).some(Boolean) && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 text-sm">
                {Object.values(selectedRows).filter(Boolean).length} record(s) selected
              </span>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-md hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Submit Commission
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Table Container with Fixed Height */}
        <div className="rounded-lg border border-blue-200 shadow-md bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-3">
            <h2 className="text-blue-700 font-medium flex items-center text-sm">
              {showHistory ? (
                <>
                  <History className="h-4 w-4 mr-2" />
                  Completed Project Commission
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Pending Project Commission
                </>
              )}
            </h2>
            <p className="text-blue-600 text-xs">
              {showHistory ? CONFIG.PAGE_CONFIG.historyDescription : CONFIG.PAGE_CONFIG.description}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-blue-600 text-sm">Loading project commission data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center text-sm">
              {error}{" "}
              <button className="underline ml-2" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          ) : (
            /* Table with Fixed Height and Scrolling */
            <div className="overflow-auto" style={{ maxHeight: "60vh" }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {!showHistory && (
                      <>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </>
                    )}
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enquiry Number
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beneficiary Name
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Number Of Beneficiary
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Surveyor Name
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Power Purchase Agreement
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor Consumer Agreement
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quotation Copy
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Application Copy
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Electricity Bill
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Witness Id Proof
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inspection
                    </th>
                    {showHistory && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project Commission
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {showHistory ? (
                    filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-900">{record.enquiryNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900 flex items-center">
                              <Users className="h-3 w-3 mr-1 text-gray-400" />
                              {record.beneficiaryName || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 max-w-xs">
                            <div className="text-xs text-gray-900 truncate flex items-center" title={record.address}>
                              <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                              {record.address || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900 flex items-center">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {record.contactNumber || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.surveyorName || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.powerPurchaseAgreement ? (
                              <a
                                href={record.powerPurchaseAgreement}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.vendorConsumerAgreement ? (
                              <a
                                href={record.vendorConsumerAgreement}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.quotationCopy || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.applicationCopy || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.electricityBill || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.witnessIdProof || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.inspection || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {record.projectCommission || "—"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={14} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm
                            ? "No history records matching your search"
                            : "No completed project commission found"}
                        </td>
                      </tr>
                    )
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedRows[record._id] || false}
                            onChange={(e) => handleRowSelection(record._id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <select
                            value={statusValues[record._id] || record.projectCommission || "Select"}
                            onChange={(e) => handleStatusChange(record._id, e.target.value)}
                            disabled={!selectedRows[record._id]}
                            className="text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="Select">Select</option>
                            {dropdownOptions.map((option, index) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <input
                            type="date"
                            value={dateValues[record._id] || record.date || ""}
                            onChange={(e) => handleDateChange(record._id, e.target.value)}
                            disabled={!selectedRows[record._id] || statusValues[record._id] !== "Done"}
                            className="text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-blue-900">{record.enquiryNumber || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900 flex items-center">
                            <Users className="h-3 w-3 mr-1 text-gray-400" />
                            {record.beneficiaryName || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 max-w-xs">
                          <div className="text-xs text-gray-900 truncate flex items-center" title={record.address}>
                            <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                            {record.address || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900 flex items-center">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {record.contactNumber || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.surveyorName || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {record.powerPurchaseAgreement ? (
                            <a
                              href={record.powerPurchaseAgreement}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {record.vendorConsumerAgreement ? (
                            <a
                              href={record.vendorConsumerAgreement}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.quotationCopy || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.applicationCopy || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.electricityBill || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.witnessIdProof || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.inspection || "—"}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={16} className="px-4 py-8 text-center text-gray-500 text-sm">
                        {searchTerm
                          ? "No pending project commission matching your search"
                          : "No pending project commission found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default ProjectCommissionPage
