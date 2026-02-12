"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, Receipt, Calendar, Wrench } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Updated Configuration object
const CONFIG = {
  // Updated Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbyg2JZ0lnX2lhsVcjHHOQUb29QH9jX8rNMWMU-uEAi3PHjrQ-sOb6FoO3Lx6gZT6h4W/exec",
  // Updated Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1A1-QDgKUGl8Chy5wPFXdFxM7-_OKYmg1",
  // Updated Sheet ID
  SHEET_ID: "1Cc8RltkrZMfeSgHqnrJ1zdTx-NDu1BpLnh5O7i711Pc",
  // Sheet names
  SOURCE_SHEET_NAME: "FMS",
  // Updated page configuration
  PAGE_CONFIG: {
    title: "Billings and Payment Details",
    historyTitle: "Billing and Payment Details History",
    description: "Manage pending billings and payment details",
    historyDescription: "View completed billing and payment details records",
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

function BillingsPage() {
  const [pendingData, setPendingData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showBillingModal, setShowBillingModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")

  // Billing form state - Updated with new date and payment fields
  const [billingForm, setBillingForm] = useState({
    consumerBillNumber: "",
    consumerBillCopy: null,
    vendorBillNumber: "",
    vendorCopy: null,
    invoiceDate: "",
    ipDate: "",
    amountReceived: "",
    paymentReference: "",
    paymentDate: "",
    deduction: "",
    paymentReferenceNumber: "",
    paymentStatus: "",
    outstanding: "",
    paymentReceipt: null,
  })

  // Professional upload state management
  const [fileUploads, setFileUploads] = useState({
    consumerBillCopy: { uploading: false, uploaded: false, url: "", error: null, name: "", ready: false },
    vendorCopy: { uploading: false, uploaded: false, url: "", error: null, name: "", ready: false },
    paymentReceipt: { uploading: false, uploaded: false, url: "", error: null, name: "", ready: false }
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

  const formatDateForSheet = useCallback((dateString) => {
    return formatDate(dateString)
  }, [formatDate])

  const isEmpty = useCallback((value) => {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
  }, [])

  useEffect(() => {
    const role = sessionStorage.getItem("role")
    const user = sessionStorage.getItem("username")
    setUserRole(role || "")
    setUsername(user || "")
  }, [])

  // Optimized data fetching with corrected column mappings
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

        // Updated conditions: Column CM (Index 90) must be NOT NULL
        const enquiryNumber = rowValues[1] || ""
        const columnCM = rowValues[90] // Column CM
        const columnCN = rowValues[91] // Column CN

        const hasEnquiry = !isEmpty(enquiryNumber)
        const isColumnCMEmpty = isEmpty(columnCM)

        // Skip if enquiry number is empty OR Column CM is empty
        if (!hasEnquiry || isColumnCMEmpty) return

        const googleSheetsRowIndex = rowIndex + 1

        const stableId = enquiryNumber
          ? `enquiry_${enquiryNumber}_${googleSheetsRowIndex}`
          : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

        const rowData = {
          _id: stableId,
          _rowIndex: googleSheetsRowIndex,
          _enquiryNumber: enquiryNumber,
          // Preserve original row data to prevent data loss during update
          _originalData: rowValues,
          // Basic info columns with corrected mappings
          enquiryNumber: rowValues[1] || "", // B
          beneficiaryName: rowValues[2] || "", // C
          address: rowValues[3] || "", // D
          contactNumber: rowValues[6] || "", // G
          surveyorName: rowValues[29] || "", // AD
          dispatchMaterial: rowValues[68] || "", // BQ (corrected from 67 to 68)
          informToCustomer: rowValues[72] || "", // BU (corrected from 71 to 72)
          copyOfReceipt: rowValues[76] || "", // BY (corrected from 75 to 76)
          dateOfReceipt: formatDate(rowValues[77] || ""), // BZ (corrected from 76 to 77)
          dateOfInstallation: formatDate(rowValues[81] || ""), // CD (corrected from 80 to 81)
          routing: rowValues[82] || "", // CE (corrected from 81 to 82)
          earthing: rowValues[83] || "", // CF (corrected from 82 to 83)
          baseFoundation: rowValues[84] || "", // CG (corrected from 83 to 84)
          wiring: rowValues[85] || "", // CH (corrected from 84 to 85)
          foundationPhoto: rowValues[86] || "", // CI (corrected from 85 to 86)
          afterInstallationPhoto: rowValues[87] || "", // CJ (corrected from 86 to 87)
          photoWithCustomer: rowValues[88] || "", // CK (corrected from 87 to 88)
          completeInstallationPhoto: rowValues[89] || "", // CL (corrected from 88 to 89)
          // Billing data with updated mappings
          actual: formatDate(rowValues[91] || ""), // CN (Actual Timestamp)
          consumerBillNumber: rowValues[93] || "", // CP (Invoice Number)
          vendorBillNumber: rowValues[94] || "", // CQ (Invoice Amount)
          invoiceDate: formatDate(rowValues[95] || ""), // CR (Invoice Date)
          consumerBillCopy: rowValues[96] || "", // CS (Invoice Copy)
          amountReceived: rowValues[143] || "", // EN (Amount Received)
          paymentDate: formatDate(rowValues[144] || ""), // EO (Payment Date)
          deduction: rowValues[154] || "", // EY (Deduction)
          paymentReference: rowValues[155] || "", // EZ (Payment Reference)
          paymentReferenceNumber: rowValues[156] || "", // FA (Reference Number)
          outstanding: rowValues[157] || "", // FB (Outstanding)
        }

        // Check if Column CN is null for pending, not null for history
        const isColumnCNEmpty = isEmpty(columnCN)

        if (isColumnCNEmpty) {
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
      setError("Failed to load Billing data: " + error.message)
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

  const handleBillingClick = useCallback((record) => {
    setSelectedRecord(record)
    setBillingForm({
      consumerBillNumber: record.consumerBillNumber || "",
      consumerBillCopy: null,
      vendorBillNumber: record.vendorBillNumber || "",
      vendorCopy: null,
      invoiceDate: formatDateForInput(record.invoiceDate || ""),
      ipDate: formatDateForInput(record.ipDate || ""),
      amountReceived: record.amountReceived || "",
      paymentReference: record.paymentReference || record.paymentMode || "",
      paymentDate: formatDateForInput(record.paymentDate || ""),
      deduction: record.deduction || record.paymentDeduction || "",
      paymentReferenceNumber: record.paymentReferenceNumber || "",
      paymentStatus: record.paymentStatus || "Completed",
      outstanding: record.outstanding || "",
      paymentReceipt: null,
    })

    setFileUploads({
      consumerBillCopy: { uploading: false, uploaded: !!record.consumerBillCopy, url: record.consumerBillCopy || "", error: null, name: record.consumerBillCopy ? "Existing Bill" : "", ready: false },
      vendorCopy: { uploading: false, uploaded: !!record.vendorCopy, url: record.vendorCopy || "", error: null, name: record.vendorCopy ? "Existing Bill" : "", ready: false },
      paymentReceipt: { uploading: false, uploaded: !!record.paymentReceipt, url: record.paymentReceipt || "", error: null, name: record.paymentReceipt ? "Existing Receipt" : "", ready: false }
    })

    setShowBillingModal(true)
  }, [formatDateForInput])

  const handleFileUpload = useCallback((field, file) => {
    if (!file) return;

    setBillingForm((prev) => ({ ...prev, [field]: file }))

    setFileUploads(prev => ({
      ...prev,
      [field]: { ...prev[field], uploading: false, uploaded: false, error: null, name: file.name, ready: true }
    }))
  }, [])

  const UploadStatus = ({ field }) => {
    const status = fileUploads[field]
    if (!status) return null

    if (status.uploading) {
      return (
        <div className="flex items-center mt-2 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs animate-pulse border border-blue-100">
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
          {status.name.includes("Existing") ? "Document Available" : "Successfully Uploaded"}
        </div>
      )
    }
    if (status.ready) {
      return (
        <div className="flex items-center mt-2 text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs border border-amber-100 font-medium italic">
          <Calendar className="h-3 w-3 mr-1" />
          File selected: {status.name} (Ready to upload)
        </div>
      )
    }
    return null
  }

  const handleInputChange = useCallback((field, value) => {
    setBillingForm((prev) => {
      const updated = { ...prev, [field]: value }

      // Auto-calculate outstanding = Invoice Amount - Amount Received - Deduction
      // Note: vendorBillNumber is being used for Invoice Amount in this UI
      if (["vendorBillNumber", "amountReceived", "deduction"].includes(field)) {
        const invoiceAmount = parseFloat(updated.vendorBillNumber) || 0
        const received = parseFloat(updated.amountReceived) || 0
        const deduction = parseFloat(updated.deduction) || 0
        const calcOutstanding = invoiceAmount - received - deduction
        updated.outstanding = calcOutstanding.toFixed(2)
      }

      return updated
    })
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
        formData.append("fileName", `${selectedRecord._enquiryNumber}_${Date.now()}.${file.name.split(".").pop()}`)
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

  const handleBillingSubmit = async () => {
    if (!billingForm.consumerBillNumber || !billingForm.vendorBillNumber || !billingForm.invoiceDate) {
      alert("Please fill in all required fields: Invoice Bill Number, IP Bill Number, and Invoice Date")
      return
    }

    setIsSubmitting(true)
    try {
      const isEdit = !isEmpty(selectedRecord.actual)
      const actualDate = formatTimestamp()

      // Process Sequential Uploads
      const fieldsToUpload = ["consumerBillCopy", "vendorCopy", "paymentReceipt"]
      const currentFileUploads = { ...fileUploads }

      for (const field of fieldsToUpload) {
        const fileObj = billingForm[field]
        if (fileObj && fileObj instanceof File) {
          setFileUploads(prev => ({
            ...prev,
            [field]: { ...prev[field], uploading: true, error: null }
          }))

          try {
            const uploadedUrl = await uploadImageToDrive(fileObj)
            currentFileUploads[field] = {
              uploading: false,
              uploaded: true,
              url: uploadedUrl,
              error: null,
              name: fileObj.name,
              ready: false
            }
            setFileUploads(prev => ({
              ...prev,
              [field]: currentFileUploads[field]
            }))
          } catch (uploadError) {
            setFileUploads(prev => ({
              ...prev,
              [field]: { ...prev[field], uploading: false, error: uploadError.message }
            }))
            throw new Error(`Failed to upload ${field}. Please try again.`)
          }
        }
      }

      const consumerBillCopyUrl = currentFileUploads.consumerBillCopy.url
      const vendorCopyUrl = currentFileUploads.vendorCopy.url
      const paymentReceiptUrl = currentFileUploads.paymentReceipt.url

      // Prepare update data using a sparse array (at least 167 columns for FK)
      const rowData = Array(Math.max(200, selectedRecord._originalData.length)).fill(null)

      rowData[91] = actualDate // CN - Actual Timestamp
      rowData[93] = billingForm.consumerBillNumber // CP
      rowData[94] = billingForm.vendorBillNumber // CQ (Invoice Amount)
      rowData[95] = formatDateForSheet(billingForm.invoiceDate) // CR
      rowData[96] = consumerBillCopyUrl // CS
      rowData[143] = billingForm.amountReceived // EN
      rowData[144] = formatDateForSheet(billingForm.paymentDate) // EO
      rowData[154] = billingForm.deduction // EY
      rowData[155] = billingForm.paymentReference // EZ
      rowData[156] = billingForm.paymentReferenceNumber // FA
      rowData[157] = billingForm.outstanding // FB

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
        setSuccessMessage(`Billing completed successfully for Enquiry Number: ${selectedRecord._enquiryNumber}`)
        setShowBillingModal(false)

        // Updated record for local state
        // Updated record for local state (must match fetchSheetData mapping)
        const updatedRecord = {
          ...selectedRecord,
          actual: formatDate(actualDate), // CN (formatted for consistency)
          consumerBillNumber: billingForm.consumerBillNumber, // CP
          vendorBillNumber: billingForm.vendorBillNumber, // CQ
          invoiceDate: billingForm.invoiceDate ? formatDate(billingForm.invoiceDate) : "—", // CR
          consumerBillCopy: consumerBillCopyUrl, // CS
          amountReceived: billingForm.amountReceived, // EN
          paymentDate: billingForm.paymentDate ? formatDate(billingForm.paymentDate) : "—", // EO
          deduction: billingForm.deduction, // EY
          paymentReference: billingForm.paymentReference, // EZ
          paymentReferenceNumber: billingForm.paymentReferenceNumber, // FA
          outstanding: billingForm.outstanding, // FB
        }

        if (isEdit) {
          setHistoryData((prev) => prev.map((rec) => (rec._id === selectedRecord._id ? updatedRecord : rec)))
        } else {
          setPendingData((prev) => prev.filter((record) => record._id !== selectedRecord._id))
          setHistoryData((prev) => [updatedRecord, ...prev])
        }

        setTimeout(() => setSuccessMessage(""), 3000)
      } else {
        throw new Error(result.error || "Failed to submit billing")
      }
    } catch (error) {
      console.error("Error submitting billing:", error)
      alert("Failed to submit billing: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history")
    setSearchTerm("")
  }, [])

  const closeBillingModal = useCallback(() => {
    setShowBillingModal(false)
    setSelectedRecord(null)
    setBillingForm({
      consumerBillNumber: "",
      consumerBillCopy: null,
      vendorBillNumber: "",
      vendorCopy: null,
      invoiceDate: "",
      ipDate: "",
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
                placeholder={showHistory ? "Search history..." : "Search pending billings..."}
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
              <Receipt className="h-4 w-4 mr-2" />
              Pending ({filteredPendingData.length})
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
              History ({filteredHistoryData.length})
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
                  Completed Billings
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Pending Billings
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
              <p className="text-blue-600 text-sm">Loading Billing data...</p>
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
                      Contact Number Of Beneficiary
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Surveyor Name
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dispatch Material
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inform To Customer
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Copy Of Receipt
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Of Receipt
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Of Installation
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Routing
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Earthing
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Foundation
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wiring
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Foundation Photo
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      After Installation Photo
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photo With Customer
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Complete Installation Photo
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Number
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Amount
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Date
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Copy
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Received
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Date
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deduction
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Reference
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference Number
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      OutStanding
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {showHistory ? (
                    filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-2 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleBillingClick(record)}
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
                            <div className="text-xs text-gray-900">{record.contactNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.surveyorName || "—"}</div>
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
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.dateOfInstallation || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.routing || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.earthing || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.baseFoundation || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.wiring || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.foundationPhoto ? (
                              <a
                                href={record.foundationPhoto}
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
                            {record.afterInstallationPhoto ? (
                              <a
                                href={record.afterInstallationPhoto}
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
                            {record.photoWithCustomer ? (
                              <a
                                href={record.photoWithCustomer}
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
                            {record.completeInstallationPhoto ? (
                              <a
                                href={record.completeInstallationPhoto}
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
                            <div className="text-xs font-medium text-green-600">{record.consumerBillNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-green-600">{record.vendorBillNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-blue-600 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {record.invoiceDate || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.consumerBillCopy ? (
                              <a
                                href={record.consumerBillCopy}
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
                            <div className="text-xs font-medium text-green-600">{record.amountReceived || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-blue-600 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {record.paymentDate || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-red-600">{record.deduction || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-purple-600">{record.paymentReference || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-700">{record.paymentReferenceNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-orange-600">{record.outstanding || "—"}</div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={29} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm ? "No history records matching your search" : "No completed billings found"}
                        </td>
                      </tr>
                    )
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleBillingClick(record)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-linear-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <Receipt className="h-3 w-3 mr-1" />
                            Billing
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
                          <div className="text-xs text-gray-900 flex items-center">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {record.contactNumber || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.surveyorName || "—"}</div>
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
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.dateOfInstallation || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.routing || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.earthing || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.baseFoundation || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.wiring || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {record.foundationPhoto ? (
                            <a
                              href={record.foundationPhoto}
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
                          {record.afterInstallationPhoto ? (
                            <a
                              href={record.afterInstallationPhoto}
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
                          {record.photoWithCustomer ? (
                            <a
                              href={record.photoWithCustomer}
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
                          {record.completeInstallationPhoto ? (
                            <a
                              href={record.completeInstallationPhoto}
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
                          <div className="text-xs font-medium text-green-600">{record.consumerBillNumber || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-green-600">{record.vendorBillNumber || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-blue-600 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {record.invoiceDate || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {record.consumerBillCopy ? (
                            <a
                              href={record.consumerBillCopy}
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
                          <div className="text-xs font-medium text-green-600">{record.amountReceived || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-blue-600 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {record.paymentDate || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-red-600">{record.deduction || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-purple-600">{record.paymentReference || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-700">{record.paymentReferenceNumber || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-orange-600">{record.outstanding || "—"}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={29} className="px-4 py-8 text-center text-gray-500 text-sm">
                        {searchTerm ? "No pending billings matching your search" : "No pending billings found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Billing Modal */}
        {showBillingModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white border max-w-3xl w-full shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Billings and Payment  - Enquiry: {selectedRecord.enquiryNumber}
                  </h3>
                  <button onClick={closeBillingModal} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Pre-filled Beneficiary Details */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3 text-sm">Beneficiary Details (Pre-filled)</h4>
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
                  </div>
                </div>

                {/* Billing Form */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                    {/* invoice Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invoice Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={billingForm.consumerBillNumber}
                        onChange={(e) => handleInputChange("consumerBillNumber", e.target.value)}
                        placeholder="Enter invoice number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all"
                      />
                    </div>

                    {/* Invoice Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invoice Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={billingForm.vendorBillNumber}
                        onChange={(e) => handleInputChange("vendorBillNumber", e.target.value)}
                        placeholder="Enter invoice amount"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all"
                      />
                    </div>

                    {/* Invoice Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invoice Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={billingForm.invoiceDate}
                        onChange={(e) => handleInputChange("invoiceDate", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all"
                      />
                    </div>

                    {/* Invoice Copy */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invoice Copy
                        <span className="text-gray-500 text-xs ml-1">(Image)</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload("consumerBillCopy", e.target.files[0])}
                            className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all border border-gray-200 rounded-md"
                          />
                        </div>
                        <div className="w-10 h-9 shrink-0">
                          {selectedRecord.consumerBillCopy ? (
                            <a
                              href={selectedRecord.consumerBillCopy}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full h-full flex items-center justify-center border border-blue-200 rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all shadow-xs"
                              title="View Previous Invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center border border-gray-200 rounded-md text-gray-300 bg-gray-50 cursor-not-allowed"
                              title="No previous file"
                            >
                              <Eye className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                      <UploadStatus field="consumerBillCopy" />
                    </div>
                  </div>

                  {/* Payment Details Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-800">Payment Details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Amount Received */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount Received
                        </label>
                        <input
                          type="text"
                          value={billingForm.amountReceived}
                          onChange={(e) => handleInputChange("amountReceived", e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all"
                        />
                      </div>


                      {/* Payment Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={billingForm.paymentDate}
                          onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all"
                        />
                      </div>

                      {/* Deduction */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Deduction
                        </label>
                        <input
                          type="text"
                          value={billingForm.deduction}
                          onChange={(e) => handleInputChange("deduction", e.target.value)}
                          placeholder="Enter deduction if any"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all"
                        />
                      </div>

                      {/* Payment Reference */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Reference <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={billingForm.paymentReference}
                          onChange={(e) => handleInputChange("paymentReference", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all bg-white"
                        >
                          <option value="">Select Reference</option>
                          <option value="UPI">UPI</option>
                          <option value="Net Banking">Net Banking</option>
                          <option value="RTGs">RTGs</option>
                          <option value="NEFT">NEFT</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Debit Card">Debit Card</option>
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Demand Draft">Demand Draft</option>
                        </select>
                      </div>

                      {/*Reference Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reference Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={billingForm.paymentReferenceNumber}
                          onChange={(e) => handleInputChange("paymentReferenceNumber", e.target.value)}
                          placeholder="Enter Cheque/RTGS Number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all"
                        />
                      </div>


                      {/* OutStanding*/}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          OutStanding
                        </label>
                        <input
                          type="text"
                          value={billingForm.outstanding}
                          onChange={(e) => handleInputChange("outstanding", e.target.value)}
                          placeholder="Enter OutStanding"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all"
                        />
                      </div>


                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
                  <button
                    onClick={closeBillingModal}
                    disabled={isSubmitting}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBillingSubmit}
                    disabled={isSubmitting || !billingForm.consumerBillNumber || !billingForm.vendorBillNumber || !billingForm.invoiceDate || !billingForm.paymentReference || !billingForm.paymentDate || !billingForm.paymentReferenceNumber}
                    className="px-6 py-2 bg-linear-to-r from-green-500 to-blue-600 text-white rounded-md hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Submit Billing
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

export default BillingsPage