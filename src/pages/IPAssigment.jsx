"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, User } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
  // Updated Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
  // Updated Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1SFoN0eZ8TS6qEruTlGj-WELKkm8Gw2iU",
  // Sheet names
  SOURCE_SHEET_NAME: "FMS",
  // Updated page configuration
  PAGE_CONFIG: {
    title: "IP Assignment",
    historyTitle: "IP Assignment History",
    description: "Manage pending IP assignments",
    historyDescription: "View completed IP assignment records",
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

function IPAssignmentPage() {
  const [pendingData, setPendingData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showIPModal, setShowIPModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")

  // IP Assignment form state
  const [ipForm, setIpForm] = useState({
    ipName: "",
    contactNumberOfIP: "",
    gstNumber: "",
    gstCertificates: null,
    bankAccountDetails: null,
    aadharCard: null,
    panCard: null,
    workOrderNumber: "",
    workOrderCopy: null,
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

        // Check conditions: Column BB (index 53) not null and Column BC (index 54)
        const columnBB = rowValues[53] // Column BB
        const columnBC = rowValues[54] // Column BC

        const hasColumnBB = !isEmpty(columnBB)
        if (!hasColumnBB) return // Skip if column BB is empty

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
          villageBlock: rowValues[4] || "", // E
          district: rowValues[5] || "", // F
          contactNumber: rowValues[6] || "", // G
          addressProof: rowValues[28] || "", // AC
          surveyorName: rowValues[29] || "", // AD
          surveyorContact: rowValues[30] || "", // AE
          quotationCopy: rowValues[36] || "", // AK
          module: rowValues[47] || "", // AV
          inverter: rowValues[48] || "", // AW
          bos: rowValues[49] || "", // AX
          acdb: rowValues[50] || "", // AY
          dcdb: rowValues[51] || "", // AZ
          orderCopy: rowValues[52] || "", // BA
          // IP Assignment data
          actual: rowValues[54] || "", // BC
          ipName: rowValues[56] || "", // BE
          ipContact: rowValues[57] || "", // BF
          gstNumber: rowValues[58] || "", // BG
          gstCertificates: rowValues[59] || "", // BH
          bankAccountDetails: rowValues[60] || "", // BI
          aadharCard: rowValues[61] || "", // BJ
          panCard: rowValues[62] || "", // BK
          workOrderNumber: rowValues[63] || "", // BL
          workOrderCopy: rowValues[64] || "", // BM
        }

        // Check if Column BC is null for pending, not null for history
        const isColumnBCEmpty = isEmpty(columnBC)

        if (isColumnBCEmpty) {
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
      setError("Failed to load IP Assignment data: " + error.message)
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

  const handleIPClick = useCallback((record) => {
    setSelectedRecord(record)
    setIpForm({
      ipName: "",
      contactNumberOfIP: "",
      gstNumber: "",
      gstCertificates: null,
      bankAccountDetails: null,
      aadharCard: null,
      panCard: null,
      workOrderNumber: "",
      workOrderCopy: null,
    })
    setShowIPModal(true)
  }, [])

  const handleFileUpload = useCallback((field, file) => {
    setIpForm((prev) => ({ ...prev, [field]: file }))
  }, [])

  const handleInputChange = useCallback((field, value) => {
    setIpForm((prev) => ({ ...prev, [field]: value }))
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

  const handleIPSubmit = async () => {
    if (!ipForm.ipName || !ipForm.contactNumberOfIP) {
      alert("Please fill in required fields (IP Name and Contact Number)")
      return
    }

    setIsSubmitting(true)
    try {
      // Upload images and get URLs
      let gstCertificatesUrl = ""
      let bankAccountDetailsUrl = ""
      let aadharCardUrl = ""
      let panCardUrl = ""
      let workOrderCopyUrl = ""

      if (ipForm.gstCertificates) {
        gstCertificatesUrl = await uploadImageToDrive(ipForm.gstCertificates)
      }

      if (ipForm.bankAccountDetails) {
        bankAccountDetailsUrl = await uploadImageToDrive(ipForm.bankAccountDetails)
      }

      if (ipForm.aadharCard) {
        aadharCardUrl = await uploadImageToDrive(ipForm.aadharCard)
      }

      if (ipForm.panCard) {
        panCardUrl = await uploadImageToDrive(ipForm.panCard)
      }

      if (ipForm.workOrderCopy) {
        workOrderCopyUrl = await uploadImageToDrive(ipForm.workOrderCopy)
      }

      // Prepare update data - we need to send the complete row data
      const updateData = {
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
          "", // AT - keep existing
          "", // AU - keep existing
          "", // AV - keep existing
          "", // AW - keep existing
          "", // AX - keep existing
          "", // AY - keep existing
          "", // AZ - keep existing
          "", // BA - keep existing
          "", // BB - keep existing
          formatTimestamp(), // BC - Actual timestamp (index 54)
          "", // BD - keep existing
          ipForm.ipName, // BE - IP Name (index 56)
          ipForm.contactNumberOfIP, // BF - Contact Number Of IP (index 57)
          ipForm.gstNumber, // BG - GST Number (index 58)
          gstCertificatesUrl, // BH - GST Certificates (index 59)
          bankAccountDetailsUrl, // BI - Bank Account Details (index 60)
          aadharCardUrl, // BJ - Aadhar Card (index 61)
          panCardUrl, // BK - Pan Card (index 62)
          ipForm.workOrderNumber, // BL - Work Order Number (index 63)
          workOrderCopyUrl, // BM - Work Order Copy (index 64)
        ]),
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
        setSuccessMessage(`IP Assignment completed successfully for Enquiry Number: ${selectedRecord._enquiryNumber}`)
        setShowIPModal(false)
        // Move record from pending to history immediately
        setPendingData((prev) => prev.filter((record) => record._id !== selectedRecord._id))
        // Add to history with updated data
        const updatedRecord = {
          ...selectedRecord,
          actual: formatTimestamp(),
          ipName: ipForm.ipName,
          ipContact: ipForm.contactNumberOfIP,
          gstNumber: ipForm.gstNumber,
          gstCertificates: gstCertificatesUrl,
          bankAccountDetails: bankAccountDetailsUrl,
          aadharCard: aadharCardUrl,
          panCard: panCardUrl,
          workOrderNumber: ipForm.workOrderNumber,
          workOrderCopy: workOrderCopyUrl,
        }
        setHistoryData((prev) => [updatedRecord, ...prev])

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("")
        }, 3000)
      } else {
        throw new Error(result.error || "Failed to submit IP assignment")
      }
    } catch (error) {
      console.error("Error submitting IP assignment:", error)
      alert("Failed to submit IP assignment: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history")
    setSearchTerm("")
  }, [])

  const closeIPModal = useCallback(() => {
    setShowIPModal(false)
    setSelectedRecord(null)
    setIpForm({
      ipName: "",
      contactNumberOfIP: "",
      gstNumber: "",
      gstCertificates: null,
      bankAccountDetails: null,
      aadharCard: null,
      panCard: null,
      workOrderNumber: "",
      workOrderCopy: null,
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
                placeholder={showHistory ? "Search history..." : "Search pending IP assignments..."}
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
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              !showHistory
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Pending IP Assignments ({filteredPendingData.length})
            </div>
          </button>
          <button
            onClick={() => toggleSection("history")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              showHistory
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <History className="h-4 w-4 mr-2" />
              IP Assignment History ({filteredHistoryData.length})
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
                  Completed IP Assignments
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Pending IP Assignments
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
              <p className="text-blue-600 text-sm">Loading IP Assignment data...</p>
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
                      Village/Block
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dist.
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Number Of Beneficiary
                    </th>
                    {!showHistory && (
                      <>
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
                          Quotation Copy
                        </th>
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
                    {showHistory && (
                      <>
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
                            <div className="text-xs text-gray-900 font-medium text-blue-600">
                              {record.ipName || "—"}
                            </div>
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
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={19} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm ? "No history records matching your search" : "No completed IP assignments found"}
                        </td>
                      </tr>
                    )
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleIPClick(record)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <User className="h-3 w-3 mr-1" />
                            IP
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
                      <td colSpan={18} className="px-4 py-8 text-center text-gray-500 text-sm">
                        {searchTerm
                          ? "No pending IP assignments matching your search"
                          : "No pending IP assignments found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* IP Assignment Modal */}
        {showIPModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white border max-w-4xl w-full shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    IP Assignment Form - Enquiry: {selectedRecord.enquiryNumber}
                  </h3>
                  <button onClick={closeIPModal} className="text-gray-400 hover:text-gray-600">
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
                  </div>
                </div>

                {/* IP Assignment Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* IP Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IP Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ipForm.ipName}
                      onChange={(e) => handleInputChange("ipName", e.target.value)}
                      placeholder="Enter IP name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Contact Number Of IP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number Of IP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={ipForm.contactNumberOfIP}
                      onChange={(e) => handleInputChange("contactNumberOfIP", e.target.value)}
                      placeholder="Enter IP contact number"
                      maxLength="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* GST Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                    <input
                      type="text"
                      value={ipForm.gstNumber}
                      onChange={(e) => handleInputChange("gstNumber", e.target.value.toUpperCase())}
                      placeholder="Enter GST number"
                      maxLength="15"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Work Order Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Order Number</label>
                    <input
                      type="text"
                      value={ipForm.workOrderNumber}
                      onChange={(e) => handleInputChange("workOrderNumber", e.target.value)}
                      placeholder="Enter work order number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* GST Certificates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Certificates
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("gstCertificates", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {ipForm.gstCertificates && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {ipForm.gstCertificates.name}
                      </p>
                    )}
                  </div>

                  {/* Bank Account Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Account Details
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("bankAccountDetails", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {ipForm.bankAccountDetails && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {ipForm.bankAccountDetails.name}
                      </p>
                    )}
                  </div>

                  {/* Aadhar Card */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aadhar Card
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("aadharCard", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {ipForm.aadharCard && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {ipForm.aadharCard.name}
                      </p>
                    )}
                  </div>

                  {/* Pan Card */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pan Card
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("panCard", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {ipForm.panCard && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {ipForm.panCard.name}
                      </p>
                    )}
                  </div>

                  {/* Work Order Copy */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Work Order Copy
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("workOrderCopy", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {ipForm.workOrderCopy && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {ipForm.workOrderCopy.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
                  <button
                    onClick={closeIPModal}
                    disabled={isSubmitting}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleIPSubmit}
                    disabled={isSubmitting || !ipForm.ipName || !ipForm.contactNumberOfIP}
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

export default IPAssignmentPage
