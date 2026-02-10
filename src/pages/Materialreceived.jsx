"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, Package, Wrench } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
  // Updated Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec ",
  // Updated Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1A1-QDgKUGl8Chy5wPFXdFxM7-_OKYmg1",
  // Sheet configuration
  SHEET_ID: "1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4",
  SOURCE_SHEET_NAME: "FMS",
  // Updated page configuration
  PAGE_CONFIG: {
    title: "Material Received In Site",
    historyTitle: "Material Receipt History",
    description: "Manage pending material receipts at site",
    historyDescription: "View completed material receipt records",
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

function MaterialReceivedSitePage() {
  const [pendingData, setPendingData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")

  // Material Receipt form state
  const [receiptForm, setReceiptForm] = useState({
    copyOfReceipt: "", // Changed from null to empty string for URL storage
    dateOfReceipt: "",
  })

  // Professional file upload status state
  const [fileUploads, setFileUploads] = useState({
    copyOfReceipt: { uploading: false, uploaded: false, url: "", error: null, name: "" }
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

  const formatDate = useCallback((dateString) => {
    if (!dateString) return ""
    // If it's already in DD/MM/YYYY format, return it
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateString

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString

    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }, [])

  const formatDateForDisplay = useCallback((dateString) => {
    if (!dateString) return ""
    // If it's already in DD/MM/YYYY format, return it
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateString

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString // Return original if invalid date

    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }, [])

  const formatDateForInput = useCallback((dateString) => {
    if (!dateString) return ""
    // Check if it's already in YYYY-MM-DD format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString

    // Handle DD/MM/YYYY format
    const parts = dateString.split("/")
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return ""
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

        // Check conditions: Enquiry Number (index 1) not null and Column BW (index 74)
        const enquiryNumber = rowValues[1] || ""
        const columnBW = rowValues[74] // Column BW

        const hasEnquiry = !isEmpty(enquiryNumber)
        if (!hasEnquiry) return // Skip if enquiry number is empty

        const googleSheetsRowIndex = rowIndex + 1
        const stableId = enquiryNumber
          ? `enquiry_${enquiryNumber}_${googleSheetsRowIndex}`
          : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

        const rowData = {
          _id: stableId,
          _rowIndex: googleSheetsRowIndex,
          _enquiryNumber: enquiryNumber,
          // Basic info columns - Updated column mappings
          enquiryNumber: rowValues[1] || "", // B
          beneficiaryName: rowValues[2] || "", // C
          address: rowValues[3] || "", // D
          villageBlock: rowValues[4] || "", // E
          district: rowValues[5] || "", // F
          contactNumber: rowValues[6] || "", // G
          surveyorName: rowValues[29] || "", // AD
          surveyorContact: rowValues[30] || "", // AE
          orderCopy: rowValues[52] || "", // BA
          ipName: rowValues[56] || "", // BE
          ipContact: rowValues[57] || "", // BF
          gstNumber: rowValues[58] || "", // BG
          gstCertificates: rowValues[59] || "", // BH - Added GST Certificates
          bankAccountDetails: rowValues[60] || "", // BI - Fixed index
          aadharCard: rowValues[61] || "", // BJ - Fixed index
          panCard: rowValues[62] || "", // BK - Fixed index
          workOrderNumber: rowValues[63] || "", // BL - Fixed index
          workOrderCopy: rowValues[64] || "", // BM - Fixed index
          dispatchMaterial: rowValues[68] || "", // BQ - Fixed index
          informToCustomer: rowValues[72] || "", // BU - Fixed index
          // Material Receipt specific columns
          actual: rowValues[74] || "", // BW - Fixed index
          copyOfReceipt: rowValues[76] || "", // BY - Fixed index
          dateOfReceipt: formatDate(rowValues[77] || ""), // BZ - Fixed index
        }

        // Check if Column BW is null for pending, not null for history
        const isColumnBWEmpty = isEmpty(columnBW)

        if (isColumnBWEmpty) {
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
      setError("Failed to load Material Receipt data: " + error.message)
      setLoading(false)
    }
  }, [isEmpty, formatDate])

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
          `${selectedRecord._enquiryNumber}_receipt_${Date.now()}.${file.name.split(".").pop()}`,
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

  const handleAtSiteClick = useCallback((record) => {
    setSelectedRecord(record)
    setReceiptForm({
      copyOfReceipt: record.copyOfReceipt || "",
      dateOfReceipt: formatDateForInput(record.dateOfReceipt || ""),
    })

    // Initialize professional upload status
    setFileUploads({
      copyOfReceipt: {
        uploading: false,
        uploaded: !!record.copyOfReceipt,
        url: record.copyOfReceipt || "",
        error: null,
        name: record.copyOfReceipt ? "Existing Document" : ""
      }
    })

    setShowReceiptModal(true)
  }, [formatDateForInput])

  const handleFileUpload = useCallback(async (field, file) => {
    if (!file) return

    // Update form state (backward compatibility)
    setReceiptForm((prev) => ({ ...prev, [field]: file }))

    // Start professional upload process
    setFileUploads(prev => ({
      ...prev,
      [field]: { ...prev[field], uploading: true, error: null, name: file.name }
    }))

    try {
      const url = await uploadImageToDrive(file)
      setFileUploads(prev => ({
        ...prev,
        [field]: { uploading: false, uploaded: true, url, error: null, name: file.name }
      }))
    } catch (error) {
      console.error(`Upload error for ${field}:`, error)
      setFileUploads(prev => ({
        ...prev,
        [field]: { uploading: false, uploaded: false, url: "", error: error.message, name: file.name }
      }))
    }
  }, [uploadImageToDrive])

  const UploadStatus = ({ field }) => {
    const status = fileUploads[field]
    if (!status) return null

    if (status.uploading) {
      return (
        <div className="flex items-center mt-2 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs animate-pulse">
          <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Uploading to Drive...
        </div>
      )
    }
    if (status.error) {
      return (
        <div className="flex items-center mt-2 text-red-600 bg-red-50 px-2 py-1 rounded text-xs border border-red-100">
          <X className="h-3 w-3 mr-1" />
          Failed: {status.error}
        </div>
      )
    }
    if (status.uploaded) {
      return (
        <div className="flex items-center mt-2 text-green-600 bg-green-50 px-2 py-1 rounded text-xs border border-green-100 font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Successfully Uploaded
        </div>
      )
    }
    return null
  }

  const handleInputChange = useCallback((field, value) => {
    setReceiptForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleReceiptSubmit = async () => {
    // Check if any uploads are still in progress
    const uploadingFields = Object.keys(fileUploads).filter(key => fileUploads[key].uploading)
    if (uploadingFields.length > 0) {
      alert("Please wait for the document to finish uploading before submitting.")
      return
    }

    // Check for required fields using fileUploads state
    if (!fileUploads.copyOfReceipt.url || !receiptForm.dateOfReceipt) {
      alert("Please fill in all required fields (Copy of Receipt and Date of Receipt)")
      return
    }

    setIsSubmitting(true)
    try {
      const isEdit = !isEmpty(selectedRecord.actual)
      const actualDate = isEdit ? selectedRecord.actual : formatTimestamp()

      // Use URL from professional upload state
      const copyOfReceiptUrl = fileUploads.copyOfReceipt.url

      // Format date for storage
      const formattedDate = formatDateForDisplay(receiptForm.dateOfReceipt)

      // Prepare update data with correct column indices
      // FIXED: Use null for columns we don't want to update
      const rowData = Array(78).fill(null)

      rowData[74] = actualDate // BW - Actual timestamp
      rowData[76] = copyOfReceiptUrl // BY - Copy of Receipt
      rowData[77] = formattedDate // BZ - Date of Receipt

      const updateData = {
        action: "update",
        sheetName: CONFIG.SOURCE_SHEET_NAME,
        rowIndex: selectedRecord._rowIndex,
        rowData: JSON.stringify(rowData),
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
        setSuccessMessage(`Material receipt recorded successfully for Enquiry Number: ${selectedRecord._enquiryNumber}`)
        setShowReceiptModal(false)

        // Add to history with updated data
        const updatedRecord = {
          ...selectedRecord,
          actual: actualDate,
          copyOfReceipt: copyOfReceiptUrl,
          dateOfReceipt: formattedDate,
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
        throw new Error(result.error || "Failed to submit material receipt")
      }
    } catch (error) {
      console.error("Error submitting material receipt:", error)
      alert("Failed to submit material receipt: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history")
    setSearchTerm("")
  }, [])

  const closeReceiptModal = useCallback(() => {
    setShowReceiptModal(false)
    setSelectedRecord(null)
    setReceiptForm({
      copyOfReceipt: null,
      dateOfReceipt: "",
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
                placeholder={showHistory ? "Search history..." : "Search pending material receipts..."}
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
              Pending Material Receipts ({filteredPendingData.length})
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
              Material Receipt History ({filteredHistoryData.length})
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
                  Completed Material Receipts
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Pending Material Receipts
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
              <p className="text-blue-600 text-sm">Loading Material Receipt data...</p>
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
                      Surveyor Name
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Number
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Copy
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Name
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Number Of IP
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GST Number
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GST Certificates
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank Account Details
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aadhar Card
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pan Card
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Work Order Number
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Work Order Copy
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dispatch Material
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inform To Customer
                    </th>
                    {showHistory && (
                      <>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Copy Of Receipt
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Of Receipt
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
                              onClick={() => handleAtSiteClick(record)}
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
                            <div className="text-xs text-gray-900">{record.surveyorName || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.surveyorContact || "—"}</div>
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
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.ipName || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.ipContact || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.gstNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.gstCertificates ? (
                              <a
                                href={record.gstCertificates}
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
                            {record.bankAccountDetails ? (
                              <a
                                href={record.bankAccountDetails}
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
                            {record.aadharCard ? (
                              <a
                                href={record.aadharCard}
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
                            {record.panCard ? (
                              <a
                                href={record.panCard}
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
                            <div className="text-xs text-gray-900">{record.workOrderNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.workOrderCopy ? (
                              <a
                                href={record.workOrderCopy}
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
                            <div className="text-xs text-gray-900">{record.dispatchMaterial || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.informToCustomer || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.copyOfReceipt ? (
                              <a
                                href={record.copyOfReceipt}
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
                            <div className="text-xs text-gray-900">{record.dateOfReceipt || "—"}</div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={23} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm
                            ? "No history records matching your search"
                            : "No completed material receipts found"}
                        </td>
                      </tr>
                    )
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleAtSiteClick(record)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-linear-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <Package className="h-3 w-3 mr-1" />
                            At Site
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
                          <div className="text-xs text-gray-900">{record.surveyorName || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.surveyorContact || "—"}</div>
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
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.ipName || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.ipContact || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.gstNumber || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {record.gstCertificates ? (
                            <a
                              href={record.gstCertificates}
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
                          {record.bankAccountDetails ? (
                            <a
                              href={record.bankAccountDetails}
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
                          {record.aadharCard ? (
                            <a
                              href={record.aadharCard}
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
                          {record.panCard ? (
                            <a
                              href={record.panCard}
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
                          <div className="text-xs text-gray-900">{record.workOrderNumber || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {record.workOrderCopy ? (
                            <a
                              href={record.workOrderCopy}
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
                          <div className="text-xs text-gray-900">{record.dispatchMaterial || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.informToCustomer || "—"}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={21} className="px-4 py-8 text-center text-gray-500 text-sm">
                        {searchTerm
                          ? "No pending material receipts matching your search"
                          : "No pending material receipts found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Material Receipt Modal */}
        {showReceiptModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white border max-w-4xl w-full shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Material Receipt Form - Enquiry: {selectedRecord.enquiryNumber}
                  </h3>
                  <button onClick={closeReceiptModal} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Pre-filled Details */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3 text-sm">Pre-filled Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Enquiry Number</label>
                      <input
                        type="text"
                        value={selectedRecord.enquiryNumber}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Beneficiary Name</label>
                      <input
                        type="text"
                        value={selectedRecord.beneficiaryName}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={selectedRecord.address}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Contact Number Of Beneficiary
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.contactNumber}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Surveyor Name</label>
                      <input
                        type="text"
                        value={selectedRecord.surveyorName}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number</label>
                      <input
                        type="text"
                        value={selectedRecord.surveyorContact}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Order Copy</label>
                      {selectedRecord.orderCopy ? (
                        <a
                          href={selectedRecord.orderCopy}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Order Copy
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">No order copy available</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Dispatch Material</label>
                      <input
                        type="text"
                        value={selectedRecord.dispatchMaterial}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Inform To Customer</label>
                      <input
                        type="text"
                        value={selectedRecord.informToCustomer}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Material Receipt Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Copy Of Receipt */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Copy Of Receipt <span className="text-red-500">*</span>
                      <span className="text-gray-500 text-xs ml-1">(Image/PDF)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload("copyOfReceipt", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <UploadStatus field="copyOfReceipt" />

                    {selectedRecord?.copyOfReceipt && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Existing:</span>
                        <button
                          type="button"
                          onClick={() => window.open(selectedRecord.copyOfReceipt, "_blank", "noopener,noreferrer")}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview Existing Receipt
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Date Of Receipt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Of Receipt <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiptForm.dateOfReceipt}
                      onChange={(e) => handleInputChange("dateOfReceipt", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
                  <button
                    onClick={closeReceiptModal}
                    disabled={isSubmitting}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReceiptSubmit}
                    disabled={isSubmitting || (!receiptForm.copyOfReceipt && !selectedRecord.copyOfReceipt) || !receiptForm.dateOfReceipt}
                    className="px-6 py-2 bg-linear-to-r from-green-500 to-blue-600 text-white rounded-md hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Submit
                      </>
                    )}
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

export default MaterialReceivedSitePage
