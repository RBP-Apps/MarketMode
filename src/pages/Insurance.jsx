"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, CreditCard, Calendar, Wrench, ShieldCheck, Loader2 } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
    SHEET_ID: "1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4",
    SOURCE_SHEET_NAME: "FMS",
    DROPDOWN_SHEET_NAME: "Drop-Down Value",
    PAGE_CONFIG: {
        title: "Insurance",
        historyTitle: "Insurance History",
        description: "Manage pending insurance records",
        historyDescription: "View completed insurance records",
    },
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

function InsurancePage() {
    const [pendingData, setPendingData] = useState([])
    const [historyData, setHistoryData] = useState([])
    const [dropdownOptions, setDropdownOptions] = useState([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showHistory, setShowHistory] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")
    const [selectedRows, setSelectedRows] = useState({})
    const [statusValues, setStatusValues] = useState({})
    const [dateValues, setDateValues] = useState({})
    const [remarksValues, setRemarksValues] = useState({})
    const [showModal, setShowModal] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState(null)
    const [form, setForm] = useState({
        status: "",
        date: "",
        remarks: "",
        fieldName: "",
        companyName: "",
        premiumAmount: "",
        policyNo: "",
        policyPeriod: "",
        aadharCard: false,
        taxInvoice: false,
        addressProof: false,
        commission: false,
        certificate: false
    })

    const debouncedSearchTerm = useDebounce(searchTerm, 300)

    const formatTimestamp = useCallback(() => {
        const now = new Date()
        return `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
    }, [])

    const formatDate = useCallback((dateString) => {
        if (!dateString) return ""
        if (typeof dateString === "string" && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateString
        const date = new Date(dateString)
        if (isNaN(date.getTime()) || date.getFullYear() === 1970) return ""
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
    }, [])

    const formatDateForInput = useCallback((dateString) => {
        if (!dateString) return ""
        const str = String(dateString)
        if (str.includes("/")) {
            const [day, month, year] = str.split("/")
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        }
        return str
    }, [])

    const isEmpty = useCallback((value) => !value || (typeof value === "string" && value.trim() === ""), [])

    const fetchDropdownOptions = useCallback(async () => {
        try {
            const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.DROPDOWN_SHEET_NAME}&action=fetch`)
            const data = await response.json()
            const rows = data.table?.rows || data || []
            const options = []
            rows.forEach((row, idx) => {
                if (idx >= 1) {
                    const val = row.c ? row.c[7]?.v : row[7]
                    if (!isEmpty(val)) options.push(val.toString())
                }
            })
            setDropdownOptions(options)
        } catch (e) {
            console.error("Dropdown fetch error:", e)
        }
    }, [isEmpty])

    const fetchSheetData = useCallback(async () => {
        try {
            setLoading(true)
            await fetchDropdownOptions()
            const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SOURCE_SHEET_NAME}&action=fetch`)
            const data = await response.json()
            const rows = data.table?.rows || data || []
            const pending = []
            const history = []

            rows.forEach((row, rowIndex) => {
                if (rowIndex < 6) return
                const vals = row.c ? row.c.map(cell => cell?.v || "") : row
                const enquiry = vals[1] || ""
                if (isEmpty(enquiry)) return

                const status = vals[131] || "" // Custom index for Insurance Status
                const actual = vals[162] || "" // Custom index for Actual/Done Timestamp (FG)
                const isReady = vals[161] || "" // Column FF (Ready Trigger)

                const rowData = {
                    _id: `enq_${enquiry}_${rowIndex + 1}`,
                    _rowIndex: rowIndex + 1,
                    enquiryNumber: enquiry,
                    beneficiaryName: vals[2] || "",
                    address: vals[3] || "",
                    contactNumber: vals[6] || "",
                    insuranceStatus: status,
                    insuranceDate: formatDate(vals[168] || ""), // FM
                    remarks: vals[134] || "",
                    fieldName: vals[164] || "", // FI
                    companyName: vals[165] || "", // FJ
                    premiumAmount: vals[166] || "", // FK
                    policyNo: vals[167] || "", // FL
                    policyPeriod: vals[169] || "", // FN
                    aadharCard: vals[170] === "OK", // FO
                    taxInvoice: vals[171] === "OK", // FP
                    addressProof: vals[172] === "OK", // FQ
                    commission: vals[173] === "OK", // FR
                    certificate: vals[174] === "OK", // FS
                    actual: actual,
                    planned: formatDate(vals[130] || "") // EA (Planned)
                }

                if (!isEmpty(actual) && !isEmpty(isReady)) {
                    history.push(rowData)
                } else if (isEmpty(actual) && !isEmpty(isReady)) {
                    pending.push(rowData)
                }
            })

            setPendingData(pending)
            setHistoryData(history)
        } catch (e) {
            setError("Failed to load Insurance data")
        } finally {
            setLoading(false)
        }
    }, [isEmpty, fetchDropdownOptions, formatDate])

    useEffect(() => { fetchSheetData() }, [fetchSheetData])

    useEffect(() => {
        const s = {}, d = {}, r = {}
        const all = [...pendingData, ...historyData]
        all.forEach(rec => {
            if (rec.insuranceStatus) s[rec._id] = rec.insuranceStatus
            if (rec.insuranceDate) d[rec._id] = formatDateForInput(rec.insuranceDate)
            if (rec.remarks) r[rec._id] = rec.remarks
        })
        setStatusValues(s); setDateValues(d); setRemarksValues(r)
    }, [pendingData, historyData, formatDateForInput])

    const filteredData = useMemo(() => {
        const data = showHistory ? historyData : pendingData
        return debouncedSearchTerm
            ? data.filter(r => Object.values(r).some(v => v?.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase())))
            : data
    }, [showHistory, pendingData, historyData, debouncedSearchTerm])

    const handleRowSelection = (id, checked) => setSelectedRows(prev => ({ ...prev, [id]: checked }))

    const handleStatusChange = (id, status) => {
        setStatusValues(prev => ({ ...prev, [id]: status }))
        if (status !== "Done") setDateValues(prev => ({ ...prev, [id]: "" }))
    }

    const handleSubmit = async () => {
        const ids = Object.keys(selectedRows).filter(id => selectedRows[id])
        if (ids.length === 0) return alert("Select records first")

        setIsSubmitting(true)
        try {
            const updates = ids.map(async id => {
                const rec = [...pendingData, ...historyData].find(r => r._id === id)
                const status = statusValues[id]
                const rowData = Array(150).fill(null)
                rowData[131] = status
                rowData[133] = dateValues[id] ? formatDate(dateValues[id]) : ""
                rowData[134] = remarksValues[id] || ""
                rowData[132] = status === "Done" ? formatTimestamp() : ""

                const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        action: "update",
                        sheetName: CONFIG.SOURCE_SHEET_NAME,
                        rowIndex: rec._rowIndex,
                        rowData: JSON.stringify(rowData)
                    })
                })
                return response.json()
            })

            await Promise.all(updates)
            setSuccessMessage("Insurance records updated successfully")
            fetchSheetData()
            setSelectedRows({})
        } catch (e) {
            alert("Submission failed")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEditClick = useCallback((record) => {
        setSelectedRecord(record)
        setForm({
            status: record.insuranceStatus || "Select",
            date: formatDateForInput(record.insuranceDate || ""),
            remarks: record.remarks || "",
            fieldName: record.fieldName || "",
            companyName: record.companyName || "",
            premiumAmount: record.premiumAmount || "",
            policyNo: record.policyNo || "",
            policyPeriod: record.policyPeriod || "",
            aadharCard: record.aadharCard || false,
            taxInvoice: record.taxInvoice || false,
            addressProof: record.addressProof || false,
            commission: record.commission || false,
            certificate: record.certificate || false
        })
        setShowModal(true)
    }, [formatDateForInput])

    const handleModalSubmit = async () => {
        setIsSubmitting(true)
        try {
            // Default status to "Done" as this is a completion form
            const status = "Done"
            const rowIndex = selectedRecord._rowIndex
            const rowData = Array(200).fill(null)
            rowData[131] = status
            rowData[134] = form.remarks || ""
            rowData[162] = formatTimestamp() // FG (Actual Timestamp)
            rowData[164] = form.fieldName || "" // FI
            rowData[165] = form.companyName || "" // FJ
            rowData[166] = form.premiumAmount || "" // FK
            rowData[167] = form.policyNo || "" // FL
            rowData[168] = form.date ? formatDate(form.date) : "" // FM
            rowData[169] = form.policyPeriod || "" // FN
            rowData[170] = form.aadharCard ? "OK" : "" // FO
            rowData[171] = form.taxInvoice ? "OK" : "" // FP
            rowData[172] = form.addressProof ? "OK" : "" // FQ
            rowData[173] = form.commission ? "OK" : "" // FR
            rowData[174] = form.certificate ? "OK" : "" // FS

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    action: "update",
                    sheetName: CONFIG.SOURCE_SHEET_NAME,
                    rowIndex: rowIndex,
                    rowData: JSON.stringify(rowData)
                })
            })
            const result = await response.json()
            if (result.success) {
                setSuccessMessage("Insurance record updated successfully")
                setShowModal(false)
                fetchSheetData()
            } else {
                throw new Error(result.error)
            }
        } catch (e) {
            alert("Update failed: " + e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <AdminLayout>
            <div className="space-y-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <h1 className="text-xl font-bold tracking-tight text-blue-700">{CONFIG.PAGE_CONFIG.title}</h1>
                    <div className="flex space-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder={showHistory ? "Search history..." : "Search pending insurance..."}
                                className="pl-9 pr-4 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64 shadow-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex space-x-2 border-b border-gray-200">
                    <button
                        onClick={() => setShowHistory(false)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${!showHistory
                            ? "border-blue-500 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                    >
                        <div className="flex items-center">
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Pending Insurance ({pendingData.length})
                        </div>
                    </button>
                    <button
                        onClick={() => setShowHistory(true)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${showHistory
                            ? "border-blue-500 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                    >
                        <div className="flex items-center">
                            <History className="h-4 w-4 mr-2" />
                            Insurance History ({historyData.length})
                        </div>
                    </button>
                </div>

                {successMessage && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex justify-between items-center shadow-sm animate-in fade-in slide-in-from-top-2">
                        <span className="flex items-center"><CheckCircle2 size={16} className="mr-2" /> {successMessage}</span>
                        <X onClick={() => setSuccessMessage("")} size={16} className="cursor-pointer hover:text-green-900" />
                    </div>
                )}

                {/* Bulk update UI hidden as checkboxes are removed */}
                {Object.values(selectedRows).some(Boolean) && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-md flex justify-between items-center shadow-sm">
                        <span className="text-sm font-medium text-blue-700">{Object.values(selectedRows).filter(Boolean).length} record(s) selected for bulk update</span>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-all flex items-center shadow-md hover:shadow-lg disabled:opacity-50">
                            {isSubmitting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" /> : <CreditCard size={16} className="mr-2" />}
                            Bulk Submit
                        </button>
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
                                    <th className="px-3 py-4 font-bold">Field Name</th>
                                    <th className="px-3 py-4 font-bold">Company</th>
                                    <th className="px-3 py-4 font-bold text-right">Premium</th>
                                    <th className="px-3 py-4 font-bold">Policy No</th>
                                    <th className="px-3 py-4 font-bold">Date(Issue)</th>
                                    <th className="px-3 py-4 font-bold">Period</th>
                                    <th className="px-3 py-4 font-bold text-center">Aadhar</th>
                                    <th className="px-3 py-4 font-bold text-center">Invoice</th>
                                    <th className="px-3 py-4 font-bold text-center">Address</th>
                                    <th className="px-3 py-4 font-bold text-center">Commission</th>
                                    <th className="px-3 py-4 font-bold text-center">Certificate</th>

                                </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={showHistory ? 14 : 15} className="p-20 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <div className="relative">
                                                    <div className="h-12 w-12 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin"></div>
                                                    <Loader2 className="h-6 w-6 text-blue-600 absolute inset-0 m-auto animate-pulse" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-blue-900 font-bold text-base">Loading Data</p>
                                                    <p className="text-blue-400 text-xs animate-pulse">Syncing with Google Sheets...</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr><td colSpan={showHistory ? 14 : 15} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Search size={32} className="text-gray-300 mb-2" />
                                            No insurance records found
                                        </div>
                                    </td></tr>
                                ) : (
                                    filteredData.map(r => (
                                        <tr key={r._id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleEditClick(r)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-1.5 px-3 rounded shadow-sm hover:shadow transition-all flex items-center"
                                                >
                                                    <Eye size={12} className="mr-1.5" />
                                                    ACTION
                                                </button>
                                            </td>
                                            <td className="px-3 py-4 font-bold text-blue-800 whitespace-nowrap text-xs">{r.enquiryNumber}</td>
                                            <td className="px-3 py-4 text-gray-900 font-bold text-xs whitespace-nowrap">{r.beneficiaryName}</td>
                                            <td className="px-3 py-4 text-gray-800 font-bold text-xs whitespace-nowrap">{r.fieldName || "---"}</td>
                                            <td className="px-3 py-4 text-gray-800 font-bold text-xs whitespace-nowrap">{r.companyName || "---"}</td>
                                            <td className="px-3 py-4 text-gray-900 font-bold text-xs font-mono text-right whitespace-nowrap">
                                                {r.premiumAmount ? `₹${parseFloat(r.premiumAmount).toLocaleString()}` : "---"}
                                            </td>
                                            <td className="px-3 py-4 text-gray-800 font-bold text-xs font-mono whitespace-nowrap">{r.policyNo || "---"}</td>
                                            <td className="px-3 py-4 text-gray-800 font-bold text-xs whitespace-nowrap">{r.insuranceDate || "---"}</td>
                                            <td className="px-3 py-4 text-gray-800 font-bold text-xs whitespace-nowrap">{r.policyPeriod || "---"}</td>
                                            <td className="px-3 py-4 text-center">
                                                <span className={`text-[11px] font-black ${r.aadharCard ? 'text-green-700' : 'text-gray-300'}`}>{r.aadharCard ? 'OK' : '---'}</span>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <span className={`text-[11px] font-black ${r.taxInvoice ? 'text-green-700' : 'text-gray-300'}`}>{r.taxInvoice ? 'OK' : '---'}</span>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <span className={`text-[11px] font-black ${r.addressProof ? 'text-green-700' : 'text-gray-300'}`}>{r.addressProof ? 'OK' : '---'}</span>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <span className={`text-[11px] font-black ${r.commission ? 'text-green-700' : 'text-gray-300'}`}>{r.commission ? 'OK' : '---'}</span>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <span className={`text-[11px] font-black ${r.certificate ? 'text-green-700' : 'text-gray-300'}`}>{r.certificate ? 'OK' : '---'}</span>
                                            </td>

                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Modal - Minimalistic Design */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
                        {/* Minimal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Complete Insurance</h3>
                                <p className="text-xs text-gray-400">Enquiry: {selectedRecord?.enquiryNumber}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Minimal Form Content */}
                        <div className="p-6 space-y-8">
                            {/* Section 1: Policy Details */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">01. Policy Details</h4>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Field Name</label>
                                        <input
                                            type="text"
                                            className="w-full border-b border-gray-200 py-1 underline-offset-4 outline-none focus:border-blue-500 text-sm transition-colors"
                                            placeholder="Officer Name"
                                            value={form.fieldName}
                                            onChange={e => setForm({ ...form, fieldName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Company Name</label>
                                        <input
                                            type="text"
                                            className="w-full border-b border-gray-200 py-1 outline-none focus:border-blue-500 text-sm transition-colors"
                                            placeholder="Insurance Co."
                                            value={form.companyName}
                                            onChange={e => setForm({ ...form, companyName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Premium Amount</label>
                                        <input
                                            type="number"
                                            className="w-full border-b border-gray-200 py-1 outline-none focus:border-blue-500 text-sm transition-colors"
                                            placeholder="₹ 0.00"
                                            value={form.premiumAmount}
                                            onChange={e => setForm({ ...form, premiumAmount: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Policy Number</label>
                                        <input
                                            type="text"
                                            className="w-full border-b border-gray-200 py-1 outline-none focus:border-blue-500 text-sm font-mono transition-colors"
                                            placeholder="POL-XXXXX"
                                            value={form.policyNo}
                                            onChange={e => setForm({ ...form, policyNo: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Policy Date (Issue)</label>
                                        <input
                                            type="date"
                                            className="w-full border-b border-gray-200 py-1 outline-none focus:border-blue-500 text-sm transition-colors"
                                            value={form.date}
                                            onChange={e => setForm({ ...form, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Policy Period</label>
                                        <input
                                            type="text"
                                            className="w-full border-b border-gray-200 py-1 outline-none focus:border-blue-500 text-sm transition-colors"
                                            placeholder="e.g. 1 Year"
                                            value={form.policyPeriod}
                                            onChange={e => setForm({ ...form, policyPeriod: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Documents */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">02. Documents Checklist</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'aadharCard', label: 'Aadhar Card' },
                                        { id: 'taxInvoice', label: 'Tax Invoice' },
                                        { id: 'addressProof', label: 'Address Proof' },
                                        { id: 'commission', label: 'Commission' },
                                        { id: 'certificate', label: 'Certificate' }
                                    ].map(doc => (
                                        <label key={doc.id} className="flex items-center space-x-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                checked={form[doc.id]}
                                                onChange={e => setForm({ ...form, [doc.id]: e.target.checked })}
                                            />
                                            <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors uppercase tracking-tight font-medium">{doc.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Minimal Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex space-x-4">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                DISCARD
                            </button>
                            <button
                                onClick={handleModalSubmit}
                                disabled={isSubmitting}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "SAVE COMPLETE"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}

export default InsurancePage
