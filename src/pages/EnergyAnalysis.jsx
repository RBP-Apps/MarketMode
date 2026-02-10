"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, MapPin, Users, Phone, Eye, CreditCard, Plus, Calendar, Zap } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
    // Updated Google Apps Script URL
    APPS_SCRIPT_URL:
        "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec ",
    // Updated Google Drive folder ID for file uploads
    DRIVE_FOLDER_ID: "1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4",
    // Sheet names
    SOURCE_SHEET_NAME: "FMS",
    DROPDOWN_SHEET_NAME: "Drop-Down Value",
    ENERGY_ANALYSIS_SHEET_NAME: "Energy analysis",
    // Updated page configuration
    PAGE_CONFIG: {
        title: "Energy Analysis",
        historyTitle: "Energy Analysis History",
        description: "Manage pending Energy Analysis records",
        historyDescription: "View completed Energy Analysis records",
    },
}

const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return "—";

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
};

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

// Energy Analysis Form Modal Component
function EnergyAnalysisModal({ isOpen, onClose, record, onSubmit, isSubmitting }) {
    const [formData, setFormData] = useState({
        energyDate: new Date().toISOString().split('T')[0], // Today's date
        production: ''
    })

    useEffect(() => {
        if (isOpen && record) {
            setFormData({
                energyDate: new Date().toISOString().split('T')[0],
                production: ''
            })
        }
    }, [isOpen, record])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.production.trim()) {
            alert('Please enter production value')
            return
        }
        onSubmit(formData)
    }

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    if (!isOpen || !record) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Energy Analysis Entry</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        disabled={isSubmitting}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Prefilled Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Enquiry Number
                        </label>
                        <input
                            type="text"
                            value={record.enquiryNumber || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Beneficiary Name
                        </label>
                        <input
                            type="text"
                            value={record.beneficiaryName || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                        />
                    </div>

                    {/* Input Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Calendar className="inline h-4 w-4 mr-1" />
                            Energy Date
                        </label>
                        <input
                            type="date"
                            value={formData.energyDate}
                            onChange={(e) => handleInputChange('energyDate', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Zap className="inline h-4 w-4 mr-1" />
                            Production
                        </label>
                        <input
                            type="number"
                            value={formData.production}
                            onChange={(e) => handleInputChange('production', e.target.value)}
                            placeholder="Enter production value"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Submit Entry
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function EnergyAnalysis() {
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

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState(null)
    const [modalSubmitting, setModalSubmitting] = useState(false)
    const [beneficiaryFilter, setBeneficiaryFilter] = useState("")
    const [energyDateFilter, setEnergyDateFilter] = useState("")
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

    const isEmpty = useCallback((value) => {
        return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
    }, [])

    useEffect(() => {
        const role = sessionStorage.getItem("role")
        const user = sessionStorage.getItem("username")
        setUserRole(role || "")
        setUsername(user || "")
    }, [])

    // Handle opening modal
    const handleOpenModal = (record) => {
        setSelectedRecord(record)
        setModalOpen(true)
    }

    // Handle closing modal
    const handleCloseModal = () => {
        setModalOpen(false)
        setSelectedRecord(null)
    }

    // Handle energy analysis form submission
    const handleEnergyAnalysisSubmit = async (formData) => {
        setModalSubmitting(true)
        try {
            const timestamp = formatTimestamp()

            // Format energy date as DD/MM/YYYY
            const energyDateFormatted = formData.energyDate
                ? new Date(formData.energyDate).toLocaleDateString("en-GB") // en-GB gives DD/MM/YYYY
                : ""

            // Prepare row data for Energy analysis sheet
            const rowData = [
                timestamp,                              // Column A
                selectedRecord.enquiryNumber || '',     // Column B
                selectedRecord.beneficiaryName || '',   // Column C
                energyDateFormatted,                     // Column D formatted
                formData.production ? `${formData.production} KWh` : '' // Column E
            ]

            const updateData = {
                action: "insert",
                sheetName: CONFIG.ENERGY_ANALYSIS_SHEET_NAME,
                rowData: JSON.stringify(rowData),
            }

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams(updateData).toString(),
            })

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || "Failed to submit energy analysis")
            }

            setSuccessMessage(`Energy analysis entry submitted successfully for ${selectedRecord.enquiryNumber}`)
            handleCloseModal()

            setTimeout(() => {
                setSuccessMessage("")
            }, 3000)

        } catch (error) {
            console.error("Error submitting energy analysis:", error)
            alert("Failed to submit energy analysis: " + error.message)
        } finally {
            setModalSubmitting(false)
        }
    }


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

    // Add this function to fetch energy analysis data
    const fetchEnergyAnalysisData = useCallback(async () => {
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.ENERGY_ANALYSIS_SHEET_NAME}&action=fetch`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch energy analysis data: ${response.status}`);
            }

            const text = await response.text();
            let data;

            try {
                data = JSON.parse(text);
            } catch (parseError) {
                const jsonStart = text.indexOf("{");
                const jsonEnd = text.lastIndexOf("}");
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    const jsonString = text.substring(jsonStart, jsonEnd + 1);
                    data = JSON.parse(jsonString);
                } else {
                    throw new Error("Invalid JSON response from server");
                }
            }

            const energyAnalysisRecords = [];
            let rows = [];

            if (data.table && data.table.rows) {
                rows = data.table.rows;
            } else if (Array.isArray(data)) {
                rows = data;
            } else if (data.values) {
                rows = data.values.map((row) => ({ c: row.map((val) => ({ v: val })) }));
            }

            // Process all rows without any filtering
            rows.forEach((row, rowIndex) => {
                // Skip header row (assuming first row is header)
                if (rowIndex === 0) return;

                let rowValues = [];
                if (row.c) {
                    rowValues = row.c.map((cell) => (cell && cell.v !== undefined ? cell.v : ""));
                } else if (Array.isArray(row)) {
                    rowValues = row;
                } else {
                    return;
                }

                // Extract the required columns
                // A: Timestamp, B: Enquiry Number, C: Beneficiary Name, D: Energy Date, E: Production
                const record = {
                    timestamp: rowValues[0] || "", // Column A
                    enquiryNumber: rowValues[1] || "", // Column B
                    beneficiaryName: rowValues[2] || "", // Column C
                    energyDate: rowValues[3] || "", // Column D
                    production: rowValues[4] || "", // Column E
                };

                energyAnalysisRecords.push(record);
            });

            return energyAnalysisRecords;
        } catch (error) {
            console.error("Error fetching energy analysis data:", error);
            throw error;
        }
    }, []);
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
                const columnDZ = rowValues[145] // Column DZ
                const columnEA = rowValues[146] // Column EA

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

                // ONLY ADD TO PENDING - DON'T ADD ANYTHING TO HISTORY FROM FMS SHEET
                if (isColumnEAEmpty) {
                    pending.push(rowData)
                }
                // REMOVED THE else BLOCK THAT WAS ADDING TO HISTORY FROM FMS SHEET
            })

            setPendingData(pending)
            // DON'T setHistoryData here - keep it empty
            setLoading(false)
        } catch (error) {
            console.error("Error fetching sheet data:", error)
            setError("Failed to load Energy Analysis data: " + error.message)
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
        pendingData.forEach((record) => {
            if (record.payment && record.payment !== "") {
                initialStatusValues[record._id] = record.payment
            }
            initialPaymentDetails[record._id] = {
                checkNo: record.checkNo || "",
                date: record.date || "",
                amount: record.amount || "",
                deduction: record.deduction || "",
            }
        })
        setStatusValues(initialStatusValues)
        setPaymentDetails(initialPaymentDetails)
    }, [pendingData])

    useEffect(() => {
        if (showHistory) {
            const loadEnergyAnalysisData = async () => {
                try {
                    setLoading(true);
                    const energyData = await fetchEnergyAnalysisData();
                    // Directly set the fetched data without any filtering
                    setHistoryData(energyData);
                    setLoading(false);
                } catch (error) {
                    setError("Failed to load Energy Analysis history data: " + error.message);
                    setLoading(false);
                }
            };

            loadEnergyAnalysisData();
        } else {
            // When switching back to pending tab, clear history data
            setHistoryData([]);
        }
    }, [showHistory, fetchEnergyAnalysisData]);

    // Add this useEffect to debug the filtering
    useEffect(() => {
        if (energyDateFilter && historyData.length > 0) {
            console.log("DEBUG: Date filter analysis");
            console.log("Filter date:", energyDateFilter);

            historyData.slice(0, 5).forEach((record, index) => {
                if (record.energyDate) {
                    console.log(`Record ${index + 1}:`, {
                        energyDate: record.energyDate,
                        enquiryNumber: record.enquiryNumber,
                        beneficiaryName: record.beneficiaryName
                    });

                    // Test the date conversion
                    try {
                        const dateParts = record.energyDate.split('/');
                        let testDate;

                        if (dateParts.length === 3) {
                            testDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
                        } else {
                            testDate = new Date(record.energyDate);
                        }

                        console.log(`  Converted date:`, testDate.toDateString());
                    } catch (e) {
                        console.log(`  Date conversion error:`, e.message);
                    }
                }
            });
        }
    }, [energyDateFilter, historyData]);


    const filteredPendingData = useMemo(() => {
        return debouncedSearchTerm
            ? pendingData.filter((record) =>
                Object.values(record).some(
                    (value) => value && value.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
                ),
            )
            : pendingData
    }, [pendingData, debouncedSearchTerm])

    // Update the filteredHistoryData useMemo to handle DD/MM/YYYY format correctly
    const filteredHistoryData = useMemo(() => {
        let filteredData = historyData;

        // Apply beneficiary filter
        if (beneficiaryFilter) {
            filteredData = filteredData.filter((record) =>
                record.beneficiaryName &&
                record.beneficiaryName.toLowerCase().includes(beneficiaryFilter.toLowerCase())
            );
        }

        // Apply energy date filter
        if (energyDateFilter) {
            filteredData = filteredData.filter((record) => {
                if (!record.energyDate) return false;

                try {
                    // Convert the filter date (YYYY-MM-DD) to a Date object
                    const filterDate = new Date(energyDateFilter);
                    if (isNaN(filterDate.getTime())) return false;

                    // Convert the record's energyDate to a Date object for comparison
                    // Handle different possible date formats in your data
                    let recordDate;
                    const dateParts = record.energyDate.split('/');

                    if (dateParts.length === 3) {
                        // Assume DD/MM/YYYY format
                        recordDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
                    } else {
                        // Try to parse as is
                        recordDate = new Date(record.energyDate);
                    }

                    if (isNaN(recordDate.getTime())) return false;

                    // Compare dates (ignore time component)
                    return filterDate.toDateString() === recordDate.toDateString();
                } catch (error) {
                    console.error("Error filtering by date:", error, record.energyDate);
                    return false;
                }
            });
        }

        // Apply search term filter
        if (debouncedSearchTerm) {
            filteredData = filteredData.filter((record) =>
                Object.values(record).some(
                    (value) => value && value.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase())
                )
            );
        }

        return filteredData;
    }, [historyData, debouncedSearchTerm, beneficiaryFilter, energyDateFilter]);

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

    const clearFilters = () => {
        setBeneficiaryFilter("");
        setEnergyDateFilter("");
    };

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

                // FIXED: Use null for columns we don't want to update
                const rowData = Array(141).fill(null)

                // Set specific columns:
                // Column EC (index 132) - Status (Payment)
                rowData[132] = status

                // Column EA (index 130) - Actual timestamp (only if status is "Done")
                if (status === "Done") {
                    rowData[130] = formatTimestamp()
                    // Store payment details
                    rowData[133] = details.checkNo || "" // ED - Check No
                    rowData[134] = details.date || "" // EE - Date
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

            setSuccessMessage(`Successfully updated ${selectedRecordIds.length} Energy Analysis record(s)`)

            // Update local state
            const updatedRecords = selectedRecordIds.map((recordId) => {
                const record = pendingData.find((r) => r._id === recordId)
                const status = statusValues[recordId]
                const details = paymentDetails[recordId] || {}

                return {
                    ...record,
                    payment: status,
                    actual: status === "Done" ? formatTimestamp() : record.actual,
                    checkNo: status === "Done" ? details.checkNo : record.checkNo,
                    date: status === "Done" ? details.date : record.date,
                    amount: status === "Done" ? details.amount : record.amount,
                    deduction: status === "Done" ? details.deduction : record.deduction,
                }
            })

            // Only move records to history if status is "Done", keep all others in pending
            const doneRecords = updatedRecords.filter((record) => record.payment === "Done")

            // Update pending data: remove only "Done" records, keep and update all others
            setPendingData((prev) => {
                return prev
                    .map((record) => {
                        const updatedRecord = updatedRecords.find((updated) => updated._id === record._id)
                        if (updatedRecord) {
                            // If this record was updated and is NOT "Done", return the updated version
                            if (updatedRecord.payment !== "Done") {
                                return updatedRecord
                            }
                            // If this record was updated and IS "Done", it will be filtered out below
                            return null
                        }
                        // If this record was not updated, keep it as is
                        return record
                    })
                    .filter((record) => record !== null) // Remove null entries (the "Done" records)
            })

            if (doneRecords.length > 0) {
                setHistoryData((prev) => [...doneRecords, ...prev])
            }

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
                {showHistory && (
                    <div className="flex space-x-2">
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Filter by Beneficiary"
                                value={beneficiaryFilter}
                                onChange={(e) => setBeneficiaryFilter(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-40"
                            />
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="date"
                                value={energyDateFilter}
                                onChange={(e) => setEnergyDateFilter(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-40"
                            />
                        </div>
                    </div>
                )}

                {showHistory && (beneficiaryFilter || energyDateFilter) && (
                    <div className="flex justify-end">
                        <button
                            onClick={clearFilters}
                            className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                        >
                            <X className="h-3 w-3 mr-1" />
                            Clear Filters
                        </button>
                    </div>
                )}
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
                            Pending Energy Analysis ({filteredPendingData.length})
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
                            Energy Analysis History ({filteredHistoryData.length})
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
                {!showHistory && Object.values(selectedRows).some(Boolean) && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                        <div className="flex items-center justify-between">
                            <span className="text-blue-700 text-sm">
                                {Object.values(selectedRows).filter(Boolean).length} record(s) selected
                            </span>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-md hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
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

                {/* Energy Analysis Modal */}
                <EnergyAnalysisModal
                    isOpen={modalOpen}
                    onClose={handleCloseModal}
                    record={selectedRecord}
                    onSubmit={handleEnergyAnalysisSubmit}
                    isSubmitting={modalSubmitting}
                />

                {/* Table Container with Fixed Height */}
                <div className="rounded-lg border border-blue-200 shadow-md bg-white overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-3">
                        <h2 className="text-blue-700 font-medium flex items-center text-sm">
                            {showHistory ? (
                                <>
                                    <History className="h-4 w-4 mr-2" />
                                    Completed Payments
                                </>
                            ) : (
                                <>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Pending Energy Analysis
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
                            <p className="text-blue-600 text-sm">Loading Energy Analysis data...</p>
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
                                        {!showHistory && (
                                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Action
                                            </th>
                                        )}
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Enquiry Number
                                        </th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Beneficiary Name
                                        </th>
                                        {showHistory ? (
                                            <>
                                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Energy Date
                                                </th>
                                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Production
                                                </th>
                                                {/* <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Timestamp
                                                </th> */}
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Address
                                                </th>
                                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Contact Number Of Beneficiary
                                                </th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {showHistory ? (
                                        filteredHistoryData.length > 0 ? (
                                            filteredHistoryData.map((record) => (
                                                <tr key={record.enquiryNumber || record._id || Math.random()} className="hover:bg-gray-50">
                                                    <td className="px-2 py-3 whitespace-nowrap">
                                                        <div className="text-xs font-medium text-gray-900">{record.enquiryNumber || "—"}</div>
                                                    </td>
                                                    <td className="px-2 py-3 whitespace-nowrap">
                                                        <div className="text-xs text-gray-900 flex items-center">
                                                            <Users className="h-3 w-3 mr-1 text-gray-400" />
                                                            {record.beneficiaryName || "—"}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3 whitespace-nowrap">
                                                        <div className="text-xs text-gray-900">
                                                            {formatDateToDDMMYYYY(record.energyDate) || "—"}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3 whitespace-nowrap">
                                                        <div className="text-xs text-gray-900">
                                                            {record.production || "—"}
                                                        </div>
                                                    </td>
                                                    {/* <td className="px-2 py-3 whitespace-nowrap">
                                                        <div className="text-xs text-gray-900">
                                                            {record.timestamp || "—"}
                                                        </div> */}
                                                    {/* </td> */}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                                                    {searchTerm
                                                        ? "No Energy Analysis history records matching your search"
                                                        : "No energy analysis records found"}
                                                </td>
                                            </tr>
                                        )
                                    ) : (
                                        // ... (pending data rendering remains the same)
                                        filteredPendingData.length > 0 ? (
                                            filteredPendingData.map((record) => (
                                                <tr key={record._id} className="hover:bg-gray-50">
                                                    <td className="px-2 py-3 whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleOpenModal(record)}
                                                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" />
                                                            Add Entry
                                                        </button>
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
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                                                    {searchTerm ? "No pending Energy Analysis matching your search" : "No Energy Analysis found"}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout >
    )
}

export default EnergyAnalysis