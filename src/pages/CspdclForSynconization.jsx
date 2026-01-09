"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, FileText } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
  // Updated Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbw1k2SxGQ3xopYDCGDmZSYFyS3y3mSB5YJhR9SRDO6CavtmGg3h84PRSfwdnHQGt4MV/exec",
  // Updated Google Sheet ID
  SHEET_ID: "1Cc8RltkrZMfeSgHqnrJ1zdTx-NDu1BpLnh5O7i711Pc",
  // Updated Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1FOIqdjF8-B4A7FCEt9EWl7qKeN3qybj7",
  // Sheet names
  SOURCE_SHEET_NAME: "FMS",
  // Updated page configuration
  PAGE_CONFIG: {
    title: "CSPDCL Doc",
    historyTitle: "CSPDCL Doc History",
    description: "Manage pending document submissions",
    historyDescription: "View completed document records",
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

function CSPDCLDocPage() {
  const [pendingData, setPendingData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")

  // Document form state - Updated to use checkboxes that store 'OK' or blank
  const [docForm, setDocForm] = useState({
    powerPurchaseAgreement: null,
    vendorConsumerAgreement: null,
    quotationCopy: false,
    applicationCopy: false,
    physibilityReport: false,
    tokenForSubsidy: false,
    panCard: false,
    aadharCard: false,
    cancellationCheque: false,
    electricityBill: false,
    witnessIdProof: false,
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

    // Return formatted datetime string exactly as "DD/MM/YYYY hh:mm:ss"
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

        // Condition: Column CT (index 97) not null for both pending and history
        // Column CU (index 98) null for pending, not null for history
        const columnCT = rowValues[97] // Column CT
        const columnCU = rowValues[98] // Column CU

        const hasColumnCT = !isEmpty(columnCT)
        if (!hasColumnCT) return // Skip if column CT is empty

        const googleSheetsRowIndex = rowIndex + 1
        const enquiryNumber = rowValues[1] || ""

        const stableId = enquiryNumber
          ? `enquiry_${enquiryNumber}_${googleSheetsRowIndex}`
          : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

        const rowData = {
          _id: stableId,
          _rowIndex: googleSheetsRowIndex,
          _enquiryNumber: enquiryNumber,

          // Basic info columns with exact mappings as specified
          enquiryNumber: rowValues[1] || "", // B
          beneficiaryName: rowValues[2] || "", // C
          address: rowValues[3] || "", // D
          contactNumber: rowValues[6] || "", // G
          surveyorName: rowValues[29] || "", // AD
          dispatchMaterial: rowValues[69] || "", // BQ (column BQ is index 69, not 68)
          informToCustomer: rowValues[72] || "", // BU
          copyOfReceipt: rowValues[76] || "", // BY
          dateOfReceipt: rowValues[77] || "", // BZ
          dateOfInstallation: rowValues[81] || "", // CD
          completeInstallationPhoto: rowValues[89] || "", // CL
          consumerBillNumber: rowValues[93] || "", // CP
          vendorBillNumber: rowValues[95] || "", // CR

          // Document submission data - FIXED column mappings
          actual: rowValues[98] || "", // CU - timestamp
          powerPurchaseAgreement: rowValues[100] || "", // CW
          vendorConsumerAgreement: rowValues[101] || "", // CX
          quotationCopy: rowValues[102] || "", // CY
          applicationCopy: rowValues[103] || "", // CZ
          physibilityReport: rowValues[104] || "", // DA - FIXED: was 105, now 104
          tokenForSubsidy: rowValues[105] || "", // DB - FIXED: was 106, now 105
          panCard: rowValues[106] || "", // DC - FIXED: was 107, now 106
          aadharCard: rowValues[107] || "", // DD - FIXED: was 108, now 107
          cancellationCheque: rowValues[108] || "", // DE - FIXED: was 109, now 108
          electricityBill: rowValues[109] || "", // DF - FIXED: was 110, now 109
          witnessIdProof: rowValues[110] || "", // DG - FIXED: was 111, now 110
        }

        // Check if Column CU is null for pending, not null for history
        const isColumnCUEmpty = isEmpty(columnCU)

        if (isColumnCUEmpty) {
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
      setError("Failed to load CSPDCL Doc data: " + error.message)
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

  const handleDocClick = useCallback((record) => {
    setSelectedRecord(record)
    setDocForm({
      powerPurchaseAgreement: null,
      vendorConsumerAgreement: null,
      quotationCopy: false,
      applicationCopy: false,
      physibilityReport: false,
      tokenForSubsidy: false,
      panCard: false,
      aadharCard: false,
      cancellationCheque: false,
      electricityBill: false,
      witnessIdProof: false,
    })
    setShowDocModal(true)
  }, [])

  const handleFileUpload = useCallback((field, file) => {
    setDocForm((prev) => ({ ...prev, [field]: file }))
  }, [])

  const handleCheckboxChange = useCallback((field, checked) => {
    setDocForm((prev) => ({ ...prev, [field]: checked }))
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

  const handleDocSubmit = async () => {
    if (!docForm.powerPurchaseAgreement || !docForm.vendorConsumerAgreement) {
      alert("Please upload required images (Power Purchase Agreement and Vendor Consumer Agreement)")
      return
    }

    setIsSubmitting(true)
    try {
      // Upload images and get URLs
      let powerPurchaseAgreementUrl = ""
      let vendorConsumerAgreementUrl = ""

      if (docForm.powerPurchaseAgreement) {
        powerPurchaseAgreementUrl = await uploadImageToDrive(docForm.powerPurchaseAgreement)
      }

      if (docForm.vendorConsumerAgreement) {
        vendorConsumerAgreementUrl = await uploadImageToDrive(docForm.vendorConsumerAgreement)
      }

      // Create a full row array with existing data plus new document data
      // Initialize array with empty strings for all columns (up to column DG which is index 110)
      const rowData = new Array(111).fill("")

      // Fill existing data from selectedRecord
      rowData[1] = selectedRecord.enquiryNumber || "" // B - Enquiry Number
      rowData[2] = selectedRecord.beneficiaryName || "" // C - Beneficiary Name
      rowData[3] = selectedRecord.address || "" // D - Address
      rowData[6] = selectedRecord.contactNumber || "" // G - Contact Number
      rowData[29] = selectedRecord.surveyorName || "" // AD - Surveyor Name
      rowData[69] = selectedRecord.dispatchMaterial || "" // BQ - Dispatch Material (corrected index)
      rowData[72] = selectedRecord.informToCustomer || "" // BU - Inform To Customer
      rowData[76] = selectedRecord.copyOfReceipt || "" // BY - Copy Of Receipt
      rowData[77] = selectedRecord.dateOfReceipt || "" // BZ - Date Of Receipt
      rowData[81] = selectedRecord.dateOfInstallation || "" // CD - Date Of Installation
      rowData[89] = selectedRecord.completeInstallationPhoto || "" // CL - Complete Installation Photo
      rowData[93] = selectedRecord.consumerBillNumber || "" // CP - Consumer Bill Number
      rowData[95] = selectedRecord.vendorBillNumber || "" // CR - Vendor Bill Number

      // Keep Column CT unchanged (this is what identifies the record)
      rowData[97] = selectedRecord.actual || rowData[97] // CT - Keep existing value

      // Add new document submission data with FIXED column mapping
      rowData[98] = formatTimestamp() // CU - Actual timestamp
      rowData[100] = powerPurchaseAgreementUrl // CW - Power Purchase Agreement
      rowData[101] = vendorConsumerAgreementUrl // CX - Vendor Consumer Agreement
      rowData[102] = docForm.quotationCopy ? "OK" : "" // CY - Quotation Copy (store 'OK' or blank)
      rowData[103] = docForm.applicationCopy ? "OK" : "" // CZ - Application Copy
      rowData[104] = docForm.physibilityReport ? "OK" : "" // DA - FIXED: was 105, now 104
      rowData[105] = docForm.tokenForSubsidy ? "OK" : "" // DB - FIXED: was 106, now 105
      rowData[106] = docForm.panCard ? "OK" : "" // DC - FIXED: was 107, now 106
      rowData[107] = docForm.aadharCard ? "OK" : "" // DD - FIXED: was 108, now 107
      rowData[108] = docForm.cancellationCheque ? "OK" : "" // DE - FIXED: was 109, now 108
      rowData[109] = docForm.electricityBill ? "OK" : "" // DF - FIXED: was 110, now 109
      rowData[110] = docForm.witnessIdProof ? "OK" : "" // DG - FIXED: was 111, now 110

      // Prepare update data using existing update action
      const updateData = new FormData()
      updateData.append("action", "update")
      updateData.append("sheetName", CONFIG.SOURCE_SHEET_NAME)
      updateData.append("rowIndex", selectedRecord._rowIndex.toString())
      updateData.append("rowData", JSON.stringify(rowData))

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: updateData,
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage(
          `Document submission completed successfully for Enquiry Number: ${selectedRecord._enquiryNumber}`,
        )
        setShowDocModal(false)

        // Move record from pending to history immediately
        setPendingData((prev) => prev.filter((record) => record._id !== selectedRecord._id))

        // Add to history with updated data
        const updatedRecord = {
          ...selectedRecord,
          actual: formatTimestamp(),
          powerPurchaseAgreement: powerPurchaseAgreementUrl,
          vendorConsumerAgreement: vendorConsumerAgreementUrl,
          quotationCopy: docForm.quotationCopy ? "OK" : "",
          applicationCopy: docForm.applicationCopy ? "OK" : "",
          physibilityReport: docForm.physibilityReport ? "OK" : "",
          tokenForSubsidy: docForm.tokenForSubsidy ? "OK" : "",
          panCard: docForm.panCard ? "OK" : "",
          aadharCard: docForm.aadharCard ? "OK" : "",
          cancellationCheque: docForm.cancellationCheque ? "OK" : "",
          electricityBill: docForm.electricityBill ? "OK" : "",
          witnessIdProof: docForm.witnessIdProof ? "OK" : "",
        }

        setHistoryData((prev) => [updatedRecord, ...prev])

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("")
        }, 3000)
      } else {
        throw new Error(result.error || "Failed to submit document")
      }
    } catch (error) {
      console.error("Error submitting document:", error)
      alert("Failed to submit document: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history")
    setSearchTerm("")
  }, [])

  const closeDocModal = useCallback(() => {
    setShowDocModal(false)
    setSelectedRecord(null)
    setDocForm({
      powerPurchaseAgreement: null,
      vendorConsumerAgreement: null,
      quotationCopy: false,
      applicationCopy: false,
      physibilityReport: false,
      tokenForSubsidy: false,
      panCard: false,
      aadharCard: false,
      cancellationCheque: false,
      electricityBill: false,
      witnessIdProof: false,
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
                placeholder={showHistory ? "Search history..." : "Search pending documents..."}
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
              <FileText className="h-4 w-4 mr-2" />
              Pending Documents ({filteredPendingData.length})
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
              Document History ({filteredHistoryData.length})
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
                  Completed Documents
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Pending Documents
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
              <p className="text-blue-600 text-sm">Loading CSPDCL Doc data...</p>
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
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
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
                    {!showHistory && (
                      <>
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
                          Complete Installation Photo
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Consumer Bill Number
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor Bill Number
                        </th>
                      </>
                    )}
                    {showHistory && (
                      <>
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
                          Physibility Report
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Token For Subsidy
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pan Card
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aadhar Card
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cancellation Cheque
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Electricity Bill
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Witness Id Proof
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
                            <div className="text-xs text-gray-900">{record.enquiryNumber || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.beneficiaryName || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.address || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.contactNumber || "—"}</div>
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
                            <div className="text-xs text-gray-900">{record.physibilityReport || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.tokenForSubsidy || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.panCard || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.aadharCard || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.cancellationCheque || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.electricityBill || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.witnessIdProof || "—"}</div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={17} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm ? "No history records matching your search" : "No completed documents found"}
                        </td>
                      </tr>
                    )
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleDocClick(record)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Doc
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
                          <div className="text-xs text-gray-900">{record.consumerBillNumber || "—"}</div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{record.vendorBillNumber || "—"}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={15} className="px-4 py-8 text-center text-gray-500 text-sm">
                        {searchTerm ? "No pending documents matching your search" : "No pending documents found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Document Submission Modal */}
        {showDocModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white border max-w-4xl w-full shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Document Submission Form - Enquiry: {selectedRecord.enquiryNumber}
                  </h3>
                  <button onClick={closeDocModal} className="text-gray-400 hover:text-gray-600">
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

                {/* Document Submission Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Power Purchase Agreement */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Power Purchase Agreement <span className="text-red-500">*</span>
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("powerPurchaseAgreement", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {docForm.powerPurchaseAgreement && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {docForm.powerPurchaseAgreement.name}
                      </p>
                    )}
                  </div>

                  {/* Vendor Consumer Agreement */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendor Consumer Agreement <span className="text-red-500">*</span>
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("vendorConsumerAgreement", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {docForm.vendorConsumerAgreement && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {docForm.vendorConsumerAgreement.name}
                      </p>
                    )}
                  </div>

                  {/* Checkbox Fields */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="quotationCopy"
                      checked={docForm.quotationCopy}
                      onChange={(e) => handleCheckboxChange("quotationCopy", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="quotationCopy" className="ml-2 block text-sm text-gray-900">
                      Quotation Copy
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="applicationCopy"
                      checked={docForm.applicationCopy}
                      onChange={(e) => handleCheckboxChange("applicationCopy", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="applicationCopy" className="ml-2 block text-sm text-gray-900">
                      Application Copy
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="physibilityReport"
                      checked={docForm.physibilityReport}
                      onChange={(e) => handleCheckboxChange("physibilityReport", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="physibilityReport" className="ml-2 block text-sm text-gray-900">
                      Physibility Report
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="tokenForSubsidy"
                      checked={docForm.tokenForSubsidy}
                      onChange={(e) => handleCheckboxChange("tokenForSubsidy", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="tokenForSubsidy" className="ml-2 block text-sm text-gray-900">
                      Token For Subsidy
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="panCard"
                      checked={docForm.panCard}
                      onChange={(e) => handleCheckboxChange("panCard", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="panCard" className="ml-2 block text-sm text-gray-900">
                      Pan Card
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="aadharCard"
                      checked={docForm.aadharCard}
                      onChange={(e) => handleCheckboxChange("aadharCard", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="aadharCard" className="ml-2 block text-sm text-gray-900">
                      Aadhar Card
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="cancellationCheque"
                      checked={docForm.cancellationCheque}
                      onChange={(e) => handleCheckboxChange("cancellationCheque", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="cancellationCheque" className="ml-2 block text-sm text-gray-900">
                      Cancellation Cheque
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="electricityBill"
                      checked={docForm.electricityBill}
                      onChange={(e) => handleCheckboxChange("electricityBill", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="electricityBill" className="ml-2 block text-sm text-gray-900">
                      Electricity Bill
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="witnessIdProof"
                      checked={docForm.witnessIdProof}
                      onChange={(e) => handleCheckboxChange("witnessIdProof", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="witnessIdProof" className="ml-2 block text-sm text-gray-900">
                      Witness Id Proof
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
                  <button
                    onClick={closeDocModal}
                    disabled={isSubmitting}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDocSubmit}
                    disabled={isSubmitting || !docForm.powerPurchaseAgreement || !docForm.vendorConsumerAgreement}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-md hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
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

export default CSPDCLDocPage