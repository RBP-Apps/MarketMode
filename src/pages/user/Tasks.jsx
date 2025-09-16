"use client"

import { useState } from "react"

const UserTasks = () => {
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterFrequency, setFilterFrequency] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTasks, setSelectedTasks] = useState([])
  const [remarks, setRemarks] = useState({})
  const [selectedFiles, setSelectedFiles] = useState({})
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState({ show: false, message: "", type: "" })

  // Sample tasks data
  const tasks = [
    {
      id: 1,
      title: "Complete weekly report",
      description: "Prepare and submit the weekly progress report",
      dueDate: "2023-05-15",
      frequency: "weekly",
      completed: false,
      enableReminders: true,
      requireAttachment: true,
    },
    {
      id: 2,
      title: "Update inventory records",
      description: "Update the inventory records with the latest stock information",
      dueDate: "2023-05-18",
      frequency: "daily",
      completed: false,
      enableReminders: true,
      requireAttachment: false,
    },
    {
      id: 3,
      title: "Monthly equipment maintenance",
      description: "Perform routine maintenance checks on all equipment",
      dueDate: "2023-05-20",
      frequency: "monthly",
      completed: false,
      enableReminders: false,
      requireAttachment: true,
    },
    {
      id: 4,
      title: "Client follow-up calls",
      description: "Make follow-up calls to clients about recent orders",
      dueDate: "2023-05-16",
      frequency: "weekly",
      completed: false,
      enableReminders: true,
      requireAttachment: false,
    },
    {
      id: 5,
      title: "Daily safety inspection",
      description: "Conduct daily safety inspection of the work area",
      dueDate: "2023-05-17",
      frequency: "daily",
      completed: false,
      enableReminders: false,
      requireAttachment: true,
    },
  ]

  const [userTasks, setUserTasks] = useState(tasks)

  // Filter tasks based on the filter criteria
  const filteredTasks = userTasks.filter((task) => {
    // Filter by status
    if (filterStatus === "completed" && !task.completed) return false
    if (filterStatus === "pending" && task.completed) return false
    if (filterStatus === "overdue") {
      const dueDate = new Date(task.dueDate)
      const today = new Date()
      if (dueDate >= today || task.completed) return false
    }

    // Filter by frequency
    if (filterFrequency !== "all" && task.frequency !== filterFrequency) return false

    // Filter by search query
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !task.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    return true
  })

  const handleTaskSelection = (taskId) => {
    setSelectedTasks((prev) => {
      if (prev.includes(taskId)) {
        return prev.filter((id) => id !== taskId)
      } else {
        return [...prev, taskId]
      }
    })
  }

  const handleRemarksChange = (taskId, value) => {
    setRemarks((prev) => ({ ...prev, [taskId]: value }))
    // Clear error if user starts typing remarks
    if (errors[taskId]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[taskId]
        return newErrors
      })
    }
  }

  const handleFileChange = (taskId, e) => {
    const file = e.target.files?.[0] || null
    setSelectedFiles((prev) => ({ ...prev, [taskId]: file }))
    // Clear error if user selects a file
    if (errors[taskId]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[taskId]
        return newErrors
      })
    }
  }

  const showToast = (message, type) => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" })
    }, 3000)
  }

  const handleSubmitTasks = async () => {
    setIsSubmitting(true)
    const newErrors = {}

    // Validate selected tasks
    for (const taskId of selectedTasks) {
      const task = userTasks.find((t) => t.id === taskId)
      if (!task) continue

      // Check if attachment is required but not provided
      if (task.requireAttachment && !selectedFiles[taskId]) {
        newErrors[taskId] = "This task requires an attachment. Please upload a file."
      }
    }

    // If there are errors, show them and stop submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsSubmitting(false)
      showToast("Please fix the errors before submitting.", "error")
      return
    }

    try {
      // In a real app, you would make an API call to update the tasks
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update the local state
      setUserTasks((prev) =>
        prev.map((task) => (selectedTasks.includes(task.id) ? { ...task, completed: true } : task)),
      )

      // Clear selections and form data
      setSelectedTasks([])
      setRemarks({})
      setSelectedFiles({})
      setErrors({})

      showToast(`${selectedTasks.length} tasks have been marked as completed.`, "success")
    } catch (error) {
      showToast("There was an error submitting the tasks. Please try again.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold tracking-tight text-green-700 dark:text-green-400">My Tasks</h1>
        <button
          onClick={handleSubmitTasks}
          disabled={selectedTasks.length === 0 || isSubmitting}
          className="btn btn-primary bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
        >
          {isSubmitting ? "Submitting..." : `Complete ${selectedTasks.length} Selected Tasks`}
        </button>
      </div>

      <div className="card border-green-200 dark:border-green-800 shadow-md">
        <div className="card-header bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950">
          <h2 className="text-lg font-medium text-green-700 dark:text-green-300">Task Management</h2>
          <p className="text-sm text-green-600 dark:text-green-400">View, filter, and manage your assigned tasks</p>
        </div>
        <div className="card-body space-y-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 space-y-2">
              <label htmlFor="search" className="flex items-center text-green-700 dark:text-green-300">
                <i className="fas fa-search h-4 w-4 mr-2"></i>
                Search Tasks
              </label>
              <input
                id="search"
                placeholder="Search by task title or description"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input border-green-200 dark:border-green-800"
              />
            </div>
            <div className="space-y-2 md:w-[180px]">
              <label htmlFor="status-filter" className="flex items-center text-green-700 dark:text-green-300">
                <i className="fas fa-filter h-4 w-4 mr-2"></i>
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="select border-green-200 dark:border-green-800"
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="space-y-2 md:w-[180px]">
              <label htmlFor="frequency-filter" className="flex items-center text-green-700 dark:text-green-300">
                <i className="fas fa-filter h-4 w-4 mr-2"></i>
                Filter by Frequency
              </label>
              <select
                id="frequency-filter"
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value)}
                className="select border-green-200 dark:border-green-800"
              >
                <option value="all">All Frequencies</option>
                <option value="one-time">One Time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              <p>No tasks found matching your filters.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-700 dark:text-green-300">Task List</h3>
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`card ${task.completed ? "opacity-60" : ""} border-l-4 ${
                      task.completed
                        ? "border-l-green-500"
                        : selectedTasks.includes(task.id)
                          ? "border-l-blue-500"
                          : "border-l-gray-300"
                    } transition-all hover:shadow-md`}
                  >
                    <div className="p-4 pb-2 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 border-b border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            id={`task-${task.id}`}
                            type="checkbox"
                            checked={selectedTasks.includes(task.id) || task.completed}
                            onChange={() => !task.completed && handleTaskSelection(task.id)}
                            disabled={task.completed}
                            className="checkbox"
                          />
                          <h3
                            className={`text-lg text-green-700 dark:text-green-300 ${task.completed ? "line-through" : ""}`}
                          >
                            {task.title}
                          </h3>
                        </div>
                        <span className="badge badge-blue">
                          {task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400">Due: {task.dueDate}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {task.enableReminders && (
                          <span className="badge badge-blue">
                            <i className="fas fa-bell h-3 w-3 mr-1"></i> Reminders
                          </span>
                        )}
                        {task.requireAttachment && (
                          <span className="badge badge-yellow">
                            <i className="fas fa-paperclip h-3 w-3 mr-1"></i> Attachment Required
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-700 dark:text-green-300">Task Completion Form</h3>
                {selectedTasks.length === 0 ? (
                  <div className="card border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-6 text-center">
                    <p className="text-green-600 dark:text-green-400">Select tasks from the list to complete them.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTasks.map((taskId) => {
                      const task = userTasks.find((t) => t.id === taskId)
                      if (!task) return null

                      return (
                        <div key={taskId} className="card border-green-200 dark:border-green-800">
                          <div className="card-header bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950">
                            <h3 className="text-md text-green-700 dark:text-green-300">{task.title}</h3>
                          </div>
                          <div className="card-body space-y-4">
                            <div className="space-y-2">
                              <label
                                htmlFor={`remarks-${task.id}`}
                                className="block text-green-700 dark:text-green-300"
                              >
                                Remarks
                              </label>
                              <textarea
                                id={`remarks-${task.id}`}
                                placeholder="Add your remarks or comments here"
                                value={remarks[task.id] || ""}
                                onChange={(e) => handleRemarksChange(task.id, e.target.value)}
                                className="input border-green-200 dark:border-green-800"
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <label
                                htmlFor={`file-${task.id}`}
                                className={`block ${task.requireAttachment ? "text-amber-700 dark:text-amber-300 font-medium" : "text-green-700 dark:text-green-300"}`}
                              >
                                {task.requireAttachment ? "Upload Proof (Required)" : "Upload Proof (Optional)"}
                              </label>
                              <input
                                id={`file-${task.id}`}
                                type="file"
                                onChange={(e) => handleFileChange(task.id, e)}
                                className={`input ${
                                  task.requireAttachment
                                    ? "border-amber-300 dark:border-amber-700"
                                    : "border-green-200 dark:border-green-800"
                                }`}
                              />
                              {selectedFiles[task.id] && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  Selected file: {selectedFiles[task.id]?.name}
                                </p>
                              )}
                            </div>

                            {errors[task.id] && (
                              <div className="bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-md">
                                <div className="flex items-center">
                                  <i className="fas fa-exclamation-circle h-4 w-4 mr-2"></i>
                                  <h4 className="font-medium">Error</h4>
                                </div>
                                <p className="mt-1 ml-6">{errors[task.id]}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <button
                      onClick={handleSubmitTasks}
                      disabled={isSubmitting}
                      className="w-full btn btn-primary bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                    >
                      {isSubmitting ? "Submitting..." : `Complete ${selectedTasks.length} Selected Tasks`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast.show && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>{toast.message}</div>
      )}
    </div>
  )
}

export default UserTasks

