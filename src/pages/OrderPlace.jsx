"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, DollarSign, Package, Wrench } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
  // Updated Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
  // Updated Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1O67xaSjucSi761g-WRA0D7i0ck344FtT",
  // Sheet names
  SOURCE_SHEET_NAME: "FMS",
  DROPDOWN_SHEET_NAME: "Drop-Down Value",
  // Updated page configuration
  PAGE_CONFIG: {
    title: "Varya",
    historyTitle: "Varya History",
    description: "Manage pending orders",
    historyDescription: "View completed order records",
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

function OrderReceivePage() {
  const [pendingData, setPendingData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")

  // Order form state
  const [orderForm, setOrderForm] = useState({
    module: "",
    inverter: "",
    bos: "",
    acdb: "",
    dcdb: "",
    orderCopy: null,
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

  // Optimized data fetching
  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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

        // Check conditions: Column AS (index 44) not null and Column AT (index 45)
        const columnAS = rowValues[44] // Column AS
        const columnAT = rowValues[45] // Column AT

        const hasColumnAS = !isEmpty(columnAS)
        if (!hasColumnAS) return // Skip if column AS is empty

        const googleSheetsRowIndex = rowIndex + 1
        const enquiryNumber = rowValues[1] || ""

        const stableId = enquiryNumber
          ? `enquiry_${enquiryNumber}_${googleSheetsRowIndex}`
          : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

        const rowData = {
          _id: stableId,
          _rowIndex: googleSheetsRowIndex,
          _enquiryNumber: enquiryNumber,
          // Map all columns
          enquiryNumber: rowValues[1] || "", // B - Enquiry Number
          beneficiaryName: rowValues[2] || "", // C - Beneficiary Name
          address: rowValues[3] || "", // D - Address
          villageBlock: rowValues[4] || "", // E - Village/Block
          district: rowValues[5] || "", // F - District
          contactNumber: rowValues[6] || "", // G - Contact Number
          aadharCard: rowValues[26] || "", // AA - Aadhar Card
          addressProof: rowValues[28] || "", // AC - Address Proof
          surveyorName: rowValues[29] || "", // AD - Surveyor Name
          surveyorContact: rowValues[30] || "", // AE - Contact Number
          quotationNumber: rowValues[34] || "", // AI - Quotation Number
          quotationValue: rowValues[35] || "", // AJ - Value Of Quotation
          quotationCopy: rowValues[36] || "", // AK - Quotation Copy
          // Order specific fields
          actualDate: rowValues[45] || "", // AT - Actual
          module: rowValues[47] || "", // AV - Module
          inverter: rowValues[48] || "", // AW - Inverter
          bos: rowValues[49] || "", // AX - BOS
          acdb: rowValues[50] || "", // AY - ACDB
          dcdb: rowValues[51] || "", // AZ - DCDB
          orderCopy: rowValues[52] || "", // BA - Order Copy
        }

        // Check if Column AT is null for pending, not null for history
        const isColumnATEmpty = isEmpty(columnAT)

        if (isColumnATEmpty) {
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
      setError("Failed to load order data: " + error.message)
      setLoading(false)
    }
  }, [isEmpty])

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

  const handleOrderClick = useCallback((record) => {
    setSelectedRecord(record)
    setOrderForm({
      module: record.module || "",
      inverter: record.inverter || "",
      bos: record.bos || "",
      acdb: record.acdb || "",
      dcdb: record.dcdb || "",
      orderCopy: null,
    })
    setShowOrderModal(true)
  }, [])

  const handleFileUpload = useCallback((field, file) => {
    setOrderForm((prev) => ({ ...prev, [field]: file }))
  }, [])

  const handleInputChange = useCallback((field, value) => {
    setOrderForm((prev) => ({ ...prev, [field]: value }))
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
          `${selectedRecord._enquiryNumber}_order_${Date.now()}.${file.name.split(".").pop()}`,
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
          throw new Error("Failed to upload image")
        }
      } catch (error) {
        console.error("Error uploading image:", error)
        throw error
      }
    },
    [selectedRecord, fileToBase64],
  )

  const handleOrderSubmit = async () => {
    if (!orderForm.module || !orderForm.inverter) {
      alert("Please fill in required fields (Module and Inverter)")
      return
    }

    setIsSubmitting(true)
    try {
      const isEdit = !isEmpty(selectedRecord.actualDate)
      const actualDate = isEdit ? selectedRecord.actualDate : formatTimestamp()

      // Upload order copy image and get URL
      let orderCopyUrl = ""
      if (orderForm.orderCopy) {
        orderCopyUrl = await uploadImageToDrive(orderForm.orderCopy)
      } else if (isEdit && selectedRecord.orderCopy) {
        orderCopyUrl = selectedRecord.orderCopy
      }

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "update",
          sheetName: CONFIG.SOURCE_SHEET_NAME,
          rowIndex: selectedRecord._rowIndex,
          rowData: JSON.stringify([
            "", // A - keep existing
            "", // B - keep existing (Enquiry Number)
            "", // C - keep existing
            "", // D - keep existing
            "", // E - keep existing
            "", // F - keep existing
            "", // G - keep existing
            "", // H - keep existing
            "", // I - keep existing
            "", // J - keep existing
            "", // K - keep existing
            "", // L - keep existing
            "", // M - keep existing
            "", // N - keep existing
            "", // O - keep existing
            "", // P - keep existing
            "", // Q - keep existing
            "", // R - keep existing
            "", // S - keep existing
            "", // T - keep existing
            "", // U - keep existing
            "", // V - keep existing
            "", // W - keep existing
            "", // X - keep existing
            "", // Y - keep existing
            "", // Z - keep existing
            "", // AA - keep existing
            "", // AB - keep existing
            "", // AC - keep existing
            "", // AD - keep existing
            "", // AE - keep existing
            "", // AF - keep existing
            "", // AG - keep existing
            "", // AH - keep existing
            "", // AI - keep existing
            "", // AJ - keep existing
            "", // AK - keep existing
            "", // AL - keep existing
            "", // AM - keep existing
            "", // AN - keep existing
            "", // AO - keep existing
            "", // AP - keep existing
            "", // AQ - keep existing
            "", // AR - keep existing
            "", // AS - keep existing
            actualDate, // AT - Actual timestamp
            "", // AU - keep existing
            orderForm.module, // AV - Module
            orderForm.inverter, // AW - Inverter
            orderForm.bos, // AX - BOS
            orderForm.acdb, // AY - ACDB
            orderForm.dcdb, // AZ - DCDB
            orderCopyUrl, // BA - Order Copy
          ]),
        }).toString(),
      })

      const result = await response.json()
      if (result.success) {
        setSuccessMessage(`Order processed successfully for Enquiry Number: ${selectedRecord.enquiryNumber}`)
        setShowOrderModal(false)

        // Add to history with updated data
        const updatedRecord = {
          ...selectedRecord,
          actualDate: actualDate,
          module: orderForm.module,
          inverter: orderForm.inverter,
          bos: orderForm.bos,
          acdb: orderForm.acdb,
          dcdb: orderForm.dcdb,
          orderCopy: orderCopyUrl,
        }

        if (isEdit) {
          setHistoryData((prev) => prev.map((rec) => (rec._id === selectedRecord._id ? updatedRecord : rec)))
        } else {
          setPendingData((prev) => prev.filter((record) => record._id !== selectedRecord._id))
          setHistoryData((prev) => [updatedRecord, ...prev])
        }

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("")
        }, 3000)
      } else {
        throw new Error(result.error || "Failed to submit order")
      }
    } catch (error) {
      console.error("Error submitting order:", error)
      alert("Failed to submit order: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history")
    setSearchTerm("")
  }, [])

  const closeOrderModal = useCallback(() => {
    setShowOrderModal(false)
    setSelectedRecord(null)
    setOrderForm({
      module: "",
      inverter: "",
      bos: "",
      acdb: "",
      dcdb: "",
      orderCopy: null,
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
                placeholder={showHistory ? "Search history..." : "Search pending orders..."}
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
              Pending Orders ({filteredPendingData.length})
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
              Order History ({filteredHistoryData.length})
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
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-3">
            <h2 className="text-blue-700 font-medium flex items-center text-sm">
              {showHistory ? (
                <>
                  <History className="h-4 w-4 mr-2" />
                  Completed Orders
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Pending Orders
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
              <p className="text-blue-600 text-sm">Loading order data...</p>
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
                    {showHistory && (
                      <>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Module
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Inverter
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          BOS
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ACDB
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DCDB
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Copy
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
                              onClick={() => handleOrderClick(record)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                              <Wrench className="h-3 w-3 mr-1" />
                              Edit
                            </button>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-900">{record.enquiryNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.beneficiaryName || "—"}</div>
                          </td>
                          <td className="px-2 py-3 max-w-xs">
                            <div className="text-xs text-gray-900 truncate" title={record.address}>
                              {record.address || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.villageBlock || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.district || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.contactNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.aadharCard || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.addressProof ? (
                              <a
                                href={record.addressProof}
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
                            <div className="text-xs text-gray-900">{record.surveyorName || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.surveyorContact || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.quotationNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.quotationValue || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.quotationCopy ? (
                              <a
                                href={record.quotationCopy}
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
                            <div className="text-xs text-gray-900">{record.module || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.inverter || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.bos || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.acdb || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.dcdb || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.orderCopy ? (
                              <a
                                href={record.orderCopy}
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
                        <td colSpan={20} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm ? "No history records matching your search" : "No completed orders found"}
                        </td>
                      </tr>
                    )
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleOrderClick(record)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-linear-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <Package className="h-3 w-3 mr-1" />
                            Order
                          </button>
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
                          <div className="text-xs text-gray-900">{record.villageBlock || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.district || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900 flex items-center">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {record.contactNumber || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.aadharCard || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {record.addressProof ? (
                            <a
                              href={record.addressProof}
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
                          <div className="text-xs text-gray-900">{record.surveyorName || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.surveyorContact || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.quotationNumber || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900 flex items-center">
                            <DollarSign className="h-3 w-3 mr-1 text-green-500" />
                            {record.quotationValue || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {record.quotationCopy ? (
                            <a
                              href={record.quotationCopy}
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
                        {searchTerm ? "No pending orders matching your search" : "No pending orders found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Modal */}
        {showOrderModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white border max-w-2xl w-full shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Order Form - Enquiry: {selectedRecord.enquiryNumber}
                  </h3>
                  <button onClick={closeOrderModal} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 text-sm">Beneficiary Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-medium">Enquiry Number:</span> {selectedRecord.enquiryNumber}
                    </div>
                    <div>
                      <span className="font-medium">Name:</span> {selectedRecord.beneficiaryName}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Address:</span> {selectedRecord.address}
                    </div>
                    <div>
                      <span className="font-medium">Contact:</span> {selectedRecord.contactNumber}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Module */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Module <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={orderForm.module}
                      onChange={(e) => handleInputChange("module", e.target.value)}
                      placeholder="Enter module details"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* Inverter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Inverter <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={orderForm.inverter}
                      onChange={(e) => handleInputChange("inverter", e.target.value)}
                      placeholder="Enter inverter details"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* BOS */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">BOS</label>
                    <input
                      type="text"
                      value={orderForm.bos}
                      onChange={(e) => handleInputChange("bos", e.target.value)}
                      placeholder="Enter BOS details"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* ACDB */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ACDB</label>
                    <input
                      type="text"
                      value={orderForm.acdb}
                      onChange={(e) => handleInputChange("acdb", e.target.value)}
                      placeholder="Enter ACDB details"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* DCDB */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">DCDB</label>
                    <input
                      type="text"
                      value={orderForm.dcdb}
                      onChange={(e) => handleInputChange("dcdb", e.target.value)}
                      placeholder="Enter DCDB details"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* Order Copy */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Order Copy</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("orderCopy", e.target.files[0])}
                      className="mt-1 block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {orderForm.orderCopy && <p className="text-xs text-green-600 mt-1">✓ {orderForm.orderCopy.name}</p>}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6 pt-3 border-t">
                  <button
                    onClick={closeOrderModal}
                    disabled={isSubmitting}
                    className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOrderSubmit}
                    disabled={isSubmitting || !orderForm.module || !orderForm.inverter}
                    className="px-3 py-1 bg-linear-to-r from-green-500 to-blue-600 text-white rounded-md hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
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

export default OrderReceivePage
