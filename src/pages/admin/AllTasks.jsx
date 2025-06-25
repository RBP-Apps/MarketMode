import { useState, useEffect, useRef, useCallback } from "react"

const AllTasks = () => {
  // Google Sheets configuration
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz47q4SiLvJJom8dRGteqjhufs0Iui4rYTLMeTYqOgY_MFrS0C0o0XkRCPzAOdEeg4jqg/exec"
  const SHEET_NAME = "DATA"
  const SHEET_ID = "1pso64b1nmDBPtq9V5Ay0L93smot03LKat_K0wka0XDY" // Your specific sheet ID

  const [tasks, setTasks] = useState([])
  const [tableHeaders, setTableHeaders] = useState([])
  const [selectedTasks, setSelectedTasks] = useState([])
  const [selectedFiles, setSelectedFiles] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState({ show: false, message: "", type: "" })
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterFrequency, setFilterFrequency] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editedTasks, setEditedTasks] = useState({})
  const [username, setUsername] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedColumnValues, setSelectedColumnValues] = useState({})
  
  // Pagination state
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreTasks, setHasMoreTasks] = useState(true)

  // Ref for infinite scroll
  const observerRef = useRef(null)
  const lastTaskElementRef = useCallback(node => {
    if (isLoading) return
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreTasks) {
        setCurrentPage(prevPage => prevPage + 1)
      }
    })
    
    if (node) observerRef.current.observe(node)
  }, [isLoading, hasMoreTasks])

  // Format a date string to dd/mm/yyyy
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  }
  
  // Parse a formatted date string back to yyyy-mm-dd format for submission
  const parseFormattedDate = (formattedDate) => {
    if (!formattedDate) return '';
    
    try {
      // Specific handling for dd/mm/yyyy format
      if (formattedDate.includes('/')) {
        const [day, month, year] = formattedDate.split('/');
        // Ensure day, month, and year are valid numbers
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        
        // Create date with these values (month is 0-indexed in JS Date)
        const date = new Date(yearNum, monthNum - 1, dayNum);
        
        // Format back to yyyy-mm-dd
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        
        return `${yyyy}-${mm}-${dd}`;
      }
      
      // Handle other potential date formats
      if (formattedDate.includes('T')) {
        return formattedDate.split('T')[0];
      }
      
      return formattedDate;
    } catch (error) {
      console.error("Error parsing date:", error);
      return formattedDate;
    }
  }

  // Check user credentials
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username')
    
    if (!storedUsername) {
      window.location.href = '/login'
      return
    }

    setUsername(storedUsername)
    setIsAdmin(storedUsername.toLowerCase() === 'admin')
  }, [])

  // Fetch tasks from Google Sheets
  useEffect(() => {
    if (!username) return;

    const fetchTasksFromGoogleSheets = async () => {
      try {
        setIsLoading(true)
        
        const formData = new FormData()
        formData.append('action', 'fetchTasks')
        formData.append('sheetId', SHEET_ID)
        formData.append('sheetName', SHEET_NAME)
  
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          body: formData
        })
  
        const data = await response.json()
        
        if (data && data.success) {
          const colEIndex = 4;  // Username column
          const colLIndex = 11; // Date column
          const colMIndex = 12; // Completion column
          
          const colEId = data.headers[colEIndex]?.id || 'colE';
          const colLId = data.headers[colLIndex]?.id || 'colL';
          const colMId = data.headers[colMIndex]?.id || 'colM';
          
          // Hardcoded specific date for consistent testing
          const today = new Date('2025-04-15');
          const formatDateString = (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          }
          
          const todayString = formatDateString(today);
          
          console.log("Debug - Target Date:", todayString);
          console.log("Debug - Current Username:", username);
          console.log("Debug - Is Admin:", isAdmin);

          const filteredTasks = data.tasks
            .filter(task => {
              // For admin, show all tasks, otherwise filter by username
              if (isAdmin) return true;
              
              // Check if username in column E matches
              const taskUsername = task[colEId] ? task[colEId].toString().trim().toLowerCase() : '';
              const currentUsername = username.trim().toLowerCase();
              
              console.log("Debug - Task Username:", taskUsername);
              console.log("Debug - Current Username:", currentUsername);
              
              return taskUsername === currentUsername;
            })
            .filter(task => {
              // Verify column L matches today's date exactly
              const taskDate = task[colLId] ? parseFormattedDate(task[colLId]) : '';
              
              console.log("Debug - Raw Task Date:", task[colLId]);
              console.log("Debug - Parsed Task Date:", taskDate);
              console.log("Debug - Today's Date:", todayString);
              
              const isValidDate = taskDate === todayString;
              
              // Ensure column L is not null/empty
              const hasColL = task[colLId] !== undefined && 
                             task[colLId] !== null && 
                             task[colLId].toString().trim() !== '';
                             
              // Ensure column M is empty
              const isColMEmpty = task[colMId] === undefined || 
                                 task[colMId] === null || 
                                 task[colMId].toString().trim() === '';
              
              console.log("Debug - Date Filtering:", {
                taskDate, 
                todayString, 
                isValidDate, 
                hasColL, 
                isColMEmpty
              });
              
              return hasColL && isValidDate && isColMEmpty;
            })
            .map(task => {
              const filteredTask = { 
                _id: task._id, 
                _rowIndex: task._rowIndex,
                [colLId]: task[colLId],
                [colMId]: task[colMId]
              }
              
              data.headers.forEach(header => {
                filteredTask[header.id] = task[header.id]
              })
              
              return filteredTask
            })
          
          console.log("Debug - Filtered Tasks:", filteredTasks);
          
          const visibleHeaders = data.headers.filter((header, index) => 
            index >= 1 && index <= 10
          )
          
          setTableHeaders(visibleHeaders)
          setTasks(filteredTasks)
          
          setCurrentPage(1)
          setHasMoreTasks(filteredTasks.length > pageSize)
          
          const initialEditedTasks = {}
          filteredTasks.forEach(task => {
            initialEditedTasks[task._id] = { ...task }
          })
          setEditedTasks(initialEditedTasks)
        } else {
          console.error("Error fetching tasks:", data?.error || "Unknown error")
          setError(data?.error || "Failed to load tasks")
        }
      } catch (error) {
        console.error("Error fetching tasks:", error)
        setError("Network error or failed to fetch tasks")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTasksFromGoogleSheets()
  }, [username, isAdmin])

  // Pagination and filtering logic
  const filteredPaginatedTasks = tasks
    .filter((task) => {
      const statusHeader = tableHeaders.find(h => 
        h.label.toLowerCase().includes('status')
      )?.id

      const frequencyHeader = tableHeaders.find(h => 
        h.label.toLowerCase().includes('frequency')
      )?.id

      if (filterStatus !== "all" && 
          statusHeader && 
          task[statusHeader]?.toString().toLowerCase() !== filterStatus) {
        return false
      }

      if (filterFrequency !== "all" && 
          frequencyHeader && 
          task[frequencyHeader]?.toString().toLowerCase() !== filterFrequency) {
        return false
      }

      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        return Object.values(task).some(value => 
          value && value.toString().toLowerCase().includes(searchLower)
        )
      }

      return true
    })
    .slice(0, currentPage * pageSize)

  // Toggle task selection
  const toggleTaskSelection = (taskId) => {
    setSelectedTasks((prev) => {
      const newSelectedTasks = prev.includes(taskId) 
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId];

      // Reset or initialize column O value when task is selected/deselected
      setSelectedColumnValues(prevValues => {
        const newValues = {...prevValues};
        if (newSelectedTasks.includes(taskId)) {
          newValues[taskId] = ''; // Initialize as empty when selected
        } else {
          delete newValues[taskId]; // Remove when deselected
        }
        return newValues;
      });

      return newSelectedTasks;
    });
  }

  // Handle column O input change
  const handleColumnOChange = (taskId, value) => {
    setSelectedColumnValues(prev => ({
      ...prev,
      [taskId]: value
    }));
  }


  // Toggle all tasks selection
  const toggleAllTasks = () => {
    if (selectedTasks.length === filteredPaginatedTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(filteredPaginatedTasks.map((task) => task._id))
    }
  }

  // Logout handler
  const handleLogout = () => {
    sessionStorage.removeItem('username')
    window.location.href = '/login'
  }

  // Show toast message
  const showToast = (message, type) => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" })
    }, 3000)
  }

  // Handle task field editing
  const handleTaskEdit = (taskId, fieldId, value) => {
    setEditedTasks(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [fieldId]: value
      }
    }))
  }

  // Handle file selection
  const handleFileSelect = (taskId, event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFiles(prev => ({
        ...prev,
        [taskId]: file
      }))
      showToast(`File selected for task: ${file.name}`, "success")
      
      // Automatically trigger upload
      uploadFile(taskId, file)
    }
  }

  // Upload file method
  const uploadFile = async (taskId, file) => {
    if (!file) {
      showToast("No file selected", "error")
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1]
        
        const formData = new FormData()
        formData.append('action', 'uploadFile')
        formData.append('sheetName', SHEET_NAME)
        formData.append('taskId', taskId)
        formData.append('fileName', file.name)
        formData.append('fileData', base64Data)
        formData.append('rowIndex', tasks.find(t => t._id === taskId)._rowIndex)
        formData.append('columnP', 'P')
        formData.append('folderUrl', 'https://drive.google.com/drive/u/0/folders/1TBpIcv5bbAsmlje7lpnPFpJRDY5nekTE')
        
        try {
          const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
          })
          
          const result = await response.json()
          
          if (result.success) {
            showToast(`File uploaded successfully: ${file.name}`, "success")
          } else {
            throw new Error(result.error || "Failed to upload file")
          }
        } catch (err) {
          showToast("Failed to upload file", "error")
          console.error("Error uploading file:", err)
        }
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      showToast("An error occurred during file upload", "error")
      console.error("Error in upload process:", error)
    }
  }

  // Form submission handler
  const handleSubmit = async () => {
    if (selectedTasks.length === 0) {
      showToast("Please select at least one task", "error")
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare tasks to be updated
      const tasksToUpdate = selectedTasks.map(taskId => {
        const task = editedTasks[taskId]
        const updates = {}
        
        // Add all editable fields to updates with proper date formatting
        tableHeaders.forEach(header => {
          // Check if this is a date field
          if (header.label.toLowerCase().includes('date')) {
            // Ensure date is in yyyy-mm-dd format (no time component)
            const parsedDate = parseFormattedDate(task[header.id])
            updates[header.id] = parsedDate
          } else {
            updates[header.id] = task[header.id]
          }
        })
        
        // Add today's date to column M
        const today = new Date();
        const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        updates['colM'] = formattedToday;
        
        return {
          rowIndex: task._rowIndex,
          updates: updates
        }
      })

      // Create form data for batch update
      const formData = new FormData()
      formData.append('action', 'updateTasks')
      formData.append('sheetName', SHEET_NAME)
      formData.append('tasks', JSON.stringify(tasksToUpdate))

      // Make API call to update tasks
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            selectedTasks.includes(task._id) 
              ? { ...editedTasks[task._id] } 
              : task
          )
        )

        // Clear selected files for processed tasks
        const newSelectedFiles = { ...selectedFiles }
        selectedTasks.forEach(taskId => {
          delete newSelectedFiles[taskId]
        })
        setSelectedFiles(newSelectedFiles)

        // Reset selections
        setSelectedTasks([])

        showToast(`Successfully updated ${selectedTasks.length} tasks`, "success")
      } else {
        throw new Error(result.error || "Failed to update tasks")
      }
    } catch (error) {
      console.error("Error updating tasks:", error)
      showToast("An error occurred while updating tasks", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render loading state
  if (isLoading && currentPage === 1) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  // Render error state
  // Render error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Existing header and logout button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-purple-700">
          {isAdmin ? "All Tasks (Admin View)" : `My Tasks (${username})`}
        </h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

      {/* Existing search and filter section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-purple-700">All Tasks</h1>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedTasks.length === 0}
          className={`px-5 py-2 mt-4 md:mt-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-md shadow-md transition duration-200 ease-in-out ${
            isSubmitting || selectedTasks.length === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Processing..." : `Submit Selected Tasks (${selectedTasks.length})`}
        </button>
      </div>

      {/* Tasks table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Existing filter inputs */}
        <div className="flex flex-col md:flex-row gap-4 p-4 border-b">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={filterFrequency}
            onChange={(e) => setFilterFrequency(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Frequencies</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Tasks table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTasks.length === filteredPaginatedTasks.length && filteredPaginatedTasks.length > 0}
                    onChange={toggleAllTasks}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                </th>
                {tableHeaders.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header.label}
                  </th>
                ))}
                {/* New column O */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Column O
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upload Image
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPaginatedTasks.length > 0 ? (
                filteredPaginatedTasks.map((task, index) => (
                  <tr 
                    key={task._id} 
                    ref={index === filteredPaginatedTasks.length - 1 ? lastTaskElementRef : null}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task._id)}
                        onChange={() => toggleTaskSelection(task._id)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                    </td>
                    {tableHeaders.map((header) => (
                      <td key={header.id} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {/* Always show original value, regardless of selection */}
                        {header.label.toLowerCase().includes('date') 
                          ? formatDate(task[header.id]) 
                          : task[header.id] || '—'}
                      </td>
                    ))}
                    {/* Column O input */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {selectedTasks.includes(task._id) ? (
                        <input
                          type="text"
                          value={selectedColumnValues[task._id] || ''}
                          onChange={(e) => handleColumnOChange(task._id, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter value for Column O"
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    {/* Upload Image section */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          id={`file-${task._id}`}
                          onChange={(e) => handleFileSelect(task._id, e)}
                          className="hidden"
                          accept="image/*"
                          disabled={!selectedTasks.includes(task._id)}
                        />
                        <label
                          htmlFor={`file-${task._id}`}
                          className={`px-3 py-2 rounded cursor-pointer transition flex items-center justify-center ${
                            selectedTasks.includes(task._id)
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          Upload Image
                        </label>
                        {selectedFiles[task._id] && (
                          <span className="text-xs text-gray-500">
                            {selectedFiles[task._id].name.length > 15 
                              ? selectedFiles[task._id].name.substring(0, 15) + '...' 
                              : selectedFiles[task._id].name}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={tableHeaders.length + 3} className="px-6 py-4 text-center text-gray-500">
                    {searchQuery ? "No tasks found matching the search" : "No tasks found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Loading indicator for pagination */}
        {isLoading && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === "success"
            ? "bg-green-100 text-green-800 border-l-4 border-green-500"
            : "bg-red-100 text-red-800 border-l-4 border-red-500"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default AllTasks