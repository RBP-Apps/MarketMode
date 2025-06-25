"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const LoginPage = () => {
  const navigate = useNavigate()
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [masterData, setMasterData] = useState({
    userCredentials: {}, // Object where keys are usernames and values are passwords
    userRoles: {} // Object where keys are usernames and values are roles
  })
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [toast, setToast] = useState({ show: false, message: "", type: "" })

  // Function to check if a role is any variation of "inactive"
  const isInactiveRole = (role) => {
    if (!role) return false;

    // Convert to lowercase
    const normalizedRole = String(role).toLowerCase().trim();

    // Check for different variations of "inactive" status
    return normalizedRole === "inactive" ||
      normalizedRole === "in active" ||
      normalizedRole === "inactiv" ||
      normalizedRole === "in activ";
  }

  // Fetch master data on component mount
  useEffect(() => {
    const fetchMasterData = async () => {
      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxR-N0y9pSElWscysbstP48Y8PDQ4-8mnFO_KkbDNP3nLt0rOsxcHa7jtqmKHuJRj6vdw/exec"

      try {
        setIsDataLoading(true)

        // Get the spreadsheet ID from your Apps Script
        const SPREADSHEET_ID = "101zBKPpsMtmBi36uCULsJoUgj_q7-0m1pjIXY5zmbP8"

        // Construct the URL to read the sheet data directly
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=master`

        const response = await fetch(sheetUrl)
        const text = await response.text()

        // Parse the Google Sheets JSON response
        const jsonString = text.substring(47).slice(0, -2) // Remove Google's wrapper
        const data = JSON.parse(jsonString)

        // Create userCredentials and userRoles objects from the sheet data
        const userCredentials = {}
        const userRoles = {}

        // Process the data rows (skip header row if it exists)
        if (data.table && data.table.rows) {
          console.log("Raw sheet data:", data.table.rows);

          // Start from index 1 to skip header row (adjust if needed)
          for (let i = 1; i < data.table.rows.length; i++) {
            const row = data.table.rows[i]

            // Extract data from columns C, D, E (indices 2, 3, 4)
            const username = row.c[2] ? String(row.c[2].v || '').trim().toLowerCase() : '';
            const password = row.c[3] ? String(row.c[3].v || '').trim() : '';
            const role = row.c[4] ? String(row.c[4].v || '').trim() : 'user';

            console.log(`Processing row ${i}: username=${username}, password=${password}, role=${role}`);

            // Only process if we have both username and password
            if (username && password && password.trim() !== '') {
              // Check if the role is any kind of inactive status
              if (isInactiveRole(role)) {
                console.log(`Skipping inactive user: ${username} with role: ${role}`);
                continue; // Skip this user
              }

              // Store normalized role for comparison
              const normalizedRole = role.toLowerCase();

              // Store in our maps
              userCredentials[username] = password;
              userRoles[username] = normalizedRole;

              console.log(`Added credential for: ${username}, Role: ${normalizedRole}`);
            }
          }
        }

        setMasterData({ userCredentials, userRoles })
        console.log("Loaded credentials from master sheet:", Object.keys(userCredentials).length)
        console.log("Credentials map:", userCredentials)
        console.log("Roles map:", userRoles)

        // Debug - check admin roles specifically
        const adminUsers = Object.entries(userRoles)
          .filter(([, role]) => role === 'admin')
          .map(([username]) => username);
        console.log("Admin users found:", adminUsers);

      } catch (error) {
        console.error("Error Fetching Master Data:", error)

        // Fallback: Try the alternative method using your Apps Script
        try {
          console.log("Trying alternative method...");
          const fallbackResponse = await fetch(SCRIPT_URL, {
            method: 'GET'
          })

          if (fallbackResponse.ok) {
            console.log("Apps Script is accessible, but getMasterData action needs to be implemented");
            showToast("Unable to load user data. Please contact administrator.", "error")
          }
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }

        showToast(`Network error: ${error.message}. Please try again later.`, "error")
      } finally {
        setIsDataLoading(false)
      }
    }

    fetchMasterData()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoginLoading(true)

    try {
      const trimmedUsername = formData.username.trim().toLowerCase()
      const trimmedPassword = formData.password.trim()

      console.log("Login Attempt Details:")
      console.log("Entered Username:", trimmedUsername)
      console.log("Entered Password:", trimmedPassword) // For debugging (remove in production)
      console.log("Available Credentials Count:", Object.keys(masterData.userCredentials).length)
      console.log("Current userCredentials:", masterData.userCredentials)
      console.log("Current userRoles:", masterData.userRoles)

      // Check if the username exists in our credentials map
      if (trimmedUsername in masterData.userCredentials) {
        const correctPassword = masterData.userCredentials[trimmedUsername]
        const userRole = masterData.userRoles[trimmedUsername]

        console.log("Found user in credentials map")
        console.log("Expected Password:", correctPassword)
        console.log("Password Match:", correctPassword === trimmedPassword)
        console.log("User Role:", userRole)

        // Check if password matches
        if (correctPassword === trimmedPassword) {
          // Store user info in sessionStorage
          sessionStorage.setItem('username', trimmedUsername)

          // Check if user is admin - explicitly compare with the string "admin"
          const isAdmin = userRole === "admin";
          console.log(`User ${trimmedUsername} is admin: ${isAdmin}`);

          // Set role based on the fetched role
          sessionStorage.setItem('role', isAdmin ? 'admin' : 'user')

          // For admin users, we don't want to restrict by department
          if (isAdmin) {
            sessionStorage.setItem('department', 'all') // Admin sees all departments
            sessionStorage.setItem('isAdmin', 'true') // Additional flag to ensure admin permissions
            console.log("ADMIN LOGIN - Setting full access permissions");
          } else {
            sessionStorage.setItem('department', trimmedUsername)
            sessionStorage.setItem('isAdmin', 'false')
            console.log("USER LOGIN - Setting restricted access");
          }

          // Navigate to dashboard
          navigate("/dashboard/admin")

          showToast(`Login successful. Welcome, ${trimmedUsername}!`, "success")
          return
        } else {
          showToast("Username or password is incorrect. Please try again.", "error")
        }
      } else {
        showToast("Username or password is incorrect. Please try again.", "error")
      }

      // If we got here, login failed
      console.error("Login Failed", {
        usernameExists: trimmedUsername in masterData.userCredentials,
        passwordMatch: (trimmedUsername in masterData.userCredentials) ?
          "Password did not match" : 'Username not found',
        userRole: masterData.userRoles[trimmedUsername] || 'No role'
      })
    } catch (error) {
      console.error("Login Error:", error)
      showToast(`Login failed: ${error.message}. Please try again.`, "error")
    } finally {
      setIsLoginLoading(false)
    }
  }

  const showToast = (message, type) => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" })
    }, 5000) // Toast duration
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-md shadow-lg border border-blue-200 rounded-lg bg-white">
        <div className="space-y-1 p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-t-lg">
          <div className="flex items-center justify-center mb-2">
            <i className="fas fa-clipboard-list h-8 w-8 text-blue-600 mr-2"></i>
            <h2 className="text-2xl font-bold text-blue-700">Checklist & Delegation</h2>
          </div>
          <p className="text-center text-blue-600">Login to access your tasks and delegations</p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="flex items-center text-blue-700">
              <i className="fas fa-user h-4 w-4 mr-2"></i>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter your username"
              required
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="flex items-center text-blue-700">
              <i className="fas fa-key h-4 w-4 mr-2"></i>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 -mx-4 -mb-4 mt-4 rounded-b-lg">
            <button
              type="submit"
              className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-md font-medium disabled:opacity-50"
              disabled={isLoginLoading || isDataLoading}
            >
              {isLoginLoading ? "Logging in..." : isDataLoading ? "Loading..." : "Login"}
            </button>
          </div>
        </form>
        <div className="fixed left-0 right-0 bottom-0 py-1 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center text-sm shadow-md z-10">
          <a
            href="https://www.botivate.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Powered by-<span className="font-semibold">Botivate</span>
          </a>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === "success"
          ? "bg-green-100 text-green-800 border-l-4 border-green-500"
          : "bg-red-100 text-red-800 border-l-4 border-red-500"
          }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default LoginPage