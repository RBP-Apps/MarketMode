"use client"

import { useState } from "react"
import { Link } from "react-router-dom"

const UserDashboard = () => {
  const [taskView, setTaskView] = useState("recent")
  const [activeTab, setActiveTab] = useState("tasks")

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold tracking-tight text-green-700 dark:text-green-400">My Dashboard</h1>
        <Link
          to="/user/tasks"
          className="btn btn-primary bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
        >
          View All Tasks
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-all">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-tr-lg p-4 border-b border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Tasks</h3>
            <i className="fas fa-clipboard-list h-4 w-4 text-blue-500"></i>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">24</div>
            <p className="text-xs text-blue-600 dark:text-blue-400">Assigned to you</p>
          </div>
        </div>

        <div className="card border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-all">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-tr-lg p-4 border-b border-green-200 dark:border-green-800">
            <h3 className="text-sm font-medium text-green-700 dark:text-green-300">Completed</h3>
            <i className="fas fa-check-circle h-4 w-4 text-green-500"></i>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">18</div>
            <p className="text-xs text-green-600 dark:text-green-400">75% completion rate</p>
          </div>
        </div>

        <div className="card border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-all">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 rounded-tr-lg p-4 border-b border-amber-200 dark:border-amber-800">
            <h3 className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending</h3>
            <i className="fas fa-clock h-4 w-4 text-amber-500"></i>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">5</div>
            <p className="text-xs text-amber-600 dark:text-amber-400">Tasks to be completed</p>
          </div>
        </div>

        <div className="card border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-all">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-tr-lg p-4 border-b border-red-200 dark:border-red-800">
            <h3 className="text-sm font-medium text-red-700 dark:text-red-300">Overdue</h3>
            <i className="fas fa-exclamation-triangle h-4 w-4 text-red-500"></i>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-red-700 dark:text-red-300">1</div>
            <p className="text-xs text-red-600 dark:text-red-400">Requires immediate attention</p>
          </div>
        </div>
      </div>

      {/* Task Navigation Tabs */}
      <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-3">
          <button
            className={`py-3 text-center font-medium transition-colors ${
              taskView === "recent"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
            onClick={() => setTaskView("recent")}
          >
            Recent Tasks
          </button>
          <button
            className={`py-3 text-center font-medium transition-colors ${
              taskView === "upcoming"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
            onClick={() => setTaskView("upcoming")}
          >
            Upcoming Tasks
          </button>
          <button
            className={`py-3 text-center font-medium transition-colors ${
              taskView === "overdue"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
            onClick={() => setTaskView("overdue")}
          >
            Overdue Tasks
          </button>
        </div>

        <div className="p-4">
          {taskView === "recent" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-green-700 dark:text-green-300">Recently Assigned Tasks</h3>
              <TasksList filter="recent" />
            </div>
          )}

          {taskView === "upcoming" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300">Upcoming Tasks</h3>
              <TasksList filter="upcoming" />
            </div>
          )}

          {taskView === "overdue" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-red-700 dark:text-red-300">Overdue Tasks</h3>
              <TasksList filter="overdue" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "tasks"
                ? "border-b-2 border-green-600 text-green-600 dark:text-green-400"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("tasks")}
          >
            My Tasks
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "overview"
                ? "border-b-2 border-green-600 text-green-600 dark:text-green-400"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
        </div>

        {activeTab === "tasks" && (
          <div className="card border-green-200 dark:border-green-800 shadow-md">
            <div className="card-header bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950">
              <h3 className="text-lg font-medium text-green-700 dark:text-green-300">Pending Tasks</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Tasks that require your attention</p>
            </div>
            <div className="card-body">
              <TasksList />
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="card border-green-200 dark:border-green-800 shadow-md">
            <div className="card-header bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950">
              <h3 className="text-lg font-medium text-green-700 dark:text-green-300">Task Completion</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Your task completion over time</p>
            </div>
            <div className="card-body">
              <div className="h-[350px] w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
                <p className="text-gray-500 dark:text-gray-400">Task completion chart would be displayed here</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Simple TasksList component
const TasksList = ({ filter }) => {
  const tasks = [
    {
      id: 1,
      title: "Complete weekly report",
      description: "Prepare and submit the weekly progress report",
      dueDate: "2023-05-15",
      frequency: "weekly",
      completed: false,
    },
    {
      id: 2,
      title: "Update inventory records",
      description: "Update the inventory records with the latest stock information",
      dueDate: "2023-05-18",
      frequency: "daily",
      completed: false,
    },
    {
      id: 3,
      title: "Monthly equipment maintenance",
      description: "Perform routine maintenance checks on all equipment",
      dueDate: "2023-05-20",
      frequency: "monthly",
      completed: false,
    },
  ]

  // Filter tasks based on the filter prop
  const filteredTasks = filter
    ? tasks.filter((task) => {
        if (filter === "recent") return true // Show all for demo
        if (filter === "upcoming") return !task.completed
        if (filter === "overdue") return false // No overdue tasks in this demo
        return true
      })
    : tasks

  return (
    <div className="space-y-4">
      {filteredTasks.length === 0 ? (
        <div className="text-center p-8 text-gray-500 dark:text-gray-400">
          <p>No tasks found.</p>
        </div>
      ) : (
        filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`card ${task.completed ? "opacity-60" : ""} border-l-4 ${
              task.completed ? "border-l-green-500" : "border-l-blue-500"
            } transition-all hover:shadow-md`}
          >
            <div className="p-4 pb-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-b border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`task-${task.id}`}
                    checked={task.completed}
                    className="checkbox"
                    readOnly
                  />
                  <h3 className={`text-lg text-blue-700 dark:text-blue-300 ${task.completed ? "line-through" : ""}`}>
                    {task.title}
                  </h3>
                </div>
                <span className="badge badge-blue">
                  {task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1)}
                </span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">Due: {task.dueDate}</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default UserDashboard

