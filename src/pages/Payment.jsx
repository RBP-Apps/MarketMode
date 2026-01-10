"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, CreditCard, Wrench } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
  // Updated Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
  // Updated Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4",
  // Sheet names
  SOURCE_SHEET_NAME: "FMS",
  DROPDOWN_SHEET_NAME: "Drop-Down Value",
  // Updated page configuration
  PAGE_CONFIG: {
    title: "Payment",
    historyTitle: "Payment History",
    description: "Manage pending payment records",
    historyDescription: "View completed payment records",
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

function PaymentPage() {
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
  const [paymentDetails, setPaymentDetails] = useState({})
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    payment: "",
    checkNo: "",
    date: "",
    amount: "",
    deduction: "",
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

  const formatDateForInput = useCallback((dateString) => {
    if (!dateString) return ""
    // extended logic to handle DD/MM/YYYY
    if (dateString.includes("/")) {
      const [day, month, year] = dateString.split("/")
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
    return dateString
  }, [])

  const isEmpty = useCallback((value) => {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
  }, [])

  const formatDisplayDate = useCallback((dateString) => {
    if (!dateString) return "—"
    try {
      const date = new Date(dateString)
      // Check if valid date
      if (isNaN(date.getTime())) return dateString

      const day = date.getDate().toString().padStart(2, "0")
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const year = date.getFullYear()
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")
      const seconds = date.getSeconds().toString().padStart(2, "0")

      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
    } catch (e) {
      return dateString
    }
  }, [])

  useEffect(() => {
    const role = sessionStorage.getItem("role")
    const user = sessionStorage.getItem("username")
    setUserRole(role || "")
    setUsername(user || "")
  }, [])

  // Fetch dropdown options
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

  // Optimized data fetching
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

        // Check conditions: Column DZ (index 129) not null and Column EA (index 130)
        const columnDZ = rowValues[129] // Column DZ
        const columnEA = rowValues[130] // Column EA

        const hasColumnDZ = !isEmpty(columnDZ)
        if (!hasColumnDZ) return // Skip if column DZ is empty

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
          // Payment specific columns
          powerPurchaseAgreement: rowValues[100] || "", // CW (IMAGE)
          vendorConsumerAgreement: rowValues[101] || "", // CX (IMAGE)
          quotationCopy: rowValues[102] || "", // CY
          applicationCopy: rowValues[103] || "", // CZ
          cancellationCheque: rowValues[107] || "", // DD
          electricityBill: rowValues[109] || "", // DF
          witnessIdProof: rowValues[110] || "", // DG
          inspection: rowValues[114] || "", // DK
          projectCommission: rowValues[118] || "", // DP
          subsidyToken: rowValues[121] || "", // DR
          subsidyDisbursal: rowValues[128] || "", // DY
          // History specific columns
          payment: rowValues[129] || "", // DZ
          checkNo: rowValues[133] || "", // ED
          date: rowValues[134] || "", // EE
          amount: rowValues[135] || "", // EF
          deduction: rowValues[136] || "", // EG
          actual: rowValues[130] || "", // EA
        }

        // Check if Column EA is null for pending, not null for history
        const isColumnEAEmpty = isEmpty(columnEA)

        if (isColumnEAEmpty) {
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
      setError("Failed to load Payment data: " + error.message)
      setLoading(false)
    }
  }, [isEmpty, fetchDropdownOptions])

  useEffect(() => {
    fetchSheetData()
  }, [fetchSheetData])

  // Initialize status values with existing payment values
  useEffect(() => {
    const initialStatusValues = {}
    const initialPaymentDetails = {}
    const allRecords = [...pendingData, ...historyData]
    allRecords.forEach((record) => {
      if (record.payment && record.payment !== "") {
        initialStatusValues[record._id] = record.payment
      }
      initialPaymentDetails[record._id] = {
        checkNo: record.checkNo || "",
        date: record.date ? formatDateForInput(record.date) : "",
        amount: record.amount || "",
        deduction: record.deduction || "",
      }
    })
    setStatusValues(initialStatusValues)
    setPaymentDetails(initialPaymentDetails)
  }, [pendingData, historyData, formatDateForInput])

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

  const handlePaymentDetailChange = useCallback((recordId, field, value) => {
    setPaymentDetails((prev) => ({
      ...prev,
      [recordId]: {
        ...prev[recordId],
        [field]: value,
      },
    }))
  }, [])

  const handlePaymentClick = useCallback(
    (record) => {
      setSelectedRecord(record)
      setPaymentForm({
        payment: record.payment || "",
        checkNo: record.checkNo || "",
        date: formatDateForInput(record.date || ""),
        amount: record.amount || "",
        deduction: record.deduction || "",
      })
      setShowPaymentModal(true)
    },
    [formatDateForInput],
  )

  const handlePaymentSubmit = async () => {
    if (!paymentForm.payment) {
      alert("Please select Payment Status")
      return
    }

    if (paymentForm.payment === "Done") {
      if (!paymentForm.checkNo || !paymentForm.date || !paymentForm.amount) {
        alert("Please fill in Check No, Date, and Amount")
        return
      }
    }

    setIsSubmitting(true)
    try {
      // Determine if it's an edit or new submission based on existing 'actual' date
      const isEdit = selectedRecord.actual && selectedRecord.actual !== ""
      const actualDate = isEdit && selectedRecord.actual ? selectedRecord.actual : formatTimestamp()

      const rowData = Array(140).fill("")

      // Update logic:
      // Column EC (index 132) - Status (Payment)
      rowData[132] = paymentForm.payment

      // If Done, update details and Actual timestamp
      // Even if editing, we update the details
      if (paymentForm.payment === "Done") {
        rowData[130] = actualDate // EA
        rowData[133] = paymentForm.checkNo // ED
        rowData[134] = paymentForm.date ? useCallback((dateString) => {
          if (!dateString) return ""
          const date = new Date(dateString)
          const day = date.getDate().toString().padStart(2, "0")
          const month = (date.getMonth() + 1).toString().padStart(2, "0")
          const year = date.getFullYear()
          return `${day}/${month}/${year}`
        }, [])(paymentForm.date) : "" // EE - Using inline format date logic or reuse existing one logic if I had access, but I will assume formatDate is available in scope or duplicate it.
        // Wait, formatDate is defined in component scope. I can use it.
        // rowData[134] = paymentForm.date ? formatDate(paymentForm.date) : ""
        rowData[135] = paymentForm.amount // EF
        rowData[136] = paymentForm.deduction // EG
      } else {
        // If status changed to something else, clear details? 
        // Current logic in bulk update only updates if status is Done. 
        // If status is not done, we just update status.
        // But if we are editing a history record (Done) to (Pending usually not possible via UI flow easily here unless status change supported), 
        // For now let's assume valid state transition.
      }

      // I need to use `formatDate` but it is inside the component. 
      // I can't easily access it here if I am pasting this code block unless I use it.
      // Yes `formatDate` is defined above line 331 (scope-wise).

      if (paymentForm.payment === "Done") {
        // Re-implement format date simple logic just in case or use existing
        const d = new Date(paymentForm.date)
        const day = d.getDate().toString().padStart(2, '0')
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        const year = d.getFullYear()
        rowData[134] = `${day}/${month}/${year}`
      }


      const updateData = {
        action: "update",
        sheetName: CONFIG.SOURCE_SHEET_NAME,
        rowIndex: selectedRecord._rowIndex,
        rowData: JSON.stringify(rowData),
      }

      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(updateData).toString(),
      })

      // Update local state
      const updatedRecord = {
        ...selectedRecord,
        payment: paymentForm.payment,
        actual: paymentForm.payment === "Done" ? actualDate : selectedRecord.actual,
        checkNo: paymentForm.payment === "Done" ? paymentForm.checkNo : selectedRecord.checkNo,
        date: paymentForm.payment === "Done" ? `${new Date(paymentForm.date).getDate().toString().padStart(2, '0')}/${(new Date(paymentForm.date).getMonth() + 1).toString().padStart(2, '0')}/${new Date(paymentForm.date).getFullYear()}` : selectedRecord.date,
        amount: paymentForm.payment === "Done" ? paymentForm.amount : selectedRecord.amount,
        deduction: paymentForm.payment === "Done" ? paymentForm.deduction : selectedRecord.deduction,
      }

      if (isEdit) {
        setHistoryData((prev) => prev.map((r) => (r._id === selectedRecord._id ? updatedRecord : r)))
      } else {
        // If it was pending, move to history
        setPendingData((prev) => prev.filter((r) => r._id !== selectedRecord._id))
        setHistoryData((prev) => [updatedRecord, ...prev])
      }

      setShowPaymentModal(false)
      setSuccessMessage("Payment updated successfully")

      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)

    } catch (error) {
      console.error("Error updating payment:", error)
      alert("Failed to update payment: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

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

    // Check if records with "Done" status have required payment details
    const doneRecords = selectedRecordIds.filter((id) => statusValues[id] === "Done")
    const missingPaymentDetails = doneRecords.filter((id) => {
      const details = paymentDetails[id] || {}
      return !details.checkNo || !details.date || !details.amount
    })

    if (missingPaymentDetails.length > 0) {
      alert("Please fill in Check No, Date, and Amount for all records with 'Done' status")
      return
    }

    setIsSubmitting(true)
    try {
      const updatePromises = selectedRecordIds.map(async (recordId) => {
        const record = pendingData.find((r) => r._id === recordId)
        const status = statusValues[recordId]
        const details = paymentDetails[recordId] || {}

        if (!record) return

        // Create array with enough empty strings to ensure we have enough columns
        const rowData = Array(140).fill("")

        // Set specific columns:
        // Column EC (index 132) - Status (Payment)
        rowData[132] = status

        // Column EA (index 130) - Actual timestamp
        // Logic: if Done and NO existing actual date, write new timestamp.
        // User request: "do not change the time logic it must as to be same"
        if (record.actual) {
          rowData[130] = record.actual
        } else if (status === "Done") {
          rowData[130] = formatTimestamp()
        }

        if (status === "Done") {
          // Store payment details
          rowData[133] = details.checkNo || "" // ED - Check No

          // Format date for sheet (DD/MM/YYYY)
          let formattedDate = ""
          if (details.date) {
            const dateObj = new Date(details.date)
            const day = dateObj.getDate().toString().padStart(2, "0")
            const month = (dateObj.getMonth() + 1).toString().padStart(2, "0")
            const year = dateObj.getFullYear()
            formattedDate = `${day}/${month}/${year}`
          }
          rowData[134] = formattedDate // EE - Date

          rowData[135] = details.amount || "" // EF - Amount
          rowData[136] = details.deduction || "" // EG - Deduction
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

      setSuccessMessage(`Successfully updated ${selectedRecordIds.length} payment record(s)`)

      // Update local state
      const updatedRecords = selectedRecordIds.map((recordId) => {
        const record = pendingData.find((r) => r._id === recordId)
        const status = statusValues[recordId]
        const details = paymentDetails[recordId] || {}

        let formattedDate = record.date
        if (status === "Done" && details.date) {
          const dateObj = new Date(details.date)
          const day = dateObj.getDate().toString().padStart(2, "0")
          const month = (dateObj.getMonth() + 1).toString().padStart(2, "0")
          const year = dateObj.getFullYear()
          formattedDate = `${day}/${month}/${year}`
        }

        return {
          ...record,
          payment: status,
          actual: record.actual ? record.actual : (status === "Done" ? formatTimestamp() : ""),
          checkNo: status === "Done" ? details.checkNo : record.checkNo,
          date: formattedDate,
          amount: status === "Done" ? details.amount : record.amount,
          deduction: status === "Done" ? details.deduction : record.deduction,
        }
      })

      const movedToHistory = updatedRecords.filter((r) => r.payment === "Done")
      const movedToPending = updatedRecords.filter((r) => r.payment !== "Done")

      setPendingData((prev) => {
        const remaining = prev.filter((r) => !selectedRecordIds.includes(r._id))
        return [...remaining, ...movedToPending]
      })

      setHistoryData((prev) => {
        const remaining = prev.filter((r) => !selectedRecordIds.includes(r._id))
        return [...remaining, ...movedToHistory]
      })

      // Clear selections and status values
      setSelectedRows({})
      setStatusValues({})
      setPaymentDetails({})

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error updating payment:", error)
      alert("Failed to update payment: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history")
    setSearchTerm("")
    setSelectedRows({})
    setStatusValues({})
    setPaymentDetails({})
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
              <CreditCard className="h-4 w-4 mr-2" />
              Pending Payment ({filteredPendingData.length})
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
              Payment History ({filteredHistoryData.length})
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
        {Object.values(selectedRows).some(Boolean) && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 text-sm">
                {Object.values(selectedRows).filter(Boolean).length} record(s) selected
              </span>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-linear-to-r from-green-500 to-blue-600 text-white rounded-md hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Submit Payment
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Table Container with Fixed Height */}
        <div className="rounded-lg border border-blue-200 shadow-md bg-white overflow-hidden">
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-3">
            <h2 className="text-blue-700 font-medium flex items-center text-sm">
              {showHistory ? (
                <>
                  <History className="h-4 w-4 mr-2" />
                  Completed Payments
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pending Payments
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
              <p className="text-blue-600 text-sm">Loading payment data...</p>
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
                      Status
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check No
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deduction
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
                    {showHistory && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cancellation Cheque
                      </th>
                    )}
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Electricity Bill
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Witness Id Proof
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inspection
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Commission
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subsidy Token
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subsidy Disbursal
                    </th>

                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {showHistory ? (
                    filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((record) => (
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
                              value={statusValues[record._id] || record.payment || "Select"}
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
                              type="text"
                              value={paymentDetails[record._id]?.checkNo || ""}
                              onChange={(e) => handlePaymentDetailChange(record._id, "checkNo", e.target.value)}
                              disabled={!selectedRows[record._id] || statusValues[record._id] !== "Done"}
                              placeholder="Check No"
                              className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed w-20"
                            />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <input
                              type="date"
                              value={paymentDetails[record._id]?.date || ""}
                              onChange={(e) => handlePaymentDetailChange(record._id, "date", e.target.value)}
                              disabled={!selectedRows[record._id] || statusValues[record._id] !== "Done"}
                              className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed w-28"
                            />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              value={paymentDetails[record._id]?.amount || ""}
                              onChange={(e) => handlePaymentDetailChange(record._id, "amount", e.target.value)}
                              disabled={!selectedRows[record._id] || statusValues[record._id] !== "Done"}
                              placeholder="Amount"
                              className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed w-20"
                            />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              value={paymentDetails[record._id]?.deduction || ""}
                              onChange={(e) => handlePaymentDetailChange(record._id, "deduction", e.target.value)}
                              disabled={!selectedRows[record._id] || statusValues[record._id] !== "Done"}
                              placeholder="Deduction"
                              className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed w-20"
                            />
                          </td>
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
                            <div className="text-xs text-gray-900">{record.cancellationCheque || "—"}</div>
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
                            <div className="text-xs text-gray-900">{record.projectCommission || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{formatDisplayDate(record.subsidyToken)}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{formatDisplayDate(record.subsidyDisbursal)}</div>
                          </td>

                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={22} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {searchTerm
                            ? "No payment history records matching your search"
                            : "No completed payments found"}
                        </td>
                      </tr>
                    )
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((record) => {
                      const isSelected = selectedRows[record._id] || false
                      const currentStatus = statusValues[record._id] || record.payment || "Select"
                      const isDoneStatus = currentStatus === "Done"
                      const currentDetails = paymentDetails[record._id] || {}

                      return (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-2 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleRowSelection(record._id, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <select
                              value={currentStatus}
                              onChange={(e) => handleStatusChange(record._id, e.target.value)}
                              disabled={!isSelected}
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
                              type="text"
                              value={currentDetails.checkNo || ""}
                              onChange={(e) => handlePaymentDetailChange(record._id, "checkNo", e.target.value)}
                              disabled={!isSelected || !isDoneStatus}
                              placeholder="Check No"
                              className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed w-20"
                            />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <input
                              type="date"
                              value={currentDetails.date || ""}
                              onChange={(e) => handlePaymentDetailChange(record._id, "date", e.target.value)}
                              disabled={!isSelected || !isDoneStatus}
                              className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed w-28"
                            />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              value={currentDetails.amount || ""}
                              onChange={(e) => handlePaymentDetailChange(record._id, "amount", e.target.value)}
                              disabled={!isSelected || !isDoneStatus}
                              placeholder="Amount"
                              className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed w-20"
                            />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              value={currentDetails.deduction || ""}
                              onChange={(e) => handlePaymentDetailChange(record._id, "deduction", e.target.value)}
                              disabled={!isSelected || !isDoneStatus}
                              placeholder="Deduction"
                              className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed w-20"
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
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{record.projectCommission || "—"}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{formatDisplayDate(record.subsidyToken)}</div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{formatDisplayDate(record.subsidyDisbursal)}</div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={21} className="px-4 py-8 text-center text-gray-500 text-sm">
                        {searchTerm ? "No pending payments matching your search" : "No pending payments found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Edit Payment
                    </h3>
                    <div className="mt-4 space-y-4">
                      {/* Status Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                        <select
                          value={paymentForm.payment}
                          onChange={(e) => setPaymentForm({ ...paymentForm, payment: e.target.value })}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="">Select Status</option>
                          {dropdownOptions.map((option, index) => (
                            <option key={index} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Details */}
                      {paymentForm.payment === "Done" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Check No</label>
                            <input
                              type="text"
                              value={paymentForm.checkNo}
                              onChange={(e) => setPaymentForm({ ...paymentForm, checkNo: e.target.value })}
                              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Date</label>
                            <input
                              type="date"
                              value={paymentForm.date}
                              onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Amount</label>
                            <input
                              type="text"
                              value={paymentForm.amount}
                              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Deduction</label>
                            <input
                              type="text"
                              value={paymentForm.deduction}
                              onChange={(e) => setPaymentForm({ ...paymentForm, deduction: e.target.value })}
                              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handlePaymentSubmit}
                  disabled={isSubmitting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default PaymentPage
