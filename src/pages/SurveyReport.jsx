"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, Upload, X, Search, History, ArrowLeft, FileText, MapPin, Users, Phone, Zap, Building, Eye, DollarSign, Clock, Home, Wrench, Trash2 } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
  // Updated Google Apps Script URL
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",

  // Updated Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1KjZwLhFFEGvrUPtnbPV-S_QFJfSPjPDR",

  // Sheet names
  SOURCE_SHEET_NAME: "FMS",
  DROPDOWN_SHEET_NAME: "Drop-Down Value",

  // Updated page configuration
  PAGE_CONFIG: {
    title: "Site Survey",
    historyTitle: "FMS Survey History",
    description: "Manage pending survey tasks",
    historyDescription: "View completed survey records",
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
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Survey form state
  const [surveyForm, setSurveyForm] = useState({
    status: "",
    copySurveyReport: null,
    geotagPhoto: null,
    electricityBill: null,
    aadharNumber: "",
    panNumber: "",
    addressProof: null,
    surveyorName: "",
    contactNumber: ""
  })

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const formatDateTime = useCallback((dateString) => {
    if (!dateString) return ""
    // If it's already in DD/MM/YYYY HH:mm:ss format, return it
    if (typeof dateString === "string" && dateString.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) return dateString

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString

    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const seconds = date.getSeconds().toString().padStart(2, "0")
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
  }, [])

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

          console.log('🔍 Total rows received:', rows.length)

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

            const enquiryNumber = rowValues[1] || ""

            console.log(`\n📋 Processing Row ${rowIndex + 1} (Sheet Row ${rowIndex + 1}):`, {
              enquiryNumber,
              beneficiaryName: rowValues[2],
              totalColumns: rowValues.length,
              columnT_index19: rowValues[19],
              columnU_index20: rowValues[20],
              columnW_index22_Status: rowValues[22],
            })

            // Check both Column T (index 19) and Column U (index 20)
            const columnT = rowValues[19] // Column T  
            const columnU = rowValues[20] // Column U

            const hasColumnT = !isEmpty(columnT)
            const hasColumnU = !isEmpty(columnU)

            console.log(`   ➡️ Column checks:`, {
              columnT: columnT,
              columnU: columnU,
              hasColumnT: hasColumnT,
              hasColumnU: hasColumnU,
              decision: !hasColumnT ? 'SKIP' : (!hasColumnU ? 'PENDING' : 'HISTORY')
            })

            // Skip if Column T is empty
            if (!hasColumnT) {
              console.log(`   ❌ SKIPPED: Column T is empty`)
              return
            }


            const googleSheetsRowIndex = rowIndex + 1
            const stableId = enquiryNumber
              ? `enquiry_${enquiryNumber}_${googleSheetsRowIndex}`
              : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

            const rowData = {
              _id: stableId,
              _rowIndex: googleSheetsRowIndex,
              _enquiryNumber: enquiryNumber,
              // Map all columns (A to AE = 0 to 30)
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
              col20: formatDateTime(rowValues[20] || ""), // U - Actual
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
            }

            // Check if Column U is null for pending, not null for history
            const isColumnUEmpty = isEmpty(columnU)


            if (isColumnUEmpty) {
              console.log(`   ✅ Added to PENDING`)
              pending.push(rowData)
            } else {
              console.log(`   ✅ Added to HISTORY`)
              history.push(rowData)
            }
          })

          console.log('\n📊 FINAL SUMMARY:', {
            totalPending: pending.length,
            totalHistory: history.length,
            pendingEnquiries: pending.map(p => p.col1),
            historyEnquiries: history.map(h => h.col1),
          })

          setPendingData(pending)
          setHistoryData(history)
          setLoading(false)
        })()
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

  const handleSurveyClick = useCallback((record) => {
    setSelectedRecord(record)
    setSurveyForm({
      status: record.col22 || "",
      copySurveyReport: null,
      geotagPhoto: null,
      electricityBill: null,
      aadharNumber: record.col26 || "",
      panNumber: record.col27 || "",
      addressProof: null,
      surveyorName: record.col29 || "",
      contactNumber: record.col30 || ""
    })
    setShowSurveyModal(true)
  }, [])

  const handleFileUpload = useCallback((field, file) => {
    setSurveyForm(prev => ({ ...prev, [field]: file }))
  }, [])

  const handleInputChange = useCallback((field, value) => {
    setSurveyForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }, [])

  const uploadImageToDrive = useCallback(async (file) => {
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
  }, [selectedRecord, fileToBase64])

  const handleSurveySubmit = async () => {
    if (!surveyForm.status) {
      alert("Please select a status")
      return
    }

    setIsSubmitting(true)

    try {
      // Upload images and get URLs
      // Default to existing URLs if no new files are selected
      let copySurveyReportUrl = selectedRecord.col23 || ""
      let geotagPhotoUrl = selectedRecord.col24 || ""
      let electricityBillUrl = selectedRecord.col25 || ""
      let addressProofUrl = selectedRecord.col28 || ""

      if (surveyForm.copySurveyReport) {
        copySurveyReportUrl = await uploadImageToDrive(surveyForm.copySurveyReport)
      }
      if (surveyForm.geotagPhoto) {
        geotagPhotoUrl = await uploadImageToDrive(surveyForm.geotagPhoto)
      }
      if (surveyForm.electricityBill) {
        electricityBillUrl = await uploadImageToDrive(surveyForm.electricityBill)
      }
      if (surveyForm.addressProof) {
        addressProofUrl = await uploadImageToDrive(surveyForm.addressProof)
      }

      // Prepare update data
      const isEdit = !isEmpty(selectedRecord.col20)
      const rowData = Array(31).fill(null)

      // Use the exact timestamp format from TaskAssign page
      const now = new Date();
      const currentTimestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      // Update Column U (Actual timestamp) only on new completions, skip on edits
      rowData[20] = isEdit ? null : currentTimestamp;

      rowData[22] = surveyForm.status // W - Status
      rowData[23] = copySurveyReportUrl // X
      rowData[24] = geotagPhotoUrl // Y
      rowData[25] = electricityBillUrl // Z
      rowData[26] = surveyForm.aadharNumber // AA
      rowData[27] = surveyForm.panNumber // AB
      rowData[28] = addressProofUrl // AC
      rowData[29] = surveyForm.surveyorName // AD
      rowData[30] = surveyForm.contactNumber // AE

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
        setSuccessMessage(`Survey completed successfully for Enquiry Number: ${selectedRecord._enquiryNumber}`)
        setShowSurveyModal(false)

        const updatedRecord = {
          ...selectedRecord,
          col20: isEdit ? selectedRecord.col20 : `${new Date().getDate().toString().padStart(2, '0')}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()} ${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}:${new Date().getSeconds().toString().padStart(2, '0')}`,
          col22: surveyForm.status, // W - Status
          col23: copySurveyReportUrl, // X - Copy Survey Report
          col24: geotagPhotoUrl, // Y - Geotag Photo Site
          col25: electricityBillUrl, // Z - Three Months Electricity Bill Copy
          col26: surveyForm.aadharNumber, // AA - Aadhar Card
          col27: surveyForm.panNumber, // AB - Pan Card
          col28: addressProofUrl, // AC - Address Proof
          col29: surveyForm.surveyorName, // AD - Surveyor Name
          col30: surveyForm.contactNumber, // AE - Contact Number
        }

        if (isEdit) {
          // Update in history
          setHistoryData(prev => prev.map(rec => rec._id === selectedRecord._id ? updatedRecord : rec))
        } else {
          // Move from pending to history
          setPendingData(prev => prev.filter(record => record._id !== selectedRecord._id))
          setHistoryData(prev => [updatedRecord, ...prev])
        }

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("")
        }, 3000)
      } else {
        throw new Error(result.error || "Failed to submit survey")
      }
    } catch (error) {
      console.error("Error submitting survey:", error)
      alert("Failed to submit survey: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = useCallback((section) => {
    setShowHistory(section === 'history')
    setSearchTerm("")
  }, [])

  // Delete functionality
  const handleDeleteClick = useCallback((record) => {
    setRecordToDelete(record)
    setShowDeleteModal(true)
  }, [])

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false)
    setRecordToDelete(null)
  }, [])

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return

    setIsDeleting(true)

    try {
      // Prepare delete data - clear the row
      const deleteData = {
        action: "deleteRow",
        sheetName: CONFIG.SOURCE_SHEET_NAME,
        rowIndex: recordToDelete._rowIndex,
      }

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(deleteData).toString(),
      })

      const result = await response.json()
      if (result.success) {
        setSuccessMessage(`Record deleted successfully for Enquiry Number: ${recordToDelete._enquiryNumber}`)
        setShowDeleteModal(false)
        setRecordToDelete(null)

        // Remove from history data
        setHistoryData(prev => prev.filter(record => record._id !== recordToDelete._id))

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("")
        }, 3000)
      } else {
        throw new Error(result.error || "Failed to delete record")
      }
    } catch (error) {
      console.error("Error deleting record:", error)
      alert("Failed to delete record: " + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const closeSurveyModal = useCallback(() => {
    setShowSurveyModal(false)
    setSelectedRecord(null)
    setSurveyForm({
      status: "",
      copySurveyReport: null,
      geotagPhoto: null,
      electricityBill: null,
      aadharNumber: "",
      panNumber: "",
      addressProof: null,
      surveyorName: "",
      contactNumber: ""
    })
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-xl font-bold tracking-tight text-blue-700">
            {CONFIG.PAGE_CONFIG.title}
          </h1>

          <div className="flex space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder={showHistory ? "Search history..." : "Search pending surveys..."}
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
            onClick={() => toggleSection('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${!showHistory
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Pending Surveys ({filteredPendingData.length})
            </div>
          </button>
          <button
            onClick={() => toggleSection('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${showHistory
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center">
              <History className="h-4 w-4 mr-2" />
              Survey History ({filteredHistoryData.length})
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
                  Completed FMS Surveys
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Pending FMS Surveys
                </>
              )}
            </h2>
            <p className="text-blue-600 text-xs">
              {showHistory
                ? CONFIG.PAGE_CONFIG.historyDescription
                : CONFIG.PAGE_CONFIG.description}
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
            <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {showHistory && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                      </th>
                    )}
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
                      Contact Number
                    </th>
                    {showHistory ? (
                      <>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Survey Report
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Geotag Photo
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Electricity Bill
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aadhar
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PAN
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Address Proof
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Surveyor
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Present Load
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          BP Number
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CSPDCL Contract Demand
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last 6 Months Avg Bill
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Future Load Requirement
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Load Details/Application
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          No Of Hours Of Failure
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Structure Type
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roof Type
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          System Type
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Need Type
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project Mode
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
                              onClick={() => handleDeleteClick(record)}
                              className="inline-flex items-center justify-center p-1.5 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleSurveyClick(record)}
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
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {record.col22 || "—"}
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
                        <td colSpan={17} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm
                            ? "No history records matching your search"
                            : "No completed surveys found"}
                        </td>
                      </tr>
                    )
                  ) : (
                    filteredPendingData.length > 0 ? (
                      filteredPendingData.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-2 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleSurveyClick(record)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Survey
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
                            <div className="text-xs text-gray-900 flex items-center">
                              <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                              {record.col7 || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.col8 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900 flex items-center">
                              <Building className="h-3 w-3 mr-1 text-gray-400" />
                              {record.col9 || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {record.col10 ? (
                              <a
                                href={record.col10}
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
                            <div className="text-xs text-gray-900 flex items-center">
                              <Zap className="h-3 w-3 mr-1 text-blue-500" />
                              {record.col11 || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 max-w-xs">
                            <div className="text-xs text-gray-900 truncate" title={record.col12}>
                              {record.col12 || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900 flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-red-500" />
                              {record.col13 || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900 flex items-center">
                              <Building className="h-3 w-3 mr-1 text-gray-400" />
                              {record.col14 || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900 flex items-center">
                              <Home className="h-3 w-3 mr-1 text-brown-500" />
                              {record.col15 || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900 flex items-center">
                              <Wrench className="h-3 w-3 mr-1 text-purple-500" />
                              {record.col16 || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.col17 || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.col18 || "—"}</div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={19} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm
                            ? "No pending surveys matching your search"
                            : "No pending surveys found"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Survey Modal with Transparent Background */}
        {showSurveyModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white border max-w-2xl w-full shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Survey Form - Enquiry: {selectedRecord.col1}
                  </h3>
                  <button
                    onClick={closeSurveyModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 text-sm">Beneficiary Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-medium">Name:</span> {selectedRecord.col2}
                    </div>
                    <div>
                      <span className="font-medium">Contact:</span> {selectedRecord.col6}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Address:</span> {selectedRecord.col3}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={surveyForm.status}
                      onChange={(e) => handleInputChange("status", e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    >
                      <option value="">Select</option>
                      {statusOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Copy Survey Report */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Copy Survey Report
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("copySurveyReport", e.target.files[0])}
                      className="mt-1 block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {surveyForm.copySurveyReport && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {surveyForm.copySurveyReport.name}
                      </p>
                    )}
                  </div>

                  {/* Geotag Photo Site */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Geotag Photo Site
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("geotagPhoto", e.target.files[0])}
                      className="mt-1 block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {surveyForm.geotagPhoto && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {surveyForm.geotagPhoto.name}
                      </p>
                    )}
                  </div>

                  {/* Three Months Electricity Bill Copy */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Three Months Electricity Bill Copy
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("electricityBill", e.target.files[0])}
                      className="mt-1 block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {surveyForm.electricityBill && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {surveyForm.electricityBill.name}
                      </p>
                    )}
                  </div>

                  {/* Aadhar Card */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Aadhar Card Number
                    </label>
                    <input
                      type="text"
                      value={surveyForm.aadharNumber}
                      onChange={(e) => handleInputChange("aadharNumber", e.target.value)}
                      placeholder="Enter Aadhar number"
                      maxLength="12"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* Pan Card */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      PAN Card Number
                    </label>
                    <input
                      type="text"
                      value={surveyForm.panNumber}
                      onChange={(e) => handleInputChange("panNumber", e.target.value.toUpperCase())}
                      placeholder="Enter PAN number"
                      maxLength="10"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* Address Proof */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Address Proof
                      <span className="text-gray-500 text-xs ml-1">(Aadhar/PAN image)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("addressProof", e.target.files[0])}
                      className="mt-1 block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {surveyForm.addressProof && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {surveyForm.addressProof.name}
                      </p>
                    )}
                  </div>

                  {/* Surveyor Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Surveyor Name
                    </label>
                    <input
                      type="text"
                      value={surveyForm.surveyorName}
                      onChange={(e) => handleInputChange("surveyorName", e.target.value)}
                      placeholder="Enter surveyor name"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={surveyForm.contactNumber}
                      onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                      placeholder="Enter contact number"
                      maxLength="10"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-3 border-t">
                  <button
                    onClick={closeSurveyModal}
                    disabled={isSubmitting}
                    className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSurveySubmit}
                    disabled={isSubmitting || !surveyForm.status}
                    className="px-3 py-1 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-md hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Survey"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && recordToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white border max-w-md w-full shadow-2xl rounded-lg">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                  Delete Record
                </h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Are you sure you want to delete this record? This action cannot be undone.
                </p>
                <div className="bg-gray-50 rounded-md p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Enquiry Number:</span> {recordToDelete._enquiryNumber || recordToDelete.col1}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Beneficiary:</span> {recordToDelete.col2 || "—"}
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
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