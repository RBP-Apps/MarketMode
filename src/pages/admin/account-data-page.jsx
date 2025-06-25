//RKL Tasks Page
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, Upload, X, Search, History, ArrowLeft } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"

// Configuration object - Move all configurations here
const CONFIG = {
  // Google Apps Script URL
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyRbhgAN0TfMUWOgZ1UPiOAsVyUrj7aDM0hOeybHvB-K7NniRVhwhH3foVs5l4u2N2z/exec",
  
  // Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1BTXTHd-Mi58N0w1YRci-2Ow2V9GqsNww",
  
  // Sheet name to work with
  SHEET_NAME: "RKL",
  
  // Page configuration
  PAGE_CONFIG: {
    title: "RKL Tasks",
    historyTitle: "RKL Task History",
    description: "Showing today, tomorrow's tasks and past due tasks",
    historyDescription: "Read-only view of completed tasks with submission history"
  }
}

function AccountDataPage() {
  const [accountData, setAccountData] = useState([])
  const [selectedItems, setSelectedItems] = useState(new Set()) // Changed to Set for better performance
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [additionalData, setAdditionalData] = useState({})
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [remarksData, setRemarksData] = useState({})
  const [historyData, setHistoryData] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [membersList, setMembersList] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")

  const formatDateToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const isEmpty = (value) => {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
  }

  useEffect(() => {
    const role = sessionStorage.getItem("role")
    const user = sessionStorage.getItem("username")
    setUserRole(role || "")
    setUsername(user || "")
  }, [])

  const parseGoogleSheetsDate = (dateStr) => {
    if (!dateStr) return ""

    if (typeof dateStr === "string" && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateStr
    }

    if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr)
      if (match) {
        const year = Number.parseInt(match[1], 10)
        const month = Number.parseInt(match[2], 10)
        const day = Number.parseInt(match[3], 10)
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }
    }

    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return formatDateToDDMMYYYY(date)
      }
    } catch (error) {
      console.error("Error parsing date:", error)
    }

    return dateStr
  }

  const parseDateFromDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null
    const parts = dateStr.split("/")
    if (parts.length !== 3) return null
    return new Date(parts[2], parts[1] - 1, parts[0])
  }

  const sortDateWise = (a, b) => {
    const dateStrA = a["col6"] || ""
    const dateStrB = b["col6"] || ""
    const dateA = parseDateFromDDMMYYYY(dateStrA)
    const dateB = parseDateFromDDMMYYYY(dateStrB)
    if (!dateA) return 1
    if (!dateB) return -1
    return dateA.getTime() - dateB.getTime()
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedMembers([])
    setStartDate("")
    setEndDate("")
  }

  // Memoized filtered data to prevent unnecessary re-renders
  const filteredAccountData = useMemo(() => {
    const filtered = searchTerm
      ? accountData.filter((account) =>
          Object.values(account).some(
            (value) => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
          ),
        )
      : accountData

    return filtered.sort(sortDateWise)
  }, [accountData, searchTerm])

  const filteredHistoryData = useMemo(() => {
    return historyData
      .filter((item) => {
        const matchesSearch = searchTerm
          ? Object.values(item).some(
              (value) => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
            )
          : true

        const matchesMember = selectedMembers.length > 0 ? selectedMembers.includes(item["col4"]) : true

        let matchesDateRange = true
        if (startDate || endDate) {
          const itemDate = parseDateFromDDMMYYYY(item["col10"])
          if (!itemDate) return false

          if (startDate) {
            const startDateObj = new Date(startDate)
            startDateObj.setHours(0, 0, 0, 0)
            if (itemDate < startDateObj) matchesDateRange = false
          }

          if (endDate) {
            const endDateObj = new Date(endDate)
            endDateObj.setHours(23, 59, 59, 999)
            if (itemDate > endDateObj) matchesDateRange = false
          }
        }

        return matchesSearch && matchesMember && matchesDateRange
      })
      .sort((a, b) => {
        const dateStrA = a["col10"] || ""
        const dateStrB = b["col10"] || ""
        const dateA = parseDateFromDDMMYYYY(dateStrA)
        const dateB = parseDateFromDDMMYYYY(dateStrB)
        if (!dateA) return 1
        if (!dateB) return -1
        return dateB.getTime() - dateA.getTime()
      })
  }, [historyData, searchTerm, selectedMembers, startDate, endDate])

  const getTaskStatistics = () => {
    const totalCompleted = historyData.length
    const memberStats =
      selectedMembers.length > 0
        ? selectedMembers.reduce((stats, member) => {
            const memberTasks = historyData.filter((task) => task["col4"] === member).length
            return {
              ...stats,
              [member]: memberTasks,
            }
          }, {})
        : {}
    const filteredTotal = filteredHistoryData.length

    return {
      totalCompleted,
      memberStats,
      filteredTotal,
    }
  }

  const handleMemberSelection = (member) => {
    setSelectedMembers((prev) => {
      if (prev.includes(member)) {
        return prev.filter((item) => item !== member)
      } else {
        return [...prev, member]
      }
    })
  }

  const getFilteredMembersList = () => {
    if (userRole === "admin") {
      return membersList
    } else {
      return membersList.filter(member => member.toLowerCase() === username.toLowerCase())
    }
  }

  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true)
      const pendingAccounts = []
      const historyRows = []

      const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SHEET_NAME}&action=fetch`)

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

      const currentUsername = sessionStorage.getItem("username")
      const currentUserRole = sessionStorage.getItem("role")

      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)

      const todayStr = formatDateToDDMMYYYY(today)
      const tomorrowStr = formatDateToDDMMYYYY(tomorrow)

      console.log("Filtering dates:", { todayStr, tomorrowStr })

      const membersSet = new Set()

      let rows = []
      if (data.table && data.table.rows) {
        rows = data.table.rows
      } else if (Array.isArray(data)) {
        rows = data
      } else if (data.values) {
        rows = data.values.map(row => ({ c: row.map(val => ({ v: val })) }))
      }

      rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return

        let rowValues = []
        if (row.c) {
          rowValues = row.c.map(cell => cell && cell.v !== undefined ? cell.v : "")
        } else if (Array.isArray(row)) {
          rowValues = row
        } else {
          console.log("Unknown row format:", row)
          return
        }

        const assignedTo = rowValues[4] || "Unassigned"
        membersSet.add(assignedTo)

        const isUserMatch = currentUserRole === "admin" || assignedTo.toLowerCase() === currentUsername.toLowerCase()
        if (!isUserMatch && currentUserRole !== "admin") return

        const columnGValue = rowValues[6]
        const columnKValue = rowValues[10]
        const columnMValue = rowValues[12]

        if (columnMValue && columnMValue.toString().trim() === "DONE") {
          return
        }

        const rowDateStr = columnGValue ? String(columnGValue).trim() : ""
        const formattedRowDate = parseGoogleSheetsDate(rowDateStr)

        const googleSheetsRowIndex = rowIndex + 1

        // Create stable unique ID using task ID and row index
        const taskId = rowValues[1] || ""
        const stableId = taskId ? `task_${taskId}_${googleSheetsRowIndex}` : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

        const rowData = {
          _id: stableId, // More stable ID
          _rowIndex: googleSheetsRowIndex,
          _taskId: taskId,
        }

        const columnHeaders = [
          { id: "col0", label: "Timestamp", type: "string" },
          { id: "col1", label: "Task ID", type: "string" },
          { id: "col2", label: "Firm", type: "string" },
          { id: "col3", label: "Given By", type: "string" },
          { id: "col4", label: "Name", type: "string" },
          { id: "col5", label: "Task Description", type: "string" },
          { id: "col6", label: "Task Start Date", type: "date" },
          { id: "col7", label: "Freq", type: "string" },
          { id: "col8", label: "Enable Reminders", type: "string" },
          { id: "col9", label: "Require Attachment", type: "string" },
          { id: "col10", label: "Actual", type: "date" },
          { id: "col11", label: "Column L", type: "string" },
          { id: "col12", label: "Status", type: "string" },
          { id: "col13", label: "Remarks", type: "string" },
          { id: "col14", label: "Uploaded Image", type: "string" },
        ]

        columnHeaders.forEach((header, index) => {
          const cellValue = rowValues[index]
          if (header.type === "date" || (cellValue && String(cellValue).startsWith("Date("))) {
            rowData[header.id] = cellValue ? parseGoogleSheetsDate(String(cellValue)) : ""
          } else if (header.type === "number" && cellValue !== null && cellValue !== "") {
            rowData[header.id] = cellValue
          } else {
            rowData[header.id] = cellValue !== null ? cellValue : ""
          }
        })

        console.log(`Row ${rowIndex}: Task ID = ${rowData.col1}, Google Sheets Row = ${googleSheetsRowIndex}`)

        const hasColumnG = !isEmpty(columnGValue)
        const isColumnKEmpty = isEmpty(columnKValue)

        if (hasColumnG && isColumnKEmpty) {
          const rowDate = parseDateFromDDMMYYYY(formattedRowDate)
          const isToday = formattedRowDate === todayStr
          const isTomorrow = formattedRowDate === tomorrowStr
          const isPastDate = rowDate && rowDate <= today

          if (isToday || isTomorrow || isPastDate) {
            pendingAccounts.push(rowData)
          }
        } else if (hasColumnG && !isColumnKEmpty) {
          const isUserHistoryMatch = currentUserRole === "admin" || assignedTo.toLowerCase() === currentUsername.toLowerCase()
          if (isUserHistoryMatch) {
            historyRows.push(rowData)
          }
        }
      })

      setMembersList(Array.from(membersSet).sort())
      setAccountData(pendingAccounts)
      setHistoryData(historyRows)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching sheet data:", error)
      setError("Failed to load account data: " + error.message)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSheetData()
  }, [fetchSheetData])

  // Fixed checkbox handlers with better state management
  const handleSelectItem = useCallback((id, isChecked) => {
    console.log(`Checkbox action: ${id} -> ${isChecked}`)
   
    setSelectedItems((prev) => {
      const newSelected = new Set(prev)
     
      if (isChecked) {
        newSelected.add(id)
      } else {
        newSelected.delete(id)
        // Clean up related data when unchecking
        setAdditionalData((prevData) => {
          const newAdditionalData = { ...prevData }
          delete newAdditionalData[id]
          return newAdditionalData
        })
        setRemarksData((prevRemarks) => {
          const newRemarksData = { ...prevRemarks }
          delete newRemarksData[id]
          return newRemarksData
        })
      }
     
      console.log(`Updated selection: ${Array.from(newSelected)}`)
      return newSelected
    })
  }, [])

  const handleCheckboxClick = useCallback((e, id) => {
    e.stopPropagation()
    const isChecked = e.target.checked
    console.log(`Checkbox clicked: ${id}, checked: ${isChecked}`)
    handleSelectItem(id, isChecked)
  }, [handleSelectItem])

  const handleSelectAllItems = useCallback((e) => {
    e.stopPropagation()
    const checked = e.target.checked
    console.log(`Select all clicked: ${checked}`)

    if (checked) {
      const allIds = filteredAccountData.map((item) => item._id)
      setSelectedItems(new Set(allIds))
      console.log(`Selected all items: ${allIds}`)
    } else {
      setSelectedItems(new Set())
      setAdditionalData({})
      setRemarksData({})
      console.log("Cleared all selections")
    }
  }, [filteredAccountData])

  const handleImageUpload = async (id, e) => {
    const file = e.target.files[0]
    if (!file) return
   
    console.log(`Image upload for: ${id}`)
    setAccountData((prev) => prev.map((item) => (item._id === id ? { ...item, image: file } : item)))
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  const toggleHistory = () => {
    setShowHistory((prev) => !prev)
    resetFilters()
  }

  const handleSubmit = async () => {
    const selectedItemsArray = Array.from(selectedItems)
   
    if (selectedItemsArray.length === 0) {
      alert("Please select at least one item to submit")
      return
    }

    const missingRemarks = selectedItemsArray.filter((id) => {
      const additionalStatus = additionalData[id]
      const remarks = remarksData[id]
      return additionalStatus === "No" && (!remarks || remarks.trim() === "")
    })

    if (missingRemarks.length > 0) {
      alert(`Please provide remarks for items marked as "No". ${missingRemarks.length} item(s) are missing remarks.`)
      return
    }

    const missingRequiredImages = selectedItemsArray.filter((id) => {
      const item = accountData.find((account) => account._id === id)
      const requiresAttachment = item["col9"] && item["col9"].toUpperCase() === "YES"
      return requiresAttachment && !item.image
    })

    if (missingRequiredImages.length > 0) {
      alert(
        `Please upload images for all required attachments. ${missingRequiredImages.length} item(s) are missing required images.`,
      )
      return
    }

    setIsSubmitting(true)

    try {
      const today = new Date()
      const todayFormatted = formatDateToDDMMYYYY(today)

      const submissionData = await Promise.all(
        selectedItemsArray.map(async (id) => {
          const item = accountData.find((account) => account._id === id)

          console.log(`Preparing submission for item:`, {
            id: id,
            taskId: item["col1"],
            rowIndex: item._rowIndex,
            expectedTaskId: item._taskId
          })

          let imageUrl = ""

          if (item.image instanceof File) {
            try {
              const base64Data = await fileToBase64(item.image)

              const uploadFormData = new FormData()
              uploadFormData.append("action", "uploadFile")
              uploadFormData.append("base64Data", base64Data)
              uploadFormData.append("fileName", `task_${item["col1"]}_${Date.now()}.${item.image.name.split('.').pop()}`)
              uploadFormData.append("mimeType", item.image.type)
              uploadFormData.append("folderId", CONFIG.DRIVE_FOLDER_ID)

              const uploadResponse = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                body: uploadFormData,
              })

              const uploadResult = await uploadResponse.json()
              if (uploadResult.success) {
                imageUrl = uploadResult.fileUrl
              }
            } catch (uploadError) {
              console.error("Error uploading image:", uploadError)
            }
          }

          return {
            taskId: item["col1"],
            rowIndex: item._rowIndex,
            actualDate: todayFormatted,
            status: additionalData[id] || "",
            remarks: remarksData[id] || "",
            imageUrl: imageUrl,
          }
        }),
      )

      console.log("Final submission data:", submissionData)

      const formData = new FormData()
      formData.append("sheetName", CONFIG.SHEET_NAME)
      formData.append("action", "updateTaskData")
      formData.append("rowData", JSON.stringify(submissionData))

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setAccountData((prev) =>
          prev.map((item) => (selectedItems.has(item._id) ? { ...item, status: "completed", image: null } : item)),
        )

        setSuccessMessage(
          `Successfully processed ${selectedItemsArray.length} task records! Columns K, M, N, and O updated.`,
        )
        setSelectedItems(new Set())
        setAdditionalData({})
        setRemarksData({})

        setTimeout(() => {
          fetchSheetData()
        }, 2000)
      } else {
        throw new Error(result.error || "Submission failed")
      }
    } catch (error) {
      console.error("Submission error:", error)
      alert("Failed to submit task records: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Convert Set to Array for display
  const selectedItemsCount = selectedItems.size

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight text-purple-700">
            {showHistory ? CONFIG.PAGE_CONFIG.historyTitle : CONFIG.PAGE_CONFIG.title}
          </h1>

          <div className="flex space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={showHistory ? "Search history..." : "Search tasks..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={toggleHistory}
              className="rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 py-2 px-4 text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {showHistory ? (
                <div className="flex items-center">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span>Back to Tasks</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <History className="h-4 w-4 mr-1" />
                  <span>View History</span>
                </div>
              )}
            </button>

            {!showHistory && (
              <button
                onClick={handleSubmit}
                disabled={selectedItemsCount === 0 || isSubmitting}
                className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 py-2 px-4 text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Processing..." : `Submit Selected (${selectedItemsCount})`}
              </button>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
              {successMessage}
            </div>
            <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
            <h2 className="text-purple-700 font-medium">{showHistory ? `Completed ${CONFIG.SHEET_NAME} Tasks` : `Pending ${CONFIG.SHEET_NAME} Tasks`}</h2>
            <p className="text-purple-600 text-sm">
              {showHistory
                ? `${CONFIG.PAGE_CONFIG.historyDescription} for ${userRole === "admin" ? "all" : "your"} tasks`
                : CONFIG.PAGE_CONFIG.description}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-purple-600">Loading task data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">
              {error}{" "}
              <button className="underline ml-2" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          ) : showHistory ? (
            <>
              {/* History Filters */}
              <div className="p-4 border-b border-purple-100 bg-gray-50">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {getFilteredMembersList().length > 0 && (
                    <div className="flex flex-col">
                      <div className="mb-2 flex items-center">
                        <span className="text-sm font-medium text-purple-700">Filter by Member:</span>
                      </div>
                      <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md bg-white">
                        {getFilteredMembersList().map((member, idx) => (
                          <div key={idx} className="flex items-center">
                            <input
                              id={`member-${idx}`}
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              checked={selectedMembers.includes(member)}
                              onChange={() => handleMemberSelection(member)}
                            />
                            <label htmlFor={`member-${idx}`} className="ml-2 text-sm text-gray-700">
                              {member}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center">
                      <span className="text-sm font-medium text-purple-700">Filter by Date Range:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <label htmlFor="start-date" className="text-sm text-gray-700 mr-1">
                          From
                        </label>
                        <input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="text-sm border border-gray-200 rounded-md p-1"
                        />
                      </div>
                      <div className="flex items-center">
                        <label htmlFor="end-date" className="text-sm text-gray-700 mr-1">
                          To
                        </label>
                        <input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="text-sm border border-gray-200 rounded-md p-1"
                        />
                      </div>
                    </div>
                  </div>

                  {(selectedMembers.length > 0 || startDate || endDate || searchTerm) && (
                    <button
                      onClick={resetFilters}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Task Statistics */}
              <div className="p-4 border-b border-purple-100 bg-blue-50">
                <div className="flex flex-col">
                  <h3 className="text-sm font-medium text-blue-700 mb-2">Task Completion Statistics:</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="px-3 py-2 bg-white rounded-md shadow-sm">
                      <span className="text-xs text-gray-500">Total Completed</span>
                      <div className="text-lg font-semibold text-blue-600">{getTaskStatistics().totalCompleted}</div>
                    </div>

                    {(selectedMembers.length > 0 || startDate || endDate || searchTerm) && (
                      <div className="px-3 py-2 bg-white rounded-md shadow-sm">
                        <span className="text-xs text-gray-500">Filtered Results</span>
                        <div className="text-lg font-semibold text-blue-600">{getTaskStatistics().filteredTotal}</div>
                      </div>
                    )}

                    {selectedMembers.map((member) => (
                      <div key={member} className="px-3 py-2 bg-white rounded-md shadow-sm">
                        <span className="text-xs text-gray-500">{member}</span>
                        <div className="text-lg font-semibold text-indigo-600">
                          {getTaskStatistics().memberStats[member]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* History Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firm</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Given By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">Task Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Freq</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enable Reminders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Require Attachment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Actual Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">Remarks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attachment</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((history) => (
                        <tr key={history._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{history["col1"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{history["col2"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{history["col3"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{history["col4"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs" title={history["col5"]}>
                              {history["col5"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-yellow-50">
                            <div className="text-sm text-gray-900">{history["col6"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{history["col7"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{history["col8"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{history["col9"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-green-50">
                            <div className="text-sm font-medium text-gray-900">{history["col10"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-blue-50">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${history["col12"] === "Yes"
                              ? "bg-green-100 text-green-800"
                              : history["col12"] === "No"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                              }`}>
                              {history["col12"] || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 bg-purple-50">
                            <div className="text-sm text-gray-900 max-w-xs" title={history["col13"]}>
                              {history["col13"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {history["col14"] ? (
                              <a
                                href={history["col14"]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline flex items-center"
                              >
                                <img
                                  src={history["col14"] || "/api/placeholder/32/32"}
                                  alt="Attachment"
                                  className="h-8 w-8 object-cover rounded-md mr-2"
                                />
                                View
                              </a>
                            ) : (
                              <span className="text-gray-400">No attachment</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={13} className="px-6 py-4 text-center text-gray-500">
                          {searchTerm || selectedMembers.length > 0 || startDate || endDate
                            ? "No historical records matching your filters"
                            : "No completed records found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Regular Tasks Table */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        checked={filteredAccountData.length > 0 && selectedItems.size === filteredAccountData.length}
                        onChange={handleSelectAllItems}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Given By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">Task Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Freq</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enable Reminders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Require Attachment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Image</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccountData.length > 0 ? (
                    filteredAccountData.map((account) => {
                      const isSelected = selectedItems.has(account._id)
                      return (
                        <tr
                          key={account._id}
                          className={`${isSelected ? "bg-purple-50" : ""} hover:bg-gray-50`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              checked={isSelected}
                              onChange={(e) => handleCheckboxClick(e, account._id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col1"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col2"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col3"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col4"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={account["col5"]}>
                              {account["col5"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-yellow-50">
                            <div className="text-sm text-gray-900">{account["col6"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col7"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col8"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col9"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-yellow-50">
                            <select
                              disabled={!isSelected}
                              value={additionalData[account._id] || ""}
                              onChange={(e) => {
                                setAdditionalData((prev) => ({ ...prev, [account._id]: e.target.value }))
                                if (e.target.value !== "No") {
                                  setRemarksData((prev) => {
                                    const newData = { ...prev }
                                    delete newData[account._id]
                                    return newData
                                  })
                                }
                              }}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">Select...</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-orange-50">
                            <input
                              type="text"
                              placeholder="Enter remarks"
                              disabled={!isSelected || !additionalData[account._id]}
                              value={remarksData[account._id] || ""}
                              onChange={(e) => setRemarksData((prev) => ({ ...prev, [account._id]: e.target.value }))}
                              className="border rounded-md px-2 py-1 w-full border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-green-50">
                            {account.image ? (
                              <div className="flex items-center">
                                <img
                                  src={
                                    typeof account.image === "string" ? account.image : URL.createObjectURL(account.image)
                                  }
                                  alt="Receipt"
                                  className="h-10 w-10 object-cover rounded-md mr-2"
                                />
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-500">
                                    {account.image instanceof File ? account.image.name : "Uploaded Receipt"}
                                  </span>
                                  {account.image instanceof File ? (
                                    <span className="text-xs text-green-600">Ready to upload</span>
                                  ) : (
                                    <button
                                      className="text-xs text-purple-600 hover:text-purple-800"
                                      onClick={() => window.open(account.image, "_blank")}
                                    >
                                      View Full Image
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <label
                                className={`flex items-center cursor-pointer ${account["col9"]?.toUpperCase() === "YES" ? "text-red-600 font-medium" : "text-purple-600"} hover:text-purple-800`}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                <span className="text-xs">
                                  {account["col9"]?.toUpperCase() === "YES" ? "Required Upload" : "Upload Receipt Image"}
                                  {account["col9"]?.toUpperCase() === "YES" && (
                                    <span className="text-red-500 ml-1">*</span>
                                  )}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(account._id, e)}
                                  disabled={!isSelected}
                                />
                              </label>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={14} className="px-6 py-4 text-center text-gray-500">
                        {searchTerm
                          ? "No tasks matching your search"
                          : "No pending tasks found for today, tomorrow, or past due dates"}
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

export default AccountDataPage