"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, Upload, Loader2, FileText, ListChecks, Calendar, Clock } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyg2JZ0lnX2lhsVcjHHOQUb29QH9jX8rNMWMU-uEAi3PHjrQ-sOb6FoO3Lx6gZT6h4W/exec",
    DRIVE_FOLDER_ID: "1bHOWG-zPUelUXkwowTT2W8NLauU_gpf6",
    SOURCE_SHEET_NAME: "FMS",
    PAGE_CONFIG: {
        title: "Module Entry",
        historyTitle: "Module Entry History",
        description: "Upload CSV file for module entry",
        historyDescription: "View completed module entry uploads",
    },
    COLUMNS: {
        ACTUAL_TIMESTAMP: 176, // FU
        FILE_URL: 178, // FW
    }
}

// Debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value)
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(handler)
    }, [value, delay])
    return debouncedValue
}

function ModuleEntryPage() {
    const [pendingData, setPendingData] = useState([])
    const [historyData, setHistoryData] = useState([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showHistory, setShowHistory] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState(null)
    const [csvFile, setCsvFile] = useState(null)

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

    const formatDisplayTimestamp = useCallback((rawTimestamp) => {
        if (!rawTimestamp) return { date: "—", time: "" }
        try {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            const str = rawTimestamp.toString().trim()
            // Handle "DD/MM/YYYY HH:MM:SS" format
            const parts = str.split(" ")
            const dateParts = parts[0]?.split("/")
            if (dateParts && dateParts.length === 3) {
                const day = parseInt(dateParts[0], 10)
                const monthIndex = parseInt(dateParts[1], 10) - 1
                const year = dateParts[2]
                const timePart = parts[1] || ""
                let timeDisplay = ""
                if (timePart) {
                    const [h, m] = timePart.split(":")
                    const hour = parseInt(h, 10)
                    const ampm = hour >= 12 ? "PM" : "AM"
                    const hour12 = hour % 12 || 12
                    timeDisplay = `${hour12.toString().padStart(2, "0")}:${m} ${ampm}`
                }
                return { date: `${day} ${months[monthIndex]} ${year}`, time: timeDisplay }
            }
            // Fallback: try parsing as a JS Date
            const d = new Date(str)
            if (!isNaN(d.getTime())) {
                const day = d.getDate()
                const month = months[d.getMonth()]
                const year = d.getFullYear()
                const hour = d.getHours()
                const ampm = hour >= 12 ? "PM" : "AM"
                const hour12 = hour % 12 || 12
                const mins = d.getMinutes().toString().padStart(2, "0")
                return { date: `${day} ${month} ${year}`, time: `${hour12.toString().padStart(2, "0")}:${mins} ${ampm}` }
            }
            return { date: str, time: "" }
        } catch {
            return { date: rawTimestamp.toString(), time: "" }
        }
    }, [])

    const isEmpty = useCallback((value) => !value || (typeof value === "string" && value.trim() === ""), [])

    const fetchSheetData = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SOURCE_SHEET_NAME}&action=fetch`)
            const data = await response.json()
            const rows = data.table?.rows || data.values || []
            const pending = []
            const history = []

            rows.forEach((row, rowIndex) => {
                if (rowIndex < 6) return
                const vals = row.c ? row.c.map(cell => cell?.v || "") : row
                const enquiry = vals[1] || ""
                if (isEmpty(enquiry)) return

                const actual = vals[CONFIG.COLUMNS.ACTUAL_TIMESTAMP] || ""
                const fileUrl = vals[CONFIG.COLUMNS.FILE_URL] || ""

                const rowData = {
                    _id: `mod_${enquiry}_${rowIndex + 1}`,
                    _rowIndex: rowIndex + 1,
                    enquiryNumber: enquiry,
                    beneficiaryName: vals[2] || "",
                    actual: actual,
                    fileUrl: fileUrl
                }

                if (!isEmpty(actual)) {
                    history.push(rowData)
                } else {
                    pending.push(rowData)
                }
            })

            const sortByEnquiry = (a, b) => a.enquiryNumber.localeCompare(b.enquiryNumber, undefined, { numeric: true, sensitivity: 'base' })
            setPendingData(pending.sort(sortByEnquiry))
            setHistoryData(history.sort(sortByEnquiry))
        } catch (e) {
            console.error("Fetch error:", e)
            setError("Failed to load Module Entry data")
        } finally {
            setLoading(false)
        }
    }, [isEmpty])

    useEffect(() => { fetchSheetData() }, [fetchSheetData])

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(""), 4000)
            return () => clearTimeout(timer)
        }
    }, [successMessage])

    const filteredData = useMemo(() => {
        const data = showHistory ? historyData : pendingData
        return debouncedSearchTerm
            ? data.filter(r => Object.values(r).some(v => v?.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase())))
            : data
    }, [showHistory, pendingData, historyData, debouncedSearchTerm])

    const fileToBase64 = useCallback((file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result)
            reader.onerror = (error) => reject(error)
        })
    }, [])

    const uploadFileToDrive = useCallback(async (file) => {
        try {
            const base64Data = await fileToBase64(file)
            const formData = new FormData()
            formData.append("action", "uploadFile")
            formData.append("base64Data", base64Data)
            formData.append("fileName", `${selectedRecord.enquiryNumber}_ModuleEntry_${Date.now()}.csv`)
            formData.append("mimeType", "text/csv")
            formData.append("folderId", CONFIG.DRIVE_FOLDER_ID)

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                body: formData,
            })

            const result = await response.json()
            if (result.success) {
                return result.fileUrl
            } else {
                throw new Error(result.error || "Failed to upload file")
            }
        } catch (error) {
            console.error("Upload error:", error)
            throw error
        }
    }, [selectedRecord, fileToBase64])

    const handleActionClick = useCallback((record) => {
        setSelectedRecord(record)
        setCsvFile(null)
        setShowModal(true)
    }, [])

    const handleModalSubmit = async () => {
        if (!csvFile) {
            alert("Please select a CSV file to upload")
            return
        }

        setIsSubmitting(true)
        try {
            const fileUrl = await uploadFileToDrive(csvFile)
            const timestamp = formatTimestamp()

            const rowData = Array(CONFIG.COLUMNS.FILE_URL + 1).fill(null)
            rowData[CONFIG.COLUMNS.ACTUAL_TIMESTAMP] = timestamp // FU
            rowData[CONFIG.COLUMNS.FILE_URL] = fileUrl // FW

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    action: "update",
                    sheetName: CONFIG.SOURCE_SHEET_NAME,
                    rowIndex: selectedRecord._rowIndex,
                    rowData: JSON.stringify(rowData)
                })
            })

            const result = await response.json()
            if (result.success) {
                setSuccessMessage("Module entry CSV uploaded successfully")
                setShowModal(false)
                fetchSheetData()
            } else {
                throw new Error(result.error || "Update failed")
            }
        } catch (e) {
            alert("Submission failed: " + e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <AdminLayout>
            <div className="space-y-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <h1 className="text-xl font-bold tracking-tight text-blue-700">{CONFIG.PAGE_CONFIG.title}</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder={showHistory ? "Search history..." : "Search pending..."}
                            className="pl-9 pr-4 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64 shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex space-x-2 border-b border-gray-200">
                    <button
                        onClick={() => setShowHistory(false)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${!showHistory
                            ? "border-blue-500 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                    >
                        Pending Entries ({pendingData.length})
                    </button>
                    <button
                        onClick={() => setShowHistory(true)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${showHistory
                            ? "border-blue-500 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                    >
                        Entry History ({historyData.length})
                    </button>
                </div>

                {successMessage && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex justify-between items-center shadow-sm">
                        <span className="flex items-center"><CheckCircle2 size={16} className="mr-2" /> {successMessage}</span>
                        <X onClick={() => setSuccessMessage("")} size={16} className="cursor-pointer hover:text-green-900" />
                    </div>
                )}

                <div className="bg-white border border-blue-100 rounded-lg shadow-sm overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/80 text-gray-700 uppercase text-[11px] tracking-wider font-black border-b">
                                <tr>
                                    <th className="px-3 py-4">Action</th>
                                    <th className="px-3 py-4 font-bold">Enquiry No</th>
                                    <th className="px-3 py-4 font-bold">Beneficiary</th>
                                    {showHistory && <th className="px-3 py-4 font-bold">Uploaded Date</th>}
                                    {showHistory && <th className="px-3 py-4 font-bold">CSV File</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={showHistory ? 5 : 3} className="p-20 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                                                <p className="text-blue-900 font-bold">Loading Data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={showHistory ? 5 : 3} className="p-12 text-center text-gray-500">
                                            No module entry records found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map(r => (
                                        <tr key={r._id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleActionClick(r)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-1.5 px-3 rounded shadow-sm flex items-center"
                                                >
                                                    <Upload size={12} className="mr-1.5" />
                                                    {showHistory ? "UPDATE CSV" : "UPLOAD CSV"}
                                                </button>
                                            </td>
                                            <td className="px-3 py-4 font-bold text-blue-800 whitespace-nowrap text-xs">{r.enquiryNumber}</td>
                                            <td className="px-3 py-4 text-gray-900 font-bold text-xs whitespace-nowrap">{r.beneficiaryName}</td>
                                            {showHistory && (() => {
                                                const ts = formatDisplayTimestamp(r.actual)
                                                return (
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800">
                                                                <Calendar size={12} className="text-blue-500" />
                                                                {ts.date}
                                                            </span>
                                                            {ts.time && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                                                                    <Clock size={11} className="text-gray-400" />
                                                                    {ts.time}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )
                                            })()}
                                            {showHistory && (
                                                <td className="px-3 py-4 text-xs whitespace-nowrap">
                                                    {r.fileUrl ? (
                                                        <a
                                                            href={r.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold py-1 px-2.5 rounded border border-green-200 transition-colors"
                                                        >
                                                            <FileText size={12} />
                                                            View CSV
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No file</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Module Entry Upload</h3>
                                <p className="text-xs text-gray-400">Enquiry: {selectedRecord?.enquiryNumber}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-blue-100 rounded-xl p-8 hover:border-blue-300 transition-colors cursor-pointer bg-blue-50/10 group">
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    id="csvUpload"
                                    onChange={(e) => setCsvFile(e.target.files[0])}
                                />
                                <label htmlFor="csvUpload" className="w-full h-full flex flex-col items-center cursor-pointer">
                                    {csvFile ? (
                                        <div className="flex flex-col items-center space-y-2">
                                            <FileText className="h-12 w-12 text-blue-600" />
                                            <p className="text-sm font-bold text-gray-700">{csvFile.name}</p>
                                            <p className="text-xs text-blue-400">{(csvFile.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center space-y-2">
                                            <Upload className="h-12 w-12 text-gray-300 group-hover:text-blue-400" />
                                            <p className="text-sm font-bold text-gray-400 group-hover:text-blue-600">Select CSV File</p>
                                            <p className="text-[10px] text-gray-300 uppercase">Only .csv files allowed</p>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex space-x-4">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
                                DISCARD
                            </button>
                            <button
                                onClick={handleModalSubmit}
                                disabled={isSubmitting || !csvFile}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-200 flex items-center justify-center transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                        UPLOADING...
                                    </>
                                ) : (
                                    "SUBMIT MODULE CSV"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}

export default ModuleEntryPage
