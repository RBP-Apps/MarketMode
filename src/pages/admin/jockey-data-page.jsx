"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Upload, X, Search, History, ArrowLeft, Calendar, Check } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import ReactDOM from 'react-dom';

// Google Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz47q4SiLvJJom8dRGteqjhufs0Iui4rYTLMeTYqOgY_MFrS0C0o0XkRCPzAOdEeg4jqg/exec"
// Google Drive folder ID
const DRIVE_FOLDER_ID = "1TzjAIpRAoz017MfzZ0gZaN-v5jyKtg7E"

function AccountDataPage() {
  const [accountData, setAccountData] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [sheetHeaders, setSheetHeaders] = useState([])
  const [additionalData, setAdditionalData] = useState({})
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [membersList, setMembersList] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedHistoryItems, setSelectedHistoryItems] = useState([])
  const [markingAsDone, setMarkingAsDone] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    itemCount: 0
  })

  // Format date as DD/MM/YYYY
  const formatDateToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Check if a value is empty or null
  const isEmpty = (value) => {
    return value === null || 
           value === undefined || 
           (typeof value === 'string' && value.trim() === '');
  }

  // Safe access to cell value
  const getCellValue = (row, index) => {
    if (!row || !row.c || index >= row.c.length) return null;
    const cell = row.c[index];
    return cell && 'v' in cell ? cell.v : null;
  }

  useEffect(() => {
    const role = sessionStorage.getItem('role')
    setUserRole(role || '')
  }, [])

  // Parse Google Sheets Date format into a proper date string
  const parseGoogleSheetsDate = (dateStr) => {
    if (!dateStr) return '';
    
    if (typeof dateStr === 'string' && dateStr.startsWith('Date(')) {
      // Handle Google Sheets Date(year,month,day) format
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10); // 0-indexed in Google's format
        const day = parseInt(match[3], 10);
        
        // Format as DD/MM/YYYY
        return `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
      }
    }
    
    // If it's already in DD/MM/YYYY format, return as is
    if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateStr;
    }
    
    // If we get here, try to parse as a date and format
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return formatDateToDDMMYYYY(date);
      }
    } catch (e) {
      console.error("Error parsing date:", e);
    }
    
    // Return original if parsing fails
    return dateStr;
  }

  // Parse date from DD/MM/YYYY format
  const parseDateFromDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    return new Date(parts[2], parts[1] - 1, parts[0])
  }

  // Format date from yyyy-mm-dd to DD/MM/YYYY
  const formatDateFromHTML = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return "";
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // Custom date sorting function
  const sortDateWise = (a, b) => {
    // Ensure we're looking at column H (index 7)
    const dateStrA = a['col7'] || ''
    const dateStrB = b['col7'] || ''

    const dateA = parseDateFromDDMMYYYY(dateStrA)
    const dateB = parseDateFromDDMMYYYY(dateStrB)

    // Handle cases where dates might be null or invalid
    if (!dateA) return 1
    if (!dateB) return -1

    // Compare dates directly
    return dateA.getTime() - dateB.getTime()
  }

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedMembers([]);
    setStartDate("");
    setEndDate("");
  }

  // Update filteredAccountData calculation
  const filteredAccountData = searchTerm
    ? accountData
        .filter(account => 
          Object.values(account).some(value => 
            value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )  
        )
        .sort(sortDateWise)
    : accountData.sort(sortDateWise)

  // Update filteredHistoryData calculation to include member and date filtering
  const filteredHistoryData = historyData
    .filter(item => {
      // Text search filter
      const matchesSearch = searchTerm ? 
        Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        ) : true;
      
      // Member filter (Column E - index 4)
      const matchesMember = selectedMembers.length > 0 ? 
        selectedMembers.includes(item['col4']) : true;
      
      // Date range filter (Column M - index 12)
      let matchesDateRange = true;
      if (startDate || endDate) {
        const itemDate = parseDateFromDDMMYYYY(item['col12']);
        
        if (!itemDate) return false;
        
        if (startDate) {
          const startDateObj = new Date(startDate);
          startDateObj.setHours(0, 0, 0, 0);
          if (itemDate < startDateObj) matchesDateRange = false;
        }
        
        if (endDate) {
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          if (itemDate > endDateObj) matchesDateRange = false;
        }
      }
      
      return matchesSearch && matchesMember && matchesDateRange;
    })
    .sort((a, b) => {
      // Sort by submission date (Column M - index 12)
      const dateStrA = a['col12'] || ''
      const dateStrB = b['col12'] || ''
      const dateA = parseDateFromDDMMYYYY(dateStrA)
      const dateB = parseDateFromDDMMYYYY(dateStrB)
      // Most recent first
      if (!dateA) return 1
      if (!dateB) return -1
      return dateB.getTime() - dateA.getTime()
    });

  // Calculate task statistics for history view
  const getTaskStatistics = () => {
    // Calculate total tasks completed
    const totalCompleted = historyData.length;
    
    // If members are selected, calculate tasks by selected members
    const memberStats = selectedMembers.length > 0 
      ? selectedMembers.reduce((stats, member) => {
          const memberTasks = historyData.filter(task => task['col4'] === member).length;
          return {
            ...stats,
            [member]: memberTasks
          };
        }, {})
      : {};
    
    // Calculate total of filtered tasks (when search and/or member filters are applied)
    const filteredTotal = filteredHistoryData.length;
    
    return {
      totalCompleted,
      memberStats,
      filteredTotal
    };
  };

  // Handle member selection function with checkboxes
  const handleMemberSelection = (member) => {
    setSelectedMembers(prev => {
      // If member is already selected, remove it, otherwise add it
      if (prev.includes(member)) {
        return prev.filter(item => item !== member);
      } else {
        return [...prev, member];
      }
    });
  };

  // Modified handleMarkMultipleDone function
 // Modified handleMarkMultipleDone function
 const handleMarkMultipleDone = async () => {
  if (selectedHistoryItems.length === 0) {
    setSuccessMessage("Please select at least one item to mark as done");
    return;
  }

  if (markingAsDone) return;

  // Open confirmation modal
  setConfirmationModal({
    isOpen: true,
    itemCount: selectedHistoryItems.length
  });
}

// Confirmation modal component
const ConfirmationModal = ({ isOpen, itemCount, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-yellow-100 text-yellow-600 rounded-full p-3 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Mark Items as Done</h2>
        </div>
        
        <p className="text-gray-600 text-center mb-6">
          Are you sure you want to mark {itemCount} {itemCount === 1 ? 'item' : 'items'} as done?
        </p>
        
        <div className="flex justify-center space-x-4">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// Confirmation handler
const confirmMarkDone = async () => {
  // Close the modal
  setConfirmationModal({ isOpen: false, itemCount: 0 });

  setMarkingAsDone(true);
  
  try {
    // Prepare submission data for multiple items
    const submissionData = selectedHistoryItems.map(historyItem => ({
      taskId: historyItem._id,
      rowIndex: historyItem._rowIndex,
      additionalInfo: "", // Additional info column (Column O)
      imageData: null,    // No new image
      imageUrl: "",       // Column P
      todayDate: "",      // Column M
      doneStatus: "DONE"  // Specifically for Column Q
    }));
    
    const formData = new FormData();
    formData.append('sheetName', 'JOCKEY');
    formData.append('action', 'updateSalesData');
    formData.append('rowData', JSON.stringify(submissionData));
    
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      // Remove the marked tasks from history data
      setHistoryData(prev => prev.filter(item => 
        !selectedHistoryItems.some(selectedItem => selectedItem._id === item._id)
      ));
      
      // Clear selected items
      setSelectedHistoryItems([]);
      
      setSuccessMessage(`Successfully marked ${selectedHistoryItems.length} items as done!`);
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchSheetData();
      }, 2000);
    } else {
      throw new Error(result.error || "Failed to mark items as done");
    }
  } catch (error) {
    console.error("Error marking tasks as done:", error);
    setSuccessMessage(`Failed to mark tasks as done: ${error.message}`);
  } finally {
    setMarkingAsDone(false);
  }
}

  // Fetch sheet data function
  const fetchSheetData = async () => {
    try {
      setLoading(true);
      // Clear existing data before fetching to prevent duplicates
      const pendingAccounts = [];
      const historyRows = [];
      
      const response = await fetch(`https://docs.google.com/spreadsheets/d/1a1jPYstX2Wy778hD9OpM_PZkYE3KGktL0JxSL8dJiTY/gviz/tq?tqx=out:json&sheet=JOCKEY`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      
      const text = await response.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);
      
      const username = sessionStorage.getItem('username')
      const userRole = sessionStorage.getItem('role')

      // Extract headers
      const headers = data.table.cols.map((col, index) => ({
        id: `col${index}`,
        label: col.label || `Column ${index + 1}`,
        type: col.type
      })).filter(header => header.label !== '');
      
      setSheetHeaders(headers);
      
      // Get today and tomorrow's dates
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      
      const todayStr = formatDateToDDMMYYYY(today)
      const tomorrowStr = formatDateToDDMMYYYY(tomorrow)
      
      console.log("Filtering dates:", { todayStr, tomorrowStr })
      
      // Debugging array to track row filtering
      const debugRows = [];
      
      // Track all unique members for filtering
      const membersSet = new Set();
      
      // Process all rows
      data.table.rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return;
        
        // For non-admin users, filter by username in Column E (index 4)
        const assignedTo = getCellValue(row, 4) || 'Unassigned';
        membersSet.add(assignedTo); // Add to members list for dropdown
        
        const isUserMatch = userRole === 'admin' || 
                            assignedTo.toLowerCase() === username.toLowerCase();
        
        // If not a match and not admin, skip this row
        if (!isUserMatch && userRole !== 'admin') return;
        
        // Safely get values from columns L, M, P, and Q
        const columnLValue = getCellValue(row, 11);
        const columnMValue = getCellValue(row, 12);
        const columnPValue = getCellValue(row, 15);
        const columnQValue = getCellValue(row, 16);

        // Skip rows marked as DONE in column Q
        if (columnQValue && columnQValue.toString().trim() === 'DONE') {
          return;
        }
        
        // Convert column L value to string and format properly
        let rowDateStr = columnLValue ? String(columnLValue).trim() : '';
        let formattedRowDate = parseGoogleSheetsDate(rowDateStr);
        
        // Create row data object
        const rowData = {
          _id: Math.random().toString(36).substring(2, 15),  
          _rowIndex: rowIndex + 2 // +2 for header row and 1-indexing
        };
        
        // Populate row data dynamically with proper date formatting
        headers.forEach((header, index) => {
          const cellValue = getCellValue(row, index);
          
          // If this is a date column, format properly
          if (header.type === 'date' || (cellValue && String(cellValue).startsWith('Date('))) {
            rowData[header.id] = cellValue ? parseGoogleSheetsDate(String(cellValue)) : '';
          } else if (header.type === 'number' && cellValue !== null && cellValue !== '') {
            // Handle numeric values
            rowData[header.id] = cellValue;
          } else {
            // Handle all other values
            rowData[header.id] = cellValue !== null ? cellValue : '';
          }
        });
        
        // Check if column L is not null/empty and column M is null/empty
        const hasColumnL = !isEmpty(columnLValue);
        const isColumnMEmpty = isEmpty(columnMValue);
        
        // For pending tasks: Column L is not null and column M is null
        if (hasColumnL && isColumnMEmpty) {
          // Filter for today and tomorrow OR past dates
          if (formattedRowDate === todayStr || 
              formattedRowDate === tomorrowStr || 
              (parseDateFromDDMMYYYY(formattedRowDate) <= today)) {
            
            debugRows.push({
              rowIndex,
              hasColumnL,
              isColumnMEmpty,
              formattedRowDate,
              todayStr,
              tomorrowStr,
              matches: formattedRowDate === todayStr || formattedRowDate === tomorrowStr
            });
            
            pendingAccounts.push(rowData);
          }
        } 
        // For history: Both column L and M are not null
        else if (hasColumnL && !isColumnMEmpty) {
          historyRows.push(rowData);
        }
      });
      
      // Set debug information for display
      setDebugInfo(debugRows);
      
      // Set members list from all unique values in column E
      setMembersList(Array.from(membersSet).sort());
      
      // Set account data and history data separately to avoid duplication
      setAccountData(pendingAccounts);
      setHistoryData(historyRows);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      setError("Failed to load account data");  
      setLoading(false);
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchSheetData()
  }, [])

  const handleSelectItem = (id) => {
    setSelectedItems(prev => {
      const isSelected = prev.includes(id)
      if (isSelected) {
        const newAdditionalData = {...additionalData}
        delete newAdditionalData[id]
        setAdditionalData(newAdditionalData)
        return prev.filter(itemId => itemId !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  // Handle image upload
  const handleImageUpload = async (id, e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Store file in state temporarily
    setAccountData(prev => prev.map(item =>
      item._id === id 
        ? {...item, image: file}
        : item  
    ))
  }

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }
  
  // Handle toggle history view
  const toggleHistory = () => {
    setShowHistory(prev => !prev)
    resetFilters() // Reset all filters when toggling views
  }

  // Handle submit selected items  
  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to submit") 
      return
    }

    // Check if any selected item requires an image but doesn't have one
    const missingRequiredImages = selectedItems.filter(id => {
      const item = accountData.find(account => account._id === id)
      // Check if column K (index 10) has "YES" value and no image is uploaded
      const requiresAttachment = item['col10'] && item['col10'].toUpperCase() === "YES"
      return requiresAttachment && !item.image
    })

    if (missingRequiredImages.length > 0) {
      alert(`Please upload images for all required attachments. ${missingRequiredImages.length} item(s) are missing required images.`)
      return
    }

    setIsSubmitting(true)
    
    try {
      // Get today's date formatted as DD/MM/YYYY for column M
      const today = new Date()
      const todayFormatted = formatDateToDDMMYYYY(today)
      
      const submissionData = await Promise.all(selectedItems.map(async (id) => {
        const item = accountData.find(account => account._id === id)
        let imageData = null
        
        // If there's an image and it's a file (not a URL), convert to base64
        if (item.image instanceof File) {
          imageData = await fileToBase64(item.image)
        }
        
        return {
          taskId: id,
          rowIndex: item._rowIndex,
          additionalInfo: additionalData[id] || "",
          imageData: imageData,
          folderId: DRIVE_FOLDER_ID,
          // Add today's date for column M (submission date)
          todayDate: todayFormatted
        }
      }))
      
      const formData = new FormData()
      formData.append('sheetName', 'JOCKEY')
      formData.append('action', 'updateSalesData')
      formData.append('rowData', JSON.stringify(submissionData))
      
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (result.success) {
        setAccountData(prev => prev.map(item =>
          selectedItems.includes(item._id)
            ? {...item, status: "completed", image: null}
            : item
        ))
        
        setSuccessMessage(`Successfully processed ${selectedItems.length} account records! Columns M, O and P updated.`)
        setSelectedItems([])
        setAdditionalData({})
        
        // Refresh data to see updated image URLs
        setTimeout(() => {
          fetchSheetData()
        }, 2000)
      } else {
        throw new Error(result.error || "Submission failed")
      }
    } catch (error) {
      console.error("Submission error:", error)
      alert("Failed to submit account records: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight text-purple-700">
            {showHistory ? "Admin Data History" : "Admin Data"}
          </h1>

          <div className="flex space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={showHistory ? "Search history..." : "Search transactions..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            {/* History Toggle Button */}
            {userRole === 'admin' && (
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
            )}
            
            {/* Submit Button - Only show when not in history view */}
            {!showHistory && (
              <button
                onClick={handleSubmit}
                disabled={selectedItems.length === 0 || isSubmitting}
                className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 py-2 px-4 text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Processing..." : `Submit Selected (${selectedItems.length})`}
              </button>
            )}
            
            {/* Submit Button for History View - Only show when items are selected */}
            {showHistory && selectedHistoryItems.length > 0 && (
              <div className="fixed top-40 right-10 z-50">
                <button
                  onClick={handleMarkMultipleDone}
                  disabled={markingAsDone}
                  className="rounded-md bg-green-600 text-white px-4 py-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {markingAsDone 
                    ? "Processing..." 
                    : `Mark ${selectedHistoryItems.length} Items as Done`
                  }
                </button>
              </div>
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
            <h2 className="text-purple-700 font-medium">
              {showHistory 
                ? "Completed Admin Records" 
                : "Admin Records"}
            </h2>
            <p className="text-purple-600 text-sm">
              {showHistory 
                ? "Showing all completed records with submission dates"
                : "Showing today and tomorrow's records with pending submissions"
              }
            </p>
          </div>
            
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-purple-600">Loading account data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">
              {error} <button className="underline ml-2" onClick={() => window.location.reload()}>Try again</button>
            </div>  
          ) : showHistory ? (
            // History Table
            <>
              {/* Filters Section */}
              <div className="p-4 border-b border-purple-100 bg-gray-50">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Member filter checkboxes */}
                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center">
                      <span className="text-sm font-medium text-purple-700">Filter by Member:</span>
                    </div>
                    <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md bg-white">
                      {membersList.map((member, idx) => (
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
                  
                  {/* Date Range Filter */}
                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center">
                      <span className="text-sm font-medium text-purple-700">Filter by Date Range:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <label htmlFor="start-date" className="text-sm text-gray-700 mr-1">From</label>
                        <input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="text-sm border border-gray-200 rounded-md p-1"
                        />
                      </div>
                      <div className="flex items-center">
                        <label htmlFor="end-date" className="text-sm text-gray-700 mr-1">To</label>
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
                  
                  {/* Clear Filters Button */}
                  {(selectedMembers.length > 0 || startDate || endDate || searchTerm) && (
                    <button 
                      onClick={resetFilters}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm">
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>
              <ConfirmationModal 
          isOpen={confirmationModal.isOpen}
          itemCount={confirmationModal.itemCount}
          onConfirm={confirmMarkDone}
          onCancel={() => setConfirmationModal({ isOpen: false, itemCount: 0 })}
        />
              
              {/* Task Completion Statistics */}
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
                    
                    {/* Individual member stats */}
                    {selectedMembers.map(member => (
                      <div key={member} className="px-3 py-2 bg-white rounded-md shadow-sm">
                        <span className="text-xs text-gray-500">{member}</span>
                        <div className="text-lg font-semibold text-indigo-600">{getTaskStatistics().memberStats[member]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* Add checkbox column as first column */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={filteredHistoryData.length > 0 && selectedHistoryItems.length === filteredHistoryData.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHistoryItems(filteredHistoryData)
                            } else {
                              setSelectedHistoryItems([])
                            }
                          }}
                        />
                      </th>
                      {/* Render headers for columns B to P - EXCLUDE column N and Q */}
                      {sheetHeaders.slice(1, 13).map((header) => (
                        <th 
                          key={header.id} 
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                            ${header.id === 'col11' ? 'bg-yellow-50' : ''}
                            ${header.id === 'col12' ? 'bg-green-50' : ''}
                          `}
                        >
                          {header.label}
                        </th>
                      ))}
                      
                      {/* Skip column N (index 13) and show O and P */}
                      {sheetHeaders.slice(14, 16).map((header) => (
                        <th 
                          key={header.id} 
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                            ${header.id === 'col14' ? 'bg-blue-50' : ''}
                            ${header.id === 'col15' ? 'bg-purple-50' : ''}
                          `}
                        >
                          {header.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((history) => (
                        <tr key={history._id} className="hover:bg-gray-50">
                          {/* Add checkbox in first column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                              checked={selectedHistoryItems.some(item => item._id === history._id)}
                              onChange={() => {
                                setSelectedHistoryItems(prev => 
                                  prev.some(item => item._id === history._id)
                                    ? prev.filter(item => item._id !== history._id)
                                    : [...prev, history]
                                );
                              }}
                            />
                          </td>
                          {/* Render data for columns B to M */}
                          {sheetHeaders.slice(1, 13).map((header) => (
                            <td 
                              key={header.id} 
                              className={`px-6 py-4 whitespace-nowrap
                                ${header.id === 'col11' ? 'bg-yellow-50' : ''}
                                ${header.id === 'col12' ? 'bg-green-50' : ''}
                              `}
                            >
                              <div className="text-sm text-gray-900">
                                {history[header.id] || '—'}
                              </div>
                            </td>
                          ))}
                          
                          {/* Skip column N (index 13) and show O and P */}
                          {sheetHeaders.slice(14, 16).map((header) => (
                            <td 
                              key={header.id} 
                              className={`px-6 py-4 whitespace-nowrap
                                ${header.id === 'col14' ? 'bg-blue-50' : ''}
                                ${header.id === 'col15' ? 'bg-purple-50' : ''}
                              `}
                            >
                              <div className="text-sm text-gray-900">
                                {history[header.id] || '—'}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={sheetHeaders.length + 1} className="px-6 py-4 text-center text-gray-500"> 
                          {(searchTerm || selectedMembers.length > 0 || startDate || endDate)
                            ? "No historical records matching your filters" 
                            : "No completed records found"
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            // Regular Tasks Table
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        checked={filteredAccountData.length > 0 && selectedItems.length === filteredAccountData.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(filteredAccountData.map(item => item._id))
                          } else {
                            setSelectedItems([])
                            setAdditionalData({})
                          }
                        }}
                      />
                    </th>
                    {/* Render headers for columns B to K */}
                    {sheetHeaders.slice(1, 11).map((header) => (
                      <th 
                        key={header.id} 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header.label}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Image
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccountData.length > 0 ? (
                    filteredAccountData.map((account) => (
                      <tr
                        key={account._id}
                        className={`${selectedItems.includes(account._id) ? "bg-purple-50" : ""} hover:bg-gray-50`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={selectedItems.includes(account._id)}
                            onChange={() => handleSelectItem(account._id)}
                          />
                        </td>
                        {/* Render data for columns B to K */}
                        {sheetHeaders.slice(1, 11).map((header) => (
                          <td key={header.id} className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {account[header.id] || '—'}
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            disabled={!selectedItems.includes(account._id)}
                            value={additionalData[account._id] || ""}
                            onChange={(e) => setAdditionalData(prev => ({...prev, [account._id]: e.target.value}))}
                            className="border border-gray-300 rounded-md px-2 py-1 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select...</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {account.image ? (
                            <div className="flex items-center">
                              <img
                                src={typeof account.image === 'string' ? account.image : URL.createObjectURL(account.image)}
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
                            <label className={`flex items-center cursor-pointer ${account['col10']?.toUpperCase() === "YES" ? "text-red-600 font-medium" : "text-purple-600"} hover:text-purple-800`}>
                              <Upload className="h-4 w-4 mr-1" />
                              <span className="text-xs">
                                {account['col10']?.toUpperCase() === "YES" ? "Required Upload" : "Upload Receipt Image"}
                                {account['col10']?.toUpperCase() === "YES" && <span className="text-red-500 ml-1">*</span>}
                              </span>
                              <input
                                type="file" 
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(account._id, e)}
                                disabled={!selectedItems.includes(account._id)}
                              />
                            </label>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={sheetHeaders.length + 3} className="px-6 py-4 text-center text-gray-500"> 
                        {searchTerm ? "No transactions matching your search" : "No pending account records found for today or tomorrow"}
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