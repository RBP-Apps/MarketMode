import { useState, useEffect } from "react";
import { BellRing, FileCheck, Calendar } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";

// Calendar Component (defined outside)
const CalendarComponent = ({ date, onChange, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onChange(selectedDate);
    onClose();
  };

  const renderDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );
    const firstDayOfMonth = getFirstDayOfMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        date &&
        date.getDate() === day &&
        date.getMonth() === currentMonth.getMonth() &&
        date.getFullYear() === currentMonth.getFullYear();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
            isSelected
              ? "bg-purple-600 text-white"
              : "hover:bg-purple-100 text-gray-700"
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  return (
    <div className="p-2 bg-white border border-gray-200 rounded-md shadow-md">
      <div className="flex justify-between items-center mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          &lt;
        </button>
        <div className="text-sm font-medium">
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
          {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="h-8 w-8 flex items-center justify-center text-xs text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
};

// Helper functions for date manipulation
const formatDate = (date) => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

const addMonths = (date, months) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

const addYears = (date, years) => {
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + years);
  return newDate;
};

export default function AssignTask() {
  const [date, setSelectedDate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);

  // Add new state variables for dropdown options
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [givenByOptions, setGivenByOptions] = useState([]);
  const [doerOptions, setDoerOptions] = useState([]);

  const frequencies = [
    { value: "one-time", label: "One Time (No Recurrence)" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "fortnightly", label: "Fortnightly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
    { value: "end-of-1st-week", label: "End of 1st Week" },
    { value: "end-of-2nd-week", label: "End of 2nd Week" },
    { value: "end-of-3rd-week", label: "End of 3rd Week" },
    { value: "end-of-4th-week", label: "End of 4th Week" },
    { value: "end-of-last-week", label: "End of Last Week" },
  ];

  const [formData, setFormData] = useState({
    department: "",
    givenBy: "",
    doer: "",
    description: "",
    frequency: "daily",
    enableReminders: true,
    requireAttachment: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name, e) => {
    setFormData((prev) => ({ ...prev, [name]: e.target.checked }));
  };

  // Function to fetch options from master sheet
  const fetchMasterSheetOptions = async () => {
    try {
      const masterSheetId = "101zBKPpsMtmBi36uCULsJoUgj_q7-0m1pjIXY5zmbP8";
      const masterSheetName = "master";

      const url = `https://docs.google.com/spreadsheets/d/${masterSheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        masterSheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch master data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows) {
        console.log("No master data found");
        return;
      }

      // Extract options from columns A, B, and C
      const departments = [];
      const givenBy = [];
      const doers = [];

      // Process all rows starting from index 1 (skip header)
      data.table.rows.slice(1).forEach((row) => {
        // Column A - Departments
        if (row.c && row.c[0] && row.c[0].v) {
          const value = row.c[0].v.toString().trim();
          if (value !== "") {
            departments.push(value);
          }
        }
        // Column B - Given By
        if (row.c && row.c[1] && row.c[1].v) {
          const value = row.c[1].v.toString().trim();
          if (value !== "") {
            givenBy.push(value);
          }
        }
        // Column C - Doers
        if (row.c && row.c[2] && row.c[2].v) {
          const value = row.c[2].v.toString().trim();
          if (value !== "") {
            doers.push(value);
          }
        }
      });

      // Remove duplicates and sort
      setDepartmentOptions([...new Set(departments)].sort());
      setGivenByOptions([...new Set(givenBy)].sort());
      setDoerOptions([...new Set(doers)].sort());

      console.log("Master sheet options loaded successfully", {
        departments: [...new Set(departments)],
        givenBy: [...new Set(givenBy)],
        doers: [...new Set(doers)],
      });
    } catch (error) {
      console.error("Error fetching master sheet options:", error);
      // Set default options if fetch fails
      setDepartmentOptions(["Department 1", "Department 2"]);
      setGivenByOptions(["User 1", "User 2"]);
      setDoerOptions(["Doer 1", "Doer 2"]);
    }
  };

  // Update date display format
  const getFormattedDate = (date) => {
    if (!date) return "Select a date";
    return formatDate(date);
  };

  useEffect(() => {
    fetchMasterSheetOptions();
  }, []);

  // Add a function to get the last task ID from the specified sheet
  const getLastTaskId = async (sheetName) => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/101zBKPpsMtmBi36uCULsJoUgj_q7-0m1pjIXY5zmbP8/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows || data.table.rows.length === 0) {
        return 0; // Start from 1 if no tasks exist
      }

      // Get the last task ID from column B (index 1)
      let lastTaskId = 0;
      data.table.rows.forEach((row) => {
        if (row.c && row.c[1] && row.c[1].v) {
          const taskId = parseInt(row.c[1].v);
          if (!isNaN(taskId) && taskId > lastTaskId) {
            lastTaskId = taskId;
          }
        }
      });

      return lastTaskId;
    } catch (error) {
      console.error("Error fetching last task ID:", error);
      return 0;
    }
  };

  // FIXED: Updated date formatting function to return DD/MM/YYYY format
  const formatDateToDDMMYYYY = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`; // DD/MM/YYYY format with slashes
  };

  // Function to fetch working days from the Working Day Calendar sheet
  const fetchWorkingDays = async () => {
    try {
      const sheetId = "101zBKPpsMtmBi36uCULsJoUgj_q7-0m1pjIXY5zmbP8";
      const sheetName = "Working Day Calendar";

      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch working days: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows) {
        console.log("No working day data found");
        return [];
      }

      // Extract dates from column A
      const workingDays = [];
      data.table.rows.forEach((row) => {
        if (row.c && row.c[0] && row.c[0].v) {
          let dateValue = row.c[0].v;

          // Handle Google Sheets Date(year,month,day) format
          if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
            const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateValue);
            if (match) {
              const year = parseInt(match[1], 10);
              const month = parseInt(match[2], 10); // 0-indexed in Google's format
              const dateDay = parseInt(match[3], 10);

              // FIXED: Convert to DD/MM/YYYY format
              dateValue = `${dateDay.toString().padStart(2, "0")}/${(month + 1)
                .toString()
                .padStart(2, "0")}/${year}`;
            }
          } else if (dateValue instanceof Date) {
            // If it's a Date object
            dateValue = formatDateToDDMMYYYY(dateValue);
          }

          // FIXED: Update regex to match DD/MM/YYYY format
          if (
            typeof dateValue === "string" &&
            dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/) // DD/MM/YYYY pattern
          ) {
            workingDays.push(dateValue);
          }
        }
      });

      console.log(`Fetched ${workingDays.length} working days`);
      return workingDays;
    } catch (error) {
      console.error("Error fetching working days:", error);
      return []; // Return empty array if fetch fails
    }
  };

  // Updated generateTasks function that only creates tasks for dates in the Working Day Calendar
  const generateTasks = async () => {
    if (!date || !formData.doer || !formData.description || !formData.frequency) {
      alert("Please fill in all required fields.");
      return;
    }

    // Fetch working days from the sheet
    const workingDays = await fetchWorkingDays();
    if (workingDays.length === 0) {
      alert("Could not retrieve working days. Please make sure the Working Day Calendar sheet is properly set up.");
      return;
    }

    // Sort the working days chronologically
    const sortedWorkingDays = [...workingDays].sort((a, b) => {
      // FIXED: Updated parsing for DD/MM/YYYY format
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });

    // Convert selected date to same format
    const selectedDate = new Date(date);
    
    // Filter out dates before the selected date (no back dates)
    const futureDates = sortedWorkingDays.filter(dateStr => {
      // FIXED: Updated parsing for DD/MM/YYYY format
      const [dateDay, month, year] = dateStr.split('/').map(Number);
      const dateObj = new Date(year, month - 1, dateDay);
      return dateObj >= selectedDate;
    });

    // If no future working days are available from the selected date
    if (futureDates.length === 0) {
      alert("No working days found on or after your selected date. Please choose a different start date or update the Working Day Calendar.");
      return;
    }

    // Find the start date in working days
    const startDateStr = formatDateToDDMMYYYY(selectedDate);
    let startIndex = futureDates.findIndex(d => d === startDateStr);
    
    // If the exact start date isn't found, use the next available working day
    if (startIndex === -1) {
      startIndex = 0; // Use the first available future working day
      alert(`The selected date (${startDateStr}) is not in the Working Day Calendar. The next available working day will be used instead: ${futureDates[0]}`);
    }

    const tasks = [];
    
    // For one-time tasks, just use the first available date
    if (formData.frequency === "one-time") {
      const taskDateStr = futureDates[startIndex];
      
      tasks.push({
        description: formData.description,
        department: formData.department,
        givenBy: formData.givenBy,
        doer: formData.doer,
        dueDate: taskDateStr,
        status: "pending",
        frequency: formData.frequency,
        enableReminders: formData.enableReminders,
        requireAttachment: formData.requireAttachment,
      });
    } else {
      // For recurring tasks, find appropriate dates based on frequency
      let currentIndex = startIndex;
      
      // We'll use the working days from the calendar instead of generating dates
      while (currentIndex < futureDates.length) {
        const taskDateStr = futureDates[currentIndex];
        
        tasks.push({
          description: formData.description,
          department: formData.department,
          givenBy: formData.givenBy,
          doer: formData.doer,
          dueDate: taskDateStr,
          status: "pending",
          frequency: formData.frequency,
          enableReminders: formData.enableReminders,
          requireAttachment: formData.requireAttachment,
        });
        
        // Determine the next index based on frequency
        switch (formData.frequency) {
          case "daily": {
            currentIndex += 1; // Next working day
            break;
          }
          case "weekly": {
            // Find a working day approximately 7 calendar days later
            // FIXED: Updated parsing for DD/MM/YYYY format
            const [taskDay, taskMonth, taskYear] = taskDateStr.split('/').map(Number);
            const currentDate = new Date(taskYear, taskMonth - 1, taskDay);
            const targetDate = addDays(currentDate, 7);
            const targetDateStr = formatDateToDDMMYYYY(targetDate);
            
            // Find the next working day closest to the target date
            const nextIndex = findClosestWorkingDayIndex(futureDates, targetDateStr);
            currentIndex = nextIndex > currentIndex ? nextIndex : futureDates.length;
            break;
          }
          case "fortnightly": {
            // Find a working day approximately 14 calendar days later
            const [taskDay2, taskMonth2, taskYear2] = taskDateStr.split('/').map(Number);
            const currentDate2 = new Date(taskYear2, taskMonth2 - 1, taskDay2);
            const targetDate2 = addDays(currentDate2, 14);
            const targetDateStr2 = formatDateToDDMMYYYY(targetDate2);
            
            const nextIndex2 = findClosestWorkingDayIndex(futureDates, targetDateStr2);
            currentIndex = nextIndex2 > currentIndex ? nextIndex2 : futureDates.length;
            break;
          }
          case "monthly": {
            // Find a working day approximately 1 month later
            const [taskDay3, taskMonth3, taskYear3] = taskDateStr.split('/').map(Number);
            const currentDate3 = new Date(taskYear3, taskMonth3 - 1, taskDay3);
            const targetDate3 = addMonths(currentDate3, 1);
            const targetDateStr3 = formatDateToDDMMYYYY(targetDate3);
            
            const nextIndex3 = findClosestWorkingDayIndex(futureDates, targetDateStr3);
            currentIndex = nextIndex3 > currentIndex ? nextIndex3 : futureDates.length;
            break;
          }
          case "quarterly": {
            // Find a working day approximately 3 months later
            const [taskDay4, taskMonth4, taskYear4] = taskDateStr.split('/').map(Number);
            const currentDate4 = new Date(taskYear4, taskMonth4 - 1, taskDay4);
            const targetDate4 = addMonths(currentDate4, 3);
            const targetDateStr4 = formatDateToDDMMYYYY(targetDate4);
            
            const nextIndex4 = findClosestWorkingDayIndex(futureDates, targetDateStr4);
            currentIndex = nextIndex4 > currentIndex ? nextIndex4 : futureDates.length;
            break;
          }
          case "yearly": {
            // Find a working day approximately 1 year later
            const [taskDay5, taskMonth5, taskYear5] = taskDateStr.split('/').map(Number);
            const currentDate5 = new Date(taskYear5, taskMonth5 - 1, taskDay5);
            const targetDate5 = addYears(currentDate5, 1);
            const targetDateStr5 = formatDateToDDMMYYYY(targetDate5);
            
            const nextIndex5 = findClosestWorkingDayIndex(futureDates, targetDateStr5);
            currentIndex = nextIndex5 > currentIndex ? nextIndex5 : futureDates.length;
            break;
          }
          case "end-of-1st-week":
          case "end-of-2nd-week":
          case "end-of-3rd-week":
          case "end-of-4th-week":
          case "end-of-last-week": {
            // These would need special handling based on your calendar's definition of weeks
            // For now, we'll just move to the next month and find the appropriate week
            const [taskDay6, taskMonth6, taskYear6] = taskDateStr.split('/').map(Number);
            const currentDate6 = new Date(taskYear6, taskMonth6 - 1, taskDay6);
            const targetDate6 = addMonths(currentDate6, 1);
            
            // Find the appropriate week in the next month
            let weekNumber;
            switch (formData.frequency) {
              case "end-of-1st-week": weekNumber = 1; break;
              case "end-of-2nd-week": weekNumber = 2; break;
              case "end-of-3rd-week": weekNumber = 3; break;
              case "end-of-4th-week": weekNumber = 4; break;
              case "end-of-last-week": weekNumber = -1; break; // Special case for last week
            }
            
            const targetDateStr6 = findEndOfWeekDate(targetDate6, weekNumber, futureDates);
            const nextIndex6 = futureDates.indexOf(targetDateStr6);
            currentIndex = nextIndex6 > currentIndex ? nextIndex6 : futureDates.length;
            break;
          }
          default: {
            currentIndex = futureDates.length; // Exit the loop if frequency is not recognized
          }
        }
      }
    }

    setGeneratedTasks(tasks);
    setAccordionOpen(true);
  };

  // Helper function to find the closest working day to a target date
  const findClosestWorkingDayIndex = (workingDays, targetDateStr) => {
    // Parse the target date (DD/MM/YYYY format)
    const [targetDay, targetMonth, targetYear] = targetDateStr.split('/').map(Number);
    const targetDate = new Date(targetYear, targetMonth - 1, targetDay);
    
    // Find the closest working day (preferably after the target date)
    let closestIndex = -1;
    let minDifference = Infinity;
    
    for (let i = 0; i < workingDays.length; i++) {
      const [workingDay, workingMonth, workingYear] = workingDays[i].split('/').map(Number);
      const currentDate = new Date(workingYear, workingMonth - 1, workingDay);
      
      // Calculate difference in days
      const difference = Math.abs((currentDate - targetDate) / (1000 * 60 * 60 * 24));
      
      if (currentDate >= targetDate && difference < minDifference) {
        minDifference = difference;
        closestIndex = i;
      }
    }
    
    // If no working day found after the target date, find the closest one before
    if (closestIndex === -1) {
      for (let i = workingDays.length - 1; i >= 0; i--) {
        const [workingDay2, workingMonth2, workingYear2] = workingDays[i].split('/').map(Number);
        const currentDate2 = new Date(workingYear2, workingMonth2 - 1, workingDay2);
        
        if (currentDate2 < targetDate) {
          closestIndex = i;
          break;
        }
      }
    }
    
    return closestIndex !== -1 ? closestIndex : workingDays.length - 1;
  };

  // Helper function to find the date for the end of a specific week in a month
  const findEndOfWeekDate = (date, weekNumber, workingDays) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get all working days in the target month (DD/MM/YYYY format)
    const daysInMonth = workingDays.filter(dateStr => {
      const [, m, y] = dateStr.split('/').map(Number);
      return y === year && m === month + 1;
    });
    
    // Sort them chronologically
    daysInMonth.sort((a, b) => {
      const [dayA] = a.split('/').map(Number);
      const [dayB] = b.split('/').map(Number);
      return dayA - dayB;
    });
    
    // Group by weeks (assuming Monday is the first day of the week)
    const weekGroups = [];
    let currentWeek = [];
    let lastWeekDay = -1;
    
    for (const dateStr of daysInMonth) {
      const [workingDay2, m, y] = dateStr.split('/').map(Number);
      const dateObj = new Date(y, m - 1, workingDay2);
      const weekDay = dateObj.getDay(); // 0 for Sunday, 1 for Monday, etc.
      
      if (weekDay <= lastWeekDay || currentWeek.length === 0) {
        if (currentWeek.length > 0) {
          weekGroups.push(currentWeek);
        }
        currentWeek = [dateStr];
      } else {
        currentWeek.push(dateStr);
      }
      
      lastWeekDay = weekDay;
    }
    
    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek);
    }
    
    // Return the last day of the requested week
    if (weekNumber === -1) {
      // Last week of the month
      return weekGroups[weekGroups.length - 1]?.[weekGroups[weekGroups.length - 1].length - 1] || daysInMonth[daysInMonth.length - 1];
    } else if (weekNumber > 0 && weekNumber <= weekGroups.length) {
      // Specific week
      return weekGroups[weekNumber - 1]?.[weekGroups[weekNumber - 1].length - 1] || daysInMonth[daysInMonth.length - 1];
    } else {
      // Default to the last day of the month if the requested week doesn't exist
      return daysInMonth[daysInMonth.length - 1];
    }
  };

 // Updated handleSubmit function with proper sheet selection logic
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    if (generatedTasks.length === 0) {
      alert("Please generate tasks first by clicking Preview Generated Tasks");
      setIsSubmitting(false);
      return;
    }

    // Determine the sheet based on frequency:
    // - "one-time" frequency → DELEGATION sheet (department doesn't matter)
    // - All other frequencies → Checklist sheet
    const submitSheetName = formData.frequency === "one-time" ? "DELEGATION" : "Checklist";

    // Get the last task ID from the appropriate sheet
    const lastTaskId = await getLastTaskId(submitSheetName);
    let nextTaskId = lastTaskId + 1;

    // Prepare all tasks data for batch insertion
    const tasksData = generatedTasks.map((task, index) => ({
      timestamp: formatDateToDDMMYYYY(new Date()),
      taskId: (nextTaskId + index).toString(),
      firm: task.department,                    // Maps to Column C
      givenBy: task.givenBy,                    // Maps to Column D
      name: task.doer,                          // Maps to Column E
      description: task.description,            // Maps to Column F
      startDate: task.dueDate,                  // Maps to Column G - now in DD/MM/YYYY format
      freq: task.frequency,                     // Maps to Column H
      enableReminders: task.enableReminders ? "Yes" : "No",    // Maps to Column I
      requireAttachment: task.requireAttachment ? "Yes" : "No"  // Maps to Column J
    }));

    console.log(`Submitting ${tasksData.length} tasks in batch to ${submitSheetName} sheet:`, tasksData);

    // Submit all tasks in one batch to Google Sheets
    const formPayload = new FormData();
    formPayload.append("sheetName", submitSheetName);
    formPayload.append("action", "insert");
    formPayload.append("batchInsert", "true");
    formPayload.append("rowData", JSON.stringify(tasksData));

    await fetch(
      "https://script.google.com/macros/s/AKfycbxR-N0y9pSElWscysbstP48Y8PDQ4-8mnFO_KkbDNP3nLt0rOsxcHa7jtqmKHuJRj6vdw/exec",
      {
        method: "POST",
        body: formPayload,
        mode: "no-cors",
      }
    );

    // Show a success message with the appropriate sheet name
    alert(`Successfully submitted ${generatedTasks.length} tasks to ${submitSheetName} sheet in one batch!`);

    // Reset form
    setFormData({
      department: "",
      givenBy: "",
      doer: "",
      description: "",
      frequency: "daily",
      enableReminders: true,
      requireAttachment: false
    });
    setSelectedDate(null);
    setGeneratedTasks([]);
    setAccordionOpen(false);
  } catch (error) {
    console.error("Submission error:", error);
    alert("Failed to assign tasks. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};

  // FIXED: Helper function to format date for display in preview (same as storage format now)
  const formatDateForDisplay = (dateStr) => {
    // Since we're now using DD/MM/YYYY for both storage and display, just return as is
    return dateStr;
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6 text-purple-500">
          Assign New Task
        </h1>
        <div className="rounded-lg border border-purple-200 bg-white shadow-md overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-purple-100">
              <h2 className="text-xl font-semibold text-purple-700">
                Task Details
              </h2>
              <p className="text-purple-600">
                Fill in the details to assign a new task to a staff member.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Department Name Dropdown */}
              <div className="space-y-2">
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-purple-700"
                >
                  Department Name
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Select Department</option>
                  {departmentOptions.map((dept, index) => (
                    <option key={index} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Given By Dropdown */}
              <div className="space-y-2">
                <label
                  htmlFor="givenBy"
                  className="block text-sm font-medium text-purple-700"
                >
                  Given By
                </label>
                <select
                  id="givenBy"
                  name="givenBy"
                  value={formData.givenBy}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Select Given By</option>
                  {givenByOptions.map((person, index) => (
                    <option key={index} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doer's Name Dropdown */}
              <div className="space-y-2">
                <label
                  htmlFor="doer"
                  className="block text-sm font-medium text-purple-700"
                >
                  Doer's Name
                </label>
                <select
                  id="doer"
                  name="doer"
                  value={formData.doer}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Select Doer</option>
                  {doerOptions.map((doer, index) => (
                    <option key={index} value={doer}>
                      {doer}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-purple-700"
                >
                  Task Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter task description"
                  rows={4}
                  required
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Date and Frequency */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-purple-700">
                    Task Start Date
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full flex justify-start items-center rounded-md border border-purple-200 p-2 text-left focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <Calendar className="mr-2 h-4 w-4 text-purple-500" />
                      {date ? getFormattedDate(date) : "Select a date"}
                    </button>
                    {showCalendar && (
                      <div className="absolute z-10 mt-1">
                        <CalendarComponent
                          date={date}
                          onChange={setSelectedDate}
                          onClose={() => setShowCalendar(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="frequency"
                    className="block text-sm font-medium text-purple-700"
                  >
                    Frequency
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {frequencies.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Additional Options */}
              <div className="space-y-4 pt-2 border-t border-purple-100">
                <h3 className="text-lg font-medium text-purple-700 pt-2">
                  Additional Options
                </h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="enable-reminders"
                      className="text-purple-700 font-medium"
                    >
                      Enable Reminders
                    </label>
                    <p className="text-sm text-purple-600">
                      Send reminders before task due date
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BellRing className="h-4 w-4 text-purple-500" />
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="enable-reminders"
                        checked={formData.enableReminders}
                        onChange={(e) =>
                          handleSwitchChange("enableReminders", e)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="require-attachment"
                      className="text-purple-700 font-medium"
                    >
                      Require Attachment
                    </label>
                    <p className="text-sm text-purple-600">
                      User must upload a file when completing task
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileCheck className="h-4 w-4 text-purple-500" />
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="require-attachment"
                        checked={formData.requireAttachment}
                        onChange={(e) =>
                          handleSwitchChange("requireAttachment", e)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview and Submit Buttons */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={generateTasks}
                  className="w-full rounded-md border border-purple-200 bg-purple-50 py-2 px-4 text-purple-700 hover:bg-purple-100 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Preview Generated Tasks
                </button>

                {generatedTasks.length > 0 && (
                  <div className="w-full">
                    <div className="border border-purple-200 rounded-md">
                      <button
                        type="button"
                        onClick={() => setAccordionOpen(!accordionOpen)}
                        className="w-full flex justify-between items-center p-4 text-purple-700 hover:bg-purple-50 focus:outline-none"
                      >
                        <span className="font-medium">
                          {generatedTasks.length} Tasks Generated 
                          {formData.frequency === "one-time" 
                            ? " (Will be stored in DELEGATION sheet)" 
                            : " (Will be stored in Checklist sheet)"
                          }
                        </span>
                        <svg
                          className={`w-5 h-5 transition-transform ${
                            accordionOpen ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {accordionOpen && (
                        <div className="p-4 border-t border-purple-200">
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {generatedTasks.slice(0, 20).map((task, index) => (
                              <div
                                key={index}
                                className="text-sm p-2 border rounded-md border-purple-200 bg-purple-50"
                              >
                                <div className="font-medium text-purple-700">
                                  {task.description}
                                </div>
                                <div className="text-xs text-purple-600">
                                  Due: {formatDateForDisplay(task.dueDate)} | Department: {task.department}
                                </div>
                                <div className="flex space-x-2 mt-1">
                                  {task.enableReminders && (
                                    <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                      <BellRing className="h-3 w-3 mr-1" />{" "}
                                      Reminders
                                    </span>
                                  )}
                                  {task.requireAttachment && (
                                    <span className="inline-flex items-center text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                      <FileCheck className="h-3 w-3 mr-1" />{" "}
                                      Attachment Required
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {generatedTasks.length > 20 && (
                              <div className="text-sm text-center text-purple-600 py-2">
                                ...and {generatedTasks.length - 20} more tasks
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-t border-purple-100">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    department: "",
                    givenBy: "",
                    doer: "",
                    description: "",
                    frequency: "daily",
                    enableReminders: true,
                    requireAttachment: false,
                  });
                  setSelectedDate(null);
                  setGeneratedTasks([]);
                  setAccordionOpen(false);
                }}
                className="rounded-md border border-purple-200 py-2 px-4 text-purple-700 hover:border-purple-300 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 py-2 px-4 text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Assigning..." : "Assign Task"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}