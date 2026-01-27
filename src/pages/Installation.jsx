"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, Wrench } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

const CONFIG = {
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
  DRIVE_FOLDER_ID: "1SUhoI00UZ8jkao8tXVCPAbyBZLoYp5ko",
  SHEET_ID: "1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4",
  SOURCE_SHEET_NAME: "FMS",
  DROPDOWN_SHEET_NAME: "Drop-Down value",
  PAGE_CONFIG: {
    title: "Installation",
    historyTitle: "Installation History",
    description: "Manage pending installations",
    historyDescription: "View completed installation records",
  },
}

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

function InstallationPage() {
  const [pendingData, setPendingData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [dropdownOptions, setDropdownOptions] = useState({
    inverterMake: [],
    inverterCapacity: [],
    moduleMake: [],
    moduleCapacity: [],
    moduleType: [],
    structureMake: [],
    phase: [],
  })
  const [dropdownLoading, setDropdownLoading] = useState(false)
  const [installForm, setInstallForm] = useState({
    inverterMake: "",
    inverterCapacity: "",
    moduleMake: "",
    moduleCapacity: "",
    moduleType: "",
    structureMake: "",
    dateOfInstallation: "",
    routing: "",
    earthing: "",
    baseFoundation: "",
    wiring: "",
    foundationPhoto: null,
    afterInstallationPhoto: null,
    photoWithCustomer: null,
    completeInstallationPhoto: null,
    repeatedCertificate: null,
    projectCommissioningCertificate: null,
    inverterId: "",
  })

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

  const isEmpty = useCallback((value) => {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
  }, [])

  useEffect(() => {
    const role = sessionStorage.getItem("role")
    const user = sessionStorage.getItem("username")
    setUserRole(role || "")
    setUsername(user || "")
  }, [])

  const fetchDropdownOptions = useCallback(async () => {
    try {
      setDropdownLoading(true)
      const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.DROPDOWN_SHEET_NAME}&action=fetch`)
      if (!response.ok) {
        throw new Error(`Failed to fetch dropdown data: ${response.status}`)
      }
      const text = await response.text()
      const data = JSON.parse(text)
      const options = {
        inverterMake: [],
        inverterCapacity: [],
        moduleMake: [],
        moduleCapacity: [],
        moduleType: [],
        structureMake: [],
        phase: [],
      }

      if (data.values) {
        // Process as Google Sheets API v4 response
        data.values.slice(1).forEach((row) => {
          if (row && row.length >= 14) {
            options.inverterMake.push(String(row[8] || ""))
            options.inverterCapacity.push(String(row[9] || ""))
            options.moduleMake.push(String(row[10] || ""))
            options.moduleCapacity.push(String(row[11] || ""))
            options.moduleType.push(String(row[12] || ""))
            options.structureMake.push(String(row[13] || ""))
            if (row[15]) options.phase.push(String(row[15] || "")) // Column P (index 15)
          }
        })
      } else if (data.table && data.table.rows) {
        // Process as older Google Sheets API response
        data.table.rows.slice(1).forEach((row) => {
          if (row.c && row.c.length >= 14) {
            options.inverterMake.push(String(row.c[8]?.v || ""))
            options.inverterCapacity.push(String(row.c[9]?.v || ""))
            options.moduleMake.push(String(row.c[10]?.v || ""))
            options.moduleCapacity.push(String(row.c[11]?.v || ""))
            options.moduleType.push(String(row.c[12]?.v || ""))
            options.structureMake.push(String(row.c[13]?.v || ""))
            if (row.c[15]?.v) options.phase.push(String(row.c[15]?.v || "")) // Column P (index 15)
          }
        })
      }

      // Clean and sort options - ensure we only process strings
      Object.keys(options).forEach((key) => {
        options[key] = [...new Set(options[key])] // Remove duplicates
          .filter((item) => typeof item === "string" && item.trim() !== "") // Filter valid strings
          .sort() // Sort alphabetically
      })

      setDropdownOptions(options)
    } catch (error) {
      console.error("Error fetching dropdown options:", error)
      setError("Failed to load dropdown options: " + error.message)
    } finally {
      setDropdownLoading(false)
    }
  }, [])

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
        if (rowIndex < 6) return

        let rowValues = []
        if (row.c) {
          rowValues = row.c.map((cell) => (cell && cell.v !== undefined ? cell.v : ""))
        } else if (Array.isArray(row)) {
          rowValues = row
        } else {
          return
        }

        const enquiryNumber = rowValues[1] || ""
        const columnCB = rowValues[79] // Column CB
        const hasEnquiry = !isEmpty(enquiryNumber)

        if (!hasEnquiry) return

        const googleSheetsRowIndex = rowIndex + 1
        const stableId = enquiryNumber
          ? `enquiry_${enquiryNumber}_${googleSheetsRowIndex}`
          : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

        const rowData = {
          _id: stableId,
          _rowIndex: googleSheetsRowIndex,
          _enquiryNumber: enquiryNumber,
          enquiryNumber: rowValues[1] || "",
          beneficiaryName: rowValues[2] || "",
          address: rowValues[3] || "",
          contactNumber: rowValues[6] || "",
          surveyorName: rowValues[29] || "",
          surveyorContact: rowValues[30] || "",
          orderCopy: rowValues[52] || "",
          ipName: rowValues[56] || "",
          ipContact: rowValues[57] || "",
          gstNumber: rowValues[58] || "",
          aadharCard: rowValues[61] || "",
          panCard: rowValues[62] || "",
          workOrderNumber: rowValues[63] || "",
          workOrderCopy: rowValues[64] || "",
          dispatchMaterial: rowValues[68] || "",
          informToCustomer: rowValues[72] || "",
          copyOfReceipt: rowValues[76] || "",
          dateOfReceipt: formatDate(rowValues[77] || ""),
          actual: rowValues[79] || "",
          dateOfInstallation: formatDate(rowValues[81] || ""),
          routing: rowValues[82] || "",
          earthing: rowValues[83] || "",
          baseFoundation: rowValues[84] || "",
          wiring: rowValues[85] || "",
          foundationPhoto: rowValues[86] || "",
          afterInstallationPhoto: rowValues[87] || "",
          photoWithCustomer: rowValues[88] || "",
          completeInstallationPhoto: rowValues[89] || "",
          inverterMake: rowValues[137] || "",
          inverterCapacity: rowValues[138] || "",
          moduleMake: rowValues[139] || "",
          moduleCapacity: rowValues[140] || "",
          moduleType: rowValues[141] || "",
          structureMake: rowValues[142] || "",
          investorId: rowValues[151] || "",
          repeatedCertificate: rowValues[152] || "", // EW
          projectCommissioningCertificate: rowValues[153] || "", // EX
        }

        const isColumnCBEmpty = isEmpty(columnCB)
        if (isColumnCBEmpty) {
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
      setError("Failed to load Installation data: " + error.message)
      setLoading(false)
    }
  }, [isEmpty, formatDate])

  useEffect(() => {
    fetchSheetData()
    fetchDropdownOptions()
  }, [fetchSheetData, fetchDropdownOptions])

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

  const handleInstallClick = useCallback((record) => {
    setSelectedRecord(record)
    setInstallForm({
      inverterMake: record.inverterMake || "",
      inverterCapacity: record.inverterCapacity || "",
      moduleMake: record.moduleMake || "",
      moduleCapacity: record.moduleCapacity || "",
      moduleType: record.moduleType || "",
      structureMake: record.structureMake || "",
      dateOfInstallation: formatDateForInput(record.dateOfInstallation || ""),
      routing: record.routing || "",
      earthing: record.earthing || "",
      baseFoundation: record.baseFoundation || "",
      wiring: record.wiring || "",
      foundationPhoto: null,
      afterInstallationPhoto: null,
      photoWithCustomer: null,
      completeInstallationPhoto: null,
      repeatedCertificate: null,
      projectCommissioningCertificate: null,
      inverterId: record.investorId || "",
    })
    setShowInstallModal(true)
  }, [formatDateForInput])

  const handleFileUpload = useCallback((field, file) => {
    setInstallForm((prev) => ({ ...prev, [field]: file }))
  }, [])

  const handleInputChange = useCallback((field, value) => {
    setInstallForm((prev) => ({ ...prev, [field]: value }))
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

  const handleInstallSubmit = async () => {
    if (!installForm.dateOfInstallation) {
      alert("Please select the date of installation")
      return
    }

    setIsSubmitting(true)
    try {
      const isEdit = !isEmpty(selectedRecord.actual)
      const actualDate = isEdit ? selectedRecord.actual : formatTimestamp()

      let foundationPhotoUrl = ""
      if (installForm.foundationPhoto) foundationPhotoUrl = await uploadImageToDrive(installForm.foundationPhoto)
      else if (isEdit && selectedRecord.foundationPhoto) foundationPhotoUrl = selectedRecord.foundationPhoto

      let afterInstallationPhotoUrl = ""
      if (installForm.afterInstallationPhoto) afterInstallationPhotoUrl = await uploadImageToDrive(installForm.afterInstallationPhoto)
      else if (isEdit && selectedRecord.afterInstallationPhoto) afterInstallationPhotoUrl = selectedRecord.afterInstallationPhoto

      let photoWithCustomerUrl = ""
      if (installForm.photoWithCustomer) photoWithCustomerUrl = await uploadImageToDrive(installForm.photoWithCustomer)
      else if (isEdit && selectedRecord.photoWithCustomer) photoWithCustomerUrl = selectedRecord.photoWithCustomer

      let completeInstallationPhotoUrl = ""
      if (installForm.completeInstallationPhoto) completeInstallationPhotoUrl = await uploadImageToDrive(installForm.completeInstallationPhoto)
      else if (isEdit && selectedRecord.completeInstallationPhoto) completeInstallationPhotoUrl = selectedRecord.completeInstallationPhoto

      let repeatedCertificateUrl = ""
      if (installForm.repeatedCertificate) repeatedCertificateUrl = await uploadImageToDrive(installForm.repeatedCertificate)
      else if (isEdit && selectedRecord.repeatedCertificate) repeatedCertificateUrl = selectedRecord.repeatedCertificate

      let projectCommissioningCertificateUrl = ""
      if (installForm.projectCommissioningCertificate) projectCommissioningCertificateUrl = await uploadImageToDrive(installForm.projectCommissioningCertificate)
      else if (isEdit && selectedRecord.projectCommissioningCertificate) projectCommissioningCertificateUrl = selectedRecord.projectCommissioningCertificate

      // FIXED: Use null for columns we don't want to update
      const rowData = Array(154).fill(null)

      rowData[79] = actualDate // CB
      rowData[81] = formatDate(installForm.dateOfInstallation) // CD
      rowData[82] = installForm.routing // CE
      rowData[83] = installForm.earthing // CF
      rowData[84] = installForm.baseFoundation // CG
      rowData[85] = installForm.wiring // CH
      rowData[86] = foundationPhotoUrl // CI
      rowData[87] = afterInstallationPhotoUrl // CJ
      rowData[88] = photoWithCustomerUrl // CK
      rowData[89] = completeInstallationPhotoUrl // CL

      rowData[137] = installForm.inverterMake // EH
      rowData[138] = installForm.inverterCapacity // EI
      rowData[139] = installForm.moduleMake // EJ
      rowData[140] = installForm.moduleCapacity // EK
      rowData[141] = installForm.moduleType // EL
      rowData[142] = installForm.structureMake // EM
      rowData[151] = installForm.inverterId // EV
      rowData[152] = repeatedCertificateUrl // EW
      rowData[153] = projectCommissioningCertificateUrl // EX

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
        setSuccessMessage(`Installation completed successfully for Enquiry Number: ${selectedRecord._enquiryNumber}`)
        setShowInstallModal(false)

        const updatedRecord = {
          ...selectedRecord,
          actual: actualDate,
          dateOfInstallation: formatDate(installForm.dateOfInstallation),
          routing: installForm.routing,
          earthing: installForm.earthing,
          baseFoundation: installForm.baseFoundation,
          wiring: installForm.wiring,
          foundationPhoto: foundationPhotoUrl,
          afterInstallationPhoto: afterInstallationPhotoUrl,
          photoWithCustomer: photoWithCustomerUrl,
          completeInstallationPhoto: completeInstallationPhotoUrl,
          repeatedCertificate: repeatedCertificateUrl,
          projectCommissioningCertificate: projectCommissioningCertificateUrl,
          inverterMake: installForm.inverterMake,
          inverterCapacity: installForm.inverterCapacity,
          moduleMake: installForm.moduleMake,
          moduleCapacity: installForm.moduleCapacity,
          moduleType: installForm.moduleType,
          structureMake: installForm.structureMake,
          investorId: installForm.inverterId,
        }

        if (isEdit) {
          setHistoryData((prev) => prev.map((rec) => (rec._id === selectedRecord._id ? updatedRecord : rec)))
        } else {
          setPendingData((prev) => prev.filter((record) => record._id !== selectedRecord._id))
          setHistoryData((prev) => [updatedRecord, ...prev])
        }

        setTimeout(() => {
          setSuccessMessage("")
        }, 3000)
      } else {
        throw new Error(result.error || "Failed to submit installation")
      }
    } catch (error) {
      console.error("Error submitting installation:", error)
      alert("Failed to submit installation: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history")
    setSearchTerm("")
  }, [])

  const closeInstallModal = useCallback(() => {
    setShowInstallModal(false)
    setSelectedRecord(null)
    setInstallForm({
      inverterMake: "",
      inverterCapacity: "",
      moduleMake: "",
      moduleCapacity: "",
      moduleType: "",
      structureMake: "",
      dateOfInstallation: "",
      routing: "",
      earthing: "",
      baseFoundation: "",
      wiring: "",
      foundationPhoto: null,
      afterInstallationPhoto: null,
      photoWithCustomer: null,
      completeInstallationPhoto: null,
      investorId: "",
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
                placeholder={showHistory ? "Search history..." : "Search pending installations..."}
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
              <Wrench className="h-4 w-4 mr-2" />
              Pending Installations ({filteredPendingData.length})
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
              Installation History ({filteredHistoryData.length})
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
                  Completed Installations
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Pending Installations
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
              <p className="text-blue-600 text-sm">Loading Installation data...</p>
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
                      Contact Number
                    </th>
                    {!showHistory && (
                      <>
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
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Copy Of Receipt
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Of Receipt
                        </th>
                      </>
                    )}
                    {showHistory && (
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
                          Plant Photo
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DCR Certificate
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Module Warranty certificate
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Complete Installation Photo
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Repeated Certificate
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project Commissioning Certificate
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Inverter Make
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Inverter Capacity
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Module Make
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Module Capacity
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Module Type
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Structure Make
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Inverter ID
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
                              onClick={() => handleInstallClick(record)}
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
                            <div className="text-xs text-gray-900">{record.surveyorContact || "—"}</div>
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
                            <div className="text-xs text-gray-900 font-medium text-green-600">
                              {record.dateOfInstallation || "—"}
                            </div>
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
                            {record.repeatedCertificate ? (
                              <a
                                href={record.repeatedCertificate}
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
                            {record.projectCommissioningCertificate ? (
                              <a
                                href={record.projectCommissioningCertificate}
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
                            <div className="text-xs text-gray-900">{record.inverterMake || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.inverterCapacity || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.moduleMake || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.moduleCapacity || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.moduleType || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.structureMake || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.investorId || "—"}</div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={27} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm ? "No history records matching your search" : "No completed installations found"}
                        </td>
                      </tr>
                    )
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleInstallClick(record)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <Wrench className="h-3 w-3 mr-1" />
                            Install
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
                      <td colSpan={20} className="px-4 py-8 text-center text-gray-500 text-sm">
                        {searchTerm
                          ? "No pending installations matching your search"
                          : "No pending installations found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Installation Modal */}
        {showInstallModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white border max-w-4xl w-full shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Installation Form - Enquiry: {selectedRecord.enquiryNumber}
                  </h3>
                  <button onClick={closeInstallModal} className="text-gray-400 hover:text-gray-600">
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

                {/* Installation Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Inverter Make */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Inverter Make</label>
                    <select
                      value={installForm.inverterMake}
                      onChange={(e) => handleInputChange("inverterMake", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={dropdownLoading}
                    >
                      {dropdownLoading ? (
                        <option>Loading options...</option>
                      ) : (
                        <>
                          <option value="">-- Select Inverter Make --</option>
                          {dropdownOptions.inverterMake.map((option, index) => (
                            <option key={`inverter-make-${index}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Inverter Capacity */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Inverter Capacity</label>
                    {dropdownLoading ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm">
                        Loading options...
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={installForm.inverterCapacity}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*\.?\d*$/.test(value)) {
                            handleInputChange("inverterCapacity", value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="-- Enter Inverter Capacity --"
                      />
                    )}
                  </div>

                  {/* Module Make */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Module Make</label>
                    <select
                      value={installForm.moduleMake}
                      onChange={(e) => handleInputChange("moduleMake", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={dropdownLoading}
                    >
                      {dropdownLoading ? (
                        <option>Loading options...</option>
                      ) : (
                        <>
                          <option value="">-- Select Module Make --</option>
                          {dropdownOptions.moduleMake.map((option, index) => (
                            <option key={`module-make-${index}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Module Capacity */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Module Capacity</label>
                    {dropdownLoading ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm">
                        Loading options...
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={installForm.moduleCapacity}
                        onChange={(e) => handleInputChange("moduleCapacity", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="-- Enter Module Capacity --"
                        disabled={dropdownLoading}
                      />
                    )}
                  </div>

                  {/* Module Type */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Module Type (DCR/N-DCR)</label>
                    <select
                      value={installForm.moduleType}
                      onChange={(e) => handleInputChange("moduleType", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={dropdownLoading}
                    >
                      {dropdownLoading ? (
                        <option>Loading options...</option>
                      ) : (
                        <>
                          <option value="">-- Select Module Type --</option>
                          {dropdownOptions.moduleType.map((option, index) => (
                            <option key={`module-type-${index}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Structure Make */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Structure Make</label>
                    <select
                      value={installForm.structureMake}
                      onChange={(e) => handleInputChange("structureMake", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={dropdownLoading}
                    >
                      {dropdownLoading ? (
                        <option>Loading options...</option>
                      ) : (
                        <>
                          <option value="">-- Select Structure Make --</option>
                          {dropdownOptions.structureMake.map((option, index) => (
                            <option key={`structure-make-${index}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Investor ID */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Inverter ID</label>
                    <input
                      type="text"
                      value={installForm.inverterId}
                      onChange={(e) => handleInputChange("inverterId", e.target.value)}
                      placeholder="Enter Inverter ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Date Of Installation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Of Installation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={installForm.dateOfInstallation}
                      onChange={(e) => handleInputChange("dateOfInstallation", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Phase */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phase</label>
                    <select
                      value={installForm.routing}
                      onChange={(e) => handleInputChange("routing", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={dropdownLoading}
                    >
                      {dropdownLoading ? (
                        <option>Loading options...</option>
                      ) : (
                        <>
                          <option value="">-- Select Phase --</option>
                          {dropdownOptions.phase.map((option, index) => (
                            <option key={`phase-${index}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Earthing */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Earthing</label>
                    <input
                      type="text"
                      value={installForm.earthing}
                      onChange={(e) => handleInputChange("earthing", e.target.value)}
                      placeholder="Enter earthing details"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Base Foundation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Base Foundation</label>
                    <input
                      type="text"
                      value={installForm.baseFoundation}
                      onChange={(e) => handleInputChange("baseFoundation", e.target.value)}
                      placeholder="Enter base foundation details"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Wiring */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wiring</label>
                    <input
                      type="text"
                      value={installForm.wiring}
                      onChange={(e) => handleInputChange("wiring", e.target.value)}
                      placeholder="Enter wiring details"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Plant Photo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plant Photo
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("foundationPhoto", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {installForm.foundationPhoto && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {installForm.foundationPhoto.name}
                      </p>
                    )}
                    {selectedRecord?.foundationPhoto && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Existing:</span>
                        <button
                          type="button"
                          onClick={() => window.open(selectedRecord.foundationPhoto, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview Image
                        </button>
                      </div>
                    )}
                  </div>

                  {/* DCR Certificate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      DCR Certificate
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("afterInstallationPhoto", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {installForm.afterInstallationPhoto && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {installForm.afterInstallationPhoto.name}
                      </p>
                    )}
                    {selectedRecord?.afterInstallationPhoto && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Existing:</span>
                        <button
                          type="button"
                          onClick={() => window.open(selectedRecord.afterInstallationPhoto, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview Image
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Module Warranty certificate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Module Warranty certificate
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("photoWithCustomer", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {installForm.photoWithCustomer && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {installForm.photoWithCustomer.name}
                      </p>
                    )}
                    {selectedRecord?.photoWithCustomer && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Existing:</span>
                        <button
                          type="button"
                          onClick={() => window.open(selectedRecord.photoWithCustomer, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview Image
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Complete Installation Photo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Complete Installation Photo
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("completeInstallationPhoto", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {installForm.completeInstallationPhoto && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {installForm.completeInstallationPhoto.name}
                      </p>
                    )}
                    {selectedRecord?.completeInstallationPhoto && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Existing:</span>
                        <button
                          type="button"
                          onClick={() => window.open(selectedRecord.completeInstallationPhoto, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview Image
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Repeated Certificate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Repeated Certificate
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("repeatedCertificate", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {installForm.repeatedCertificate && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {installForm.repeatedCertificate.name}
                      </p>
                    )}
                    {selectedRecord?.repeatedCertificate && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Existing:</span>
                        <button
                          type="button"
                          onClick={() => window.open(selectedRecord.repeatedCertificate, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview Image
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Project Commissioning Certificate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Commissioning Certificate
                      <span className="text-gray-500 text-xs ml-1">(Image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("projectCommissioningCertificate", e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {installForm.projectCommissioningCertificate && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {installForm.projectCommissioningCertificate.name}
                      </p>
                    )}
                    {selectedRecord?.projectCommissioningCertificate && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Existing:</span>
                        <button
                          type="button"
                          onClick={() => window.open(selectedRecord.projectCommissioningCertificate, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview Image
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
                  <button
                    onClick={closeInstallModal}
                    disabled={isSubmitting}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInstallSubmit}
                    disabled={isSubmitting || !installForm.dateOfInstallation}
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

export default InstallationPage