"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, Send, Wrench } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
  // Updated Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
  // Updated Google Drive folder ID for quotation uploads
  DRIVE_FOLDER_ID: "1QNU59s_1KFG1C9Xq7ufmn6G9dLO8COYk",
  // Sheet names
  SOURCE_SHEET_NAME: "FMS",
  DROPDOWN_SHEET_NAME: "Drop-Down Value",
  // Updated page configuration
  PAGE_CONFIG: {
    title: "Quotation",
    historyTitle: "Quotation History",
    description: "Manage pending quotation tasks",
    historyDescription: "View completed quotation records",
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

function FMSDataPage() {
  const [pendingData, setPendingData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [statusOptions, setStatusOptions] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showQuotationModal, setShowQuotationModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")

  // Quotation form state
  const [quotationForm, setQuotationForm] = useState({
    quotationNumber: "",
    valueOfQuotation: "",
    quotationCopy: null,
  })

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

  const isEmpty = useCallback((value) => {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
  }, [])

  useEffect(() => {
    const role = sessionStorage.getItem("role")
    const user = sessionStorage.getItem("username")
    setUserRole(role || "")
    setUsername(user || "")
  }, [])

  // Fetch dropdown values for status
  const fetchDropdownValues = useCallback(async () => {
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

      // Extract status options from column F (index 5)
      const options = []
      if (data.table && data.table.rows) {
        data.table.rows.forEach((row, index) => {
          if (index === 0) return // Skip header
          const statusValue = row.c && row.c[5] && row.c[5].v
          if (statusValue && statusValue.toString().trim() !== "") {
            options.push(statusValue.toString().trim())
          }
        })
      }
      setStatusOptions(options)
    } catch (error) {
      console.error("Error fetching dropdown data:", error)
      // Set default options if fetch fails
      setStatusOptions(["Completed", "Pending", "In Progress", "Rejected"])
    }
  }, [])

  // Optimized data fetching
  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch dropdown values and sheet data in parallel
      await Promise.all([
        fetchDropdownValues(),
        (async () => {
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

            // Check conditions: Column AF (index 31) not null and Column AG (index 32)
            const columnAF = rowValues[31] // Column AF
            const columnAG = rowValues[32] // Column AG
            const hasColumnAF = !isEmpty(columnAF)

            if (!hasColumnAF) return // Skip if column AF is empty

            const googleSheetsRowIndex = rowIndex + 1
            const enquiryNumber = rowValues[1] || ""
            const stableId = enquiryNumber
              ? `enquiry_${enquiryNumber}_${googleSheetsRowIndex}`
              : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

            const rowData = {
              _id: stableId,
              _rowIndex: googleSheetsRowIndex,
              _enquiryNumber: enquiryNumber,
              // Map all columns (A to AO = 0 to 40)
              col0: rowValues[0] || "", // A
              col1: rowValues[1] || "", // B - Enquiry Number
              col2: rowValues[2] || "", // C - Beneficiary Name
              col3: rowValues[3] || "", // D - Address
              col4: rowValues[4] || "", // E - Village/Block
              col5: rowValues[5] || "", // F - District
              col6: rowValues[6] || "", // G - Contact Number
              col7: rowValues[7] || "", // H - Present Load
              col8: rowValues[8] || "", // I - BP Number
              col9: rowValues[9] || "", // J - CSPDCL Contract Demand
              col10: rowValues[10] || "", // K - Last 6 Months Average Electricity Bill
              col11: rowValues[11] || "", // L - Future Load Requirement
              col12: rowValues[12] || "", // M - Load Details/Application
              col13: rowValues[13] || "", // N - No Of Hours Of Failure
              col14: rowValues[14] || "", // O - Structure type
              col15: rowValues[15] || "", // P - Roof Type
              col16: rowValues[16] || "", // Q - System Type
              col17: rowValues[17] || "", // R - Need Type
              col18: rowValues[18] || "", // S - Project Mode
              col19: rowValues[19] || "", // T
              col20: rowValues[20] || "", // U
              col21: rowValues[21] || "", // V
              col22: rowValues[22] || "", // W - Status
              col23: rowValues[23] || "", // X - Copy Survey Report
              col24: rowValues[24] || "", // Y - Geotag Photo Site
              col25: rowValues[25] || "", // Z - Three Months Electricity Bill Copy
              col26: rowValues[26] || "", // AA - Aadhar Card
              col27: rowValues[27] || "", // AB - Pan Card
              col28: rowValues[28] || "", // AC - Address Proof
              col29: rowValues[29] || "", // AD - Surveyor Name
              col30: rowValues[30] || "", // AE - Contact Number
              col31: rowValues[31] || "", // AF
              col32: rowValues[32] || "", // AG - Actual
              col33: rowValues[33] || "", // AH
              col34: rowValues[34] || "", // AI - Quotation Number
              col35: rowValues[35] || "", // AJ - Value Of Quotation
              col36: rowValues[36] || "", // AK - Quotation Copy
            }

            // Check if Column AG is null for pending, not null for history
            const isColumnAGEmpty = isEmpty(columnAG)

            if (isColumnAGEmpty) {
              pending.push(rowData)
            } else {
              history.push(rowData)
            }
          })

          setPendingData(pending)
          setHistoryData(history)
          setLoading(false)
        })(),
      ])
    } catch (error) {
      console.error("Error fetching sheet data:", error)
      setError("Failed to load FMS data: " + error.message)
      setLoading(false)
    }
  }, [fetchDropdownValues, isEmpty])

  useEffect(() => {
    fetchSheetData()
  }, [fetchSheetData])

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

  const handleQuotationClick = useCallback((record) => {
    setSelectedRecord(record)
    setQuotationForm({
      quotationNumber: record.col34 || "",
      valueOfQuotation: record.col35 || "",
      quotationCopy: null,
    })
    setShowQuotationModal(true)
  }, [])

  const handleFileUpload = useCallback((field, file) => {
    setQuotationForm((prev) => ({ ...prev, [field]: file }))
  }, [])

  const handleInputChange = useCallback((field, value) => {
    setQuotationForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }, [])

  const uploadImageToDrive = useCallback(
    async (file) => {
      try {
        const base64Data = await fileToBase64(file)
        const formData = new FormData()
        formData.append("action", "uploadFile")
        formData.append("base64Data", base64Data)
        formData.append(
          "fileName",
          `${selectedRecord._enquiryNumber}_quotation_${Date.now()}.${file.name.split(".").pop()}`,
        )
        formData.append("mimeType", file.type)
        formData.append("folderId", CONFIG.DRIVE_FOLDER_ID)

        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          body: formData,
        })

        const result = await response.json()
        if (result.success) {
          return result.fileUrl
        } else {
          throw new Error("Failed to upload quotation copy")
        }
      } catch (error) {
        console.error("Error uploading quotation copy:", error)
        throw error
      }
    },
    [selectedRecord, fileToBase64],
  )

  const handleQuotationSubmit = async () => {
    if (!quotationForm.quotationNumber || !quotationForm.valueOfQuotation) {
      alert("Please fill in Quotation Number and Value of Quotation")
      return
    }

    setIsSubmitting(true)
    try {
      // Upload quotation copy and get URL
      // Default to existing URL if no new file is selected
      let quotationCopyUrl = selectedRecord.col36 || ""

      if (quotationForm.quotationCopy) {
        quotationCopyUrl = await uploadImageToDrive(quotationForm.quotationCopy)
      }

      // Prepare update data
      // FIXED: Use null for columns we don't want to update
      const rowData = Array(37).fill(null) // Array up to column AK (index 36)
      rowData[32] = formatTimestamp() // AG - Actual  
      rowData[34] = quotationForm.quotationNumber // AI - Quotation Number
      rowData[35] = quotationForm.valueOfQuotation // AJ - Value Of Quotation
      rowData[36] = quotationCopyUrl // AK - Quotation Copy

      const updateData = {
        action: "update",
        sheetName: CONFIG.SOURCE_SHEET_NAME,
        rowIndex: selectedRecord._rowIndex,
        rowData: JSON.stringify(rowData)
      }

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(updateData).toString(),
      })

      const result = await response.json()
      if (result.success) {
        setSuccessMessage(`Quotation submitted successfully for Enquiry Number: ${selectedRecord._enquiryNumber}`)
        setShowQuotationModal(false)

        const isEdit = !isEmpty(selectedRecord.col32) // Check if it was already in history (has AG timestamp)

        const updatedRecord = {
          ...selectedRecord,
          col32: formatTimestamp(), // AG - Actual timestamp
          col34: quotationForm.quotationNumber, // AI - Quotation Number
          col35: quotationForm.valueOfQuotation, // AJ - Value Of Quotation
          col36: quotationCopyUrl, // AK - Quotation Copy
        }

        if (isEdit) {
          // Update in history
          setHistoryData((prev) => prev.map((rec) => (rec._id === selectedRecord._id ? updatedRecord : rec)))
        } else {
          // Move from pending to history
          setPendingData((prev) => prev.filter((record) => record._id !== selectedRecord._id))
          setHistoryData((prev) => [updatedRecord, ...prev])
        }

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("")
        }, 3000)
      } else {
        throw new Error(result.error || "Failed to submit quotation")
      }
    } catch (error) {
      console.error("Error submitting quotation:", error)
      alert("Failed to submit quotation: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history")
    setSearchTerm("")
  }, [])

  const closeQuotationModal = useCallback(() => {
    setShowQuotationModal(false)
    setSelectedRecord(null)
    setQuotationForm({
      quotationNumber: "",
      valueOfQuotation: "",
      quotationCopy: null,
    })
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
                placeholder={showHistory ? "Search history..." : "Search pending quotations..."}
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
              <Send className="h-4 w-4 mr-2" />
              Pending Quotations ({filteredPendingData.length})
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
              Quotation History ({filteredHistoryData.length})
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

        {/* Table Container with Fixed Height */}
        <div className="rounded-lg border border-blue-200 shadow-md bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-3">
            <h2 className="text-blue-700 font-medium flex items-center text-sm">
              {showHistory ? (
                <>
                  <History className="h-4 w-4 mr-2" />
                  Completed FMS Quotations
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Pending FMS Quotations
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
              <p className="text-blue-600 text-sm">Loading FMS data...</p>
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
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
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
                      Village/Block
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dist.
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Number Of Beneficiary
                    </th>
                    {showHistory ? (
                      <>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aadhar Card
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Address Proof
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Surveyor Name
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact Number
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quotation Number
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value Of Quotation
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quotation Copy
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Copy Survey Report
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Geotag Photo Site
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Three Months Electricity Bill Copy
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aadhar Card
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pan Card
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Address Proof
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Surveyor Name
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact Number
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {showHistory ? (
                    filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-2 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleQuotationClick(record)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                              <Wrench className="h-3 w-3 mr-1" />
                              Edit
                            </button>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-900">{record.col1 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.col2 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 max-w-xs">
                            <div className="text-xs text-gray-900 truncate" title={record.col3}>
                              {record.col3 || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.col4 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.col5 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.col6 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.col26 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.col28 ? (
                              <a
                                href={record.col28}
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
                            <div className="text-xs text-gray-900">{record.col29 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.col30 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-blue-900">{record.col34 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-green-700 font-medium">₹{record.col35 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.col36 ? (
                              <a
                                href={record.col36}
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
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={14} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm ? "No history records matching your search" : "No completed quotations found"}
                        </td>
                      </tr>
                    )
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleQuotationClick(record)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Quotation
                          </button>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-blue-900">{record.col1 || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900 flex items-center">
                            <Users className="h-3 w-3 mr-1 text-gray-400" />
                            {record.col2 || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 max-w-xs">
                          <div className="text-xs text-gray-900 truncate flex items-center" title={record.col3}>
                            <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                            {record.col3 || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.col4 || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.col5 || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900 flex items-center">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {record.col6 || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {record.col22 || "Pending"}
                          </span>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {record.col23 ? (
                            <a
                              href={record.col23}
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
                          {record.col24 ? (
                            <a
                              href={record.col24}
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
                          {record.col25 ? (
                            <a
                              href={record.col25}
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
                          <div className="text-xs text-gray-900">{record.col26 || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.col27 || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {record.col28 ? (
                            <a
                              href={record.col28}
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
                          <div className="text-xs text-gray-900">{record.col29 || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.col30 || "—"}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={16} className="px-4 py-8 text-center text-gray-500 text-sm">
                        {searchTerm ? "No pending quotations matching your search" : "No pending quotations found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quotation Modal with Transparent Background */}
        {showQuotationModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white border max-w-2xl w-full shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Quotation Form - Enquiry: {selectedRecord.col1}</h3>
                  <button onClick={closeQuotationModal} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 text-sm">Beneficiary Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-medium">Enquiry Number:</span> {selectedRecord.col1}
                    </div>
                    <div>
                      <span className="font-medium">Beneficiary Name:</span> {selectedRecord.col2}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Address:</span> {selectedRecord.col3}
                    </div>
                    <div>
                      <span className="font-medium">Contact Number:</span> {selectedRecord.col6}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quotation Number */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Quotation Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={quotationForm.quotationNumber}
                      onChange={(e) => handleInputChange("quotationNumber", e.target.value)}
                      placeholder="Enter quotation number"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* Value Of Quotation */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Value Of Quotation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={quotationForm.valueOfQuotation}
                      onChange={(e) => handleInputChange("valueOfQuotation", e.target.value)}
                      placeholder="Enter quotation value"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quotation Copy</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("quotationCopy", e.target.files[0])}
                      className="mt-1 block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {quotationForm.quotationCopy ? (
                      <p className="text-xs text-green-600 mt-1">✓ {quotationForm.quotationCopy.name}</p>
                    ) : selectedRecord.col36 ? (
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-500 mr-2">Current file:</span>
                        <a href={selectedRecord.col36} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center">
                          <Eye className="h-3 w-3 mr-1" /> View
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6 pt-3 border-t">
                  <button
                    onClick={closeQuotationModal}
                    disabled={isSubmitting}
                    className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuotationSubmit}
                    disabled={isSubmitting || !quotationForm.quotationNumber || !quotationForm.valueOfQuotation}
                    className="px-3 py-1 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-md hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Quotation"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default FMSDataPage
