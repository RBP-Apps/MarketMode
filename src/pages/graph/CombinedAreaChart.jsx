// components/CombinedAreaChart.jsx - Professional Version
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Brush,
  LineChart, Line, BarChart, Bar
} from 'recharts';
import {
  Calendar, Clock, RefreshCw, Download,
  TrendingUp, Activity, Zap, Battery,
  BarChart3, LineChart as LineChartIcon,
  ChevronDown, ChevronUp, Filter,
  Maximize2, Minimize2,
  CalendarDays,
  Settings,
  AlertCircle, CheckCircle,
  Thermometer, Gauge, Wind,
  ArrowUpDown,
  Sun,
  Moon,
  Cloud,
  Layers,
  Key,
  Cpu,
  Search,
  Database,
  Server,
  HardDrive,
  Calculator,
  Info
} from 'lucide-react';
import { useDeviceContext } from './DeviceContext';
import AutoLogin from './AutoLogin';
import ConfigurationPanel from './ConfigurationPanel';
import ChartSettingsPanel from './ChartSettingsPanel';

// Direct API environment variables
const SOLAR_APPKEY = import.meta.env.VITE_SOLAR_APP_KEY;
const SOLAR_SECRET_KEY = import.meta.env.VITE_SOLAR_SECRET_KEY;
const SOLAR_SYS_CODE = import.meta.env.VITE_SOLAR_SYS_CODE || '207';

const CombinedAreaChart = () => {
  // Context
  const { psKey, setPsKey } = useDeviceContext();

  // Add a state to track if beneficiary was just selected
  const [justSelectedBeneficiary, setJustSelectedBeneficiary] = useState(false);
  const [inverterCapacity, setInverterCapacity] = useState(1);

  // Main state
  const [viewMode, setViewMode] = useState('minute');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState({
    login: false,
    minute: false,
    daily: false,
    monthly: false,
    yearly: false,
    device: false,
    monthly_daily: false
  });
  const [error, setError] = useState('');

  // Data state
  const [minuteData, setMinuteData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [monthlyDailyData, setMonthlyDailyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [deviceData, setDeviceData] = useState(null);

  // Form states
  const [minuteForm, setMinuteForm] = useState({
    ps_key_list: psKey || '1589518_1_1_1',
    points: 'p5,p6,p18,p21,p24',
    start_time_stamp: '',
    end_time_stamp: '',
    minute_interval: 10,
    is_get_data_acquisition_time: '1',
    lang: '_en_US'
  });

  const [dailyForm, setDailyForm] = useState({
    ps_key: psKey || '1589518_1_1_1',
    data_point: 'p2',
    start_date: '',
    end_date: '',
    data_type: '2',
    query_type: '1',
    order: '0'
  });

  const [monthlyDailyForm, setMonthlyDailyForm] = useState({
    ps_key: psKey || '1589518_1_1_1',
    data_point: 'p2',
    start_date: '',
    end_date: '',
    data_type: '2',
    query_type: '1',
    order: '0'
  });

  const [monthlyForm, setMonthlyForm] = useState({
    ps_key: psKey || '1589518_1_1_1',
    data_point: 'p2',
    start_year: '',
    start_month: '',
    end_year: '',
    end_month: '',
    data_type: '2',
    query_type: '2',
    order: '0'
  });

  const [yearlyForm, setYearlyForm] = useState({
    ps_key: psKey || '1589518_1_1_1',
    data_point: 'p2',
    start_year: '',
    end_year: '',
    data_type: '2',
    query_type: '3',
    order: '0'
  });

  // UI states - CHANGED: Default chart type is now 'bar' instead of 'area'
  const [selectedParameter, setSelectedParameter] = useState('p24');
  const [chartType, setChartType] = useState('bar'); // CHANGED FROM 'area' TO 'bar'
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Enhanced conversion mode for daily data with previous day logic
  const [conversionMode, setConversionMode] = useState('period');

  // Date/Time states
  const [dateTime, setDateTime] = useState({
    startDate: '',
    startTime: '08:00',
    endDate: '',
    endTime: '18:00'
  });

  const [dailyDateRange, setDailyDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const [monthlyDailyDateRange, setMonthlyDailyDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // API Start Date for fetching previous day data
  const [apiStartDate, setApiStartDate] = useState('');

  const [monthRange, setMonthRange] = useState({
    startYear: '2025',
    startMonth: '01',
    endYear: '2025',
    endMonth: '12'
  });

  const [yearRange, setYearRange] = useState({
    startYear: '2022',
    endYear: '2025'
  });

  // Chart config
  const [chartConfig, setChartConfig] = useState({
    showGrid: true,
    showPoints: true,
    gradient: true,
    animate: true,
    strokeWidth: 2
  });

  // Refs
  const chartContainerRef = useRef(null);

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  const shortDayNames = [
    'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
  ];

  // Handle token change from AutoLogin component
  const handleTokenChange = useCallback((newToken) => {
    setToken(newToken);
  }, []);

  // Handle device data change from AutoLogin component
  const handleDeviceDataChange = useCallback((deviceData) => {
    setDeviceData(deviceData);
  }, []);

  // Handle beneficiary selection from AutoLogin
  const handleBeneficiarySelect = useCallback(({ beneficiary, inverterId, capacity }) => {
    console.log('Beneficiary selected:', beneficiary, 'Inverter ID:', inverterId, 'Capacity:', capacity);

    if (capacity) {
      setInverterCapacity(parseFloat(capacity));
    }

    // Set flag to indicate beneficiary was just selected
    setJustSelectedBeneficiary(true);
  }, []);

  // Update PS Key from context and fetch device data if available
  useEffect(() => {
    if (psKey) {
      setMinuteForm(prev => ({ ...prev, ps_key_list: psKey }));
      setDailyForm(prev => ({ ...prev, ps_key: psKey }));
      setMonthlyDailyForm(prev => ({ ...prev, ps_key: psKey }));
      setMonthlyForm(prev => ({ ...prev, ps_key: psKey }));
      setYearlyForm(prev => ({ ...prev, ps_key: psKey }));
    }
  }, [psKey]);

  // Helper functions for date formatting
  const formatDateForAPI = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }, []);

  const formatDateFromAPI = useCallback((dateStr) => {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }, []);

  const getPreviousDayTimestamp = useCallback((timestamp) => {
    const year = parseInt(timestamp.slice(0, 4));
    const month = parseInt(timestamp.slice(4, 6)) - 1;
    const day = parseInt(timestamp.slice(6, 8));
    const date = new Date(year, month, day);
    date.setDate(date.getDate() - 1);
    return formatDateForAPI(date);
  }, [formatDateForAPI]);

  // Filter data by date range (timestamp match)
  const filterByDateRange = useCallback((data, startDate, endDate) => {
    if (!startDate || !endDate || !Array.isArray(data)) return data;
    const startStr = startDate.replace(/-/g, '');
    const endStr = endDate.replace(/-/g, '');
    return data.filter(item => {
      const ts = item.timestamp || item.time_stamp || '';
      const datePart = ts.length > 8 ? ts.slice(0, 8) : ts;
      return datePart >= startStr && datePart <= endStr;
    });
  }, []);

  // Initialize dates on mount
  useEffect(() => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Format dates for inputs (YYYY-MM-DD)
    const formatDateForInput = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Format time for inputs (HH:MM)
    const formatTimeForInput = (date) => {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const today = formatDateForInput(now);
    const twoHoursAgoDate = formatDateForInput(twoHoursAgo);
    const twoHoursAgoTime = formatTimeForInput(twoHoursAgo);
    const sevenDaysAgoDate = formatDateForInput(sevenDaysAgo);

    // Set default date/time for minute view
    setDateTime({
      startDate: twoHoursAgoDate,
      startTime: twoHoursAgoTime,
      endDate: today,
      endTime: formatTimeForInput(now)
    });

    // Set default date range for daily view (last 7 days)
    const displayStartDate = sevenDaysAgoDate;
    const displayEndDate = today;

    setDailyDateRange({
      startDate: displayStartDate,
      endDate: displayEndDate
    });

    // Calculate API start date (one day before user's start date)
    const apiStart = new Date(displayStartDate);
    apiStart.setDate(apiStart.getDate() - 1);
    const apiStartDateForAPI = formatDateForAPI(apiStart);
    setApiStartDate(apiStartDateForAPI);

    // Set daily form dates with API start date
    setDailyForm(prev => ({
      ...prev,
      start_date: apiStartDateForAPI,
      end_date: formatDateForAPI(new Date(displayEndDate))
    }));

    // Set default date range for monthly-daily view (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000); // 30 days including today
    const thirtyDaysAgoDate = formatDateForInput(thirtyDaysAgo);

    setMonthlyDailyDateRange({
      startDate: thirtyDaysAgoDate,
      endDate: today
    });

    setMonthlyDailyForm(prev => ({
      ...prev,
      start_date: formatDateForAPI(thirtyDaysAgo),
      end_date: formatDateForAPI(new Date(today))
    }));

    // Convert to timestamp format for minute data API
    const convertToTimestamp = (dateStr, timeStr) => {
      const datePart = dateStr.replace(/-/g, '');
      const timePart = timeStr.replace(/:/g, '');
      return `${datePart}${timePart}00`;
    };

    const startTimestamp = convertToTimestamp(twoHoursAgoDate, twoHoursAgoTime);
    const endTimestamp = convertToTimestamp(today, formatTimeForInput(now));

    setMinuteForm(prev => ({
      ...prev,
      start_time_stamp: startTimestamp,
      end_time_stamp: endTimestamp
    }));

    // Set default month range for monthly view (last 12 months ending at current month)
    const currentYearNum = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;

    // Calculate start month (11 months ago to show a full year including current)
    let startMonthNum = currentMonthNum - 11;
    let startYearNum = currentYearNum;
    if (startMonthNum <= 0) {
      startMonthNum += 12;
      startYearNum -= 1;
    }

    const startYear = startYearNum.toString();
    const startMonth = startMonthNum.toString().padStart(2, '0');
    const endYear = currentYearNum.toString();
    const endMonth = currentMonthNum.toString().padStart(2, '0');

    setMonthRange({
      startYear,
      startMonth,
      endYear,
      endMonth
    });

    setMonthlyForm(prev => ({
      ...prev,
      start_year: startYear,
      start_month: startMonth,
      end_year: endYear,
      end_month: endMonth
    }));

    // Set default year range for yearly view (last 4 years)
    setYearRange({
      startYear: (parseInt(endYear) - 3).toString(),
      endYear: endYear
    });

    setYearlyForm(prev => ({
      ...prev,
      start_year: (parseInt(endYear) - 3).toString(),
      end_year: endYear
    }));
  }, [formatDateForAPI]);

  // NEW: Effect to auto-fetch graph data when beneficiary is selected
  useEffect(() => {
    if (justSelectedBeneficiary && token && psKey) {
      console.log('Auto-fetching graph data for new beneficiary...');

      // Based on current view mode, fetch the appropriate data
      switch (viewMode) {
        case 'minute':
          if (minuteForm.start_time_stamp && minuteForm.end_time_stamp) {
            fetchMinuteData();
          }
          break;
        case 'daily':
          if (dailyDateRange.startDate && dailyDateRange.endDate) {
            fetchDailyData();
          }
          break;
        case 'monthly_daily':
          if (monthlyDailyDateRange.startDate && monthlyDailyDateRange.endDate) {
            fetchMonthlyDailyData();
          }
          break;
        case 'monthly':
          if (monthRange.startYear && monthRange.startMonth) {
            fetchMonthlyData();
          }
          break;
        case 'yearly':
          if (yearRange.startYear) {
            fetchYearlyData();
          }
          break;
      }

      // Reset the flag
      setJustSelectedBeneficiary(false);
    }
  }, [
    justSelectedBeneficiary,
    token,
    psKey,
    viewMode,
    minuteForm.start_time_stamp,
    minuteForm.end_time_stamp,
    dailyDateRange.startDate,
    dailyDateRange.endDate,
    monthRange.startYear,
    monthRange.startMonth,
    yearRange.startYear
  ]);

  // Also add this effect to auto-fetch when psKey changes
  // Consolidated Auto-Fetch Effect: Triggers when psKey, token, or any relevant view settings change
  useEffect(() => {
    if (!token || !psKey || loading.device) return;

    // Determine if we should fetch based on active viewMode
    let shouldFetch = false;
    let fetchFn = null;

    switch (viewMode) {
      case 'minute':
        shouldFetch = dateTime.startDate && dateTime.startTime && dateTime.endDate && dateTime.endTime;
        fetchFn = fetchMinuteData;
        break;
      case 'daily':
        shouldFetch = dailyDateRange.startDate && dailyDateRange.endDate;
        fetchFn = fetchDailyData;
        break;
      case 'monthly_daily':
        shouldFetch = monthlyDailyDateRange.startDate && monthlyDailyDateRange.endDate;
        fetchFn = fetchMonthlyDailyData;
        break;
      case 'monthly':
        shouldFetch = monthRange.startYear && monthRange.startMonth && monthRange.endYear && monthRange.endMonth;
        fetchFn = fetchMonthlyData;
        break;
      case 'yearly':
        shouldFetch = yearRange.startYear && yearRange.endYear;
        fetchFn = fetchYearlyData;
        break;
      default:
        break;
    }

    if (shouldFetch && fetchFn) {
      console.log(`Auto-fetching ${viewMode} data...`);
      const timeoutId = setTimeout(() => {
        fetchFn();
      }, 500); // Debounce to allow multiple rapid state updates to settle
      return () => clearTimeout(timeoutId);
    }
  }, [
    token, psKey, viewMode,
    dateTime, dailyDateRange, monthlyDailyDateRange, monthRange, yearRange, // Trigger on date/range changes
    selectedParameter, dailyForm.data_point, monthlyDailyForm.data_point, monthlyForm.data_point, yearlyForm.data_point, // Trigger on param changes
    dailyForm.ps_key, monthlyDailyForm.ps_key, monthlyForm.ps_key, yearlyForm.ps_key // Trigger on device changes
  ]);

  // Track when beneficiary is selected and auto-fetch
  useEffect(() => {
    if (justSelectedBeneficiary && token && psKey) {
      console.log('Beneficiary selected, auto-fetching data...');

      // Reset the flag first
      setJustSelectedBeneficiary(false);

      // Then fetch based on current view mode
      const timeoutId = setTimeout(() => {
        switch (viewMode) {
          case 'minute':
            if (minuteForm.start_time_stamp && minuteForm.end_time_stamp) {
              fetchMinuteData();
            }
            break;
          case 'daily':
            if (dailyDateRange.startDate && dailyDateRange.endDate) {
              fetchDailyData();
            }
            break;
          case 'monthly':
            if (monthRange.startYear && monthRange.startMonth) {
              fetchMonthlyData();
            }
            break;
          case 'yearly':
            if (yearRange.startYear) {
              fetchYearlyData();
            }
            break;
        }
      }, 1000); // Give time for psKey to be set in forms

      return () => clearTimeout(timeoutId);
    }
  }, [justSelectedBeneficiary, token, psKey, viewMode]);

  // Update date/time to timestamp for minute data
  const convertToTimestamp = useCallback((date, time) => {
    if (!date || !time) return '';
    let formattedTime = time;
    if (!formattedTime.includes(':')) {
      formattedTime = `${formattedTime}:00`;
    }
    const [hours, minutes] = formattedTime.split(':');
    const formattedDate = date.replace(/-/g, '');
    return `${formattedDate}${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`;
  }, []);

  // Update minute form when date/time changes
  useEffect(() => {
    if (dateTime.startDate && dateTime.startTime && dateTime.endDate && dateTime.endTime) {
      const startTimestamp = convertToTimestamp(dateTime.startDate, dateTime.startTime);
      const endTimestamp = convertToTimestamp(dateTime.endDate, dateTime.endTime);

      setMinuteForm(prev => ({
        ...prev,
        start_time_stamp: startTimestamp,
        end_time_stamp: endTimestamp
      }));
    }
  }, [dateTime, convertToTimestamp]);

  // Synchronization useEffects - REMOVED redundant syncs as fetch functions now use Range states directly




  // Fetch minute data DIRECTLY to Solar API
  const fetchMinuteData = useCallback(async () => {
    if (!token) {
      setError('No login token available. Please login first.');
      return;
    }

    if (!minuteForm.start_time_stamp || !minuteForm.end_time_stamp) {
      setError('Please set valid start and end times');
      return;
    }

    setLoading(prev => ({ ...prev, minute: true }));
    setError('');

    try {
      // Calculate timestamps directly from dateTime state
      const startTimestamp = convertToTimestamp(dateTime.startDate, dateTime.startTime);
      const endTimestamp = convertToTimestamp(dateTime.endDate, dateTime.endTime);

      const requestBody = {
        appkey: SOLAR_APPKEY,
        end_time_stamp: endTimestamp,
        is_get_data_acquisition_time: minuteForm.is_get_data_acquisition_time,
        lang: minuteForm.lang,
        minute_interval: Number(minuteForm.minute_interval),
        points: minuteForm.points,
        ps_key_list: psKey.split(',').map(s => s.trim()),
        start_time_stamp: startTimestamp,
        sys_code: 207
      };

      const response = await fetch('https://gateway.isolarcloud.com.hk/openapi/getDevicePointMinuteDataList', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_SECRET_KEY,
          'sys_code': SOLAR_SYS_CODE,
          'token': token
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.result_code === "1") {
        setMinuteData(result);
        setError('');
      } else {
        setError(`API Error: ${result.result_msg}`);
        setMinuteData(null);
      }
    } catch (err) {
      setError(`Fetch error: ${err.message || 'Unknown error'}`);
      setMinuteData(null);
    } finally {
      setLoading(prev => ({ ...prev, minute: false }));
    }
  }, [token, minuteForm, dateTime, psKey, convertToTimestamp]);

  // Fetch daily data DIRECTLY to Solar API WITH API START DATE LOGIC
  const fetchDailyData = useCallback(async () => {
    if (!token) {
      setError('No login token available. Please login first.');
      return;
    }

    if (!dailyForm.start_date || !dailyForm.end_date) {
      setError('Please set valid start and end dates');
      return;
    }

    // Check if date range exceeds 100 days (API limitation)
    const start = new Date(dailyDateRange.startDate);
    const end = new Date(dailyDateRange.endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 100) {
      setError('Daily data queries are limited to 100 days maximum');
      return;
    }

    setLoading(prev => ({ ...prev, daily: true }));
    setError('');

    try {
      // Calculate API start date (one day before user's start date)
      const start = new Date(dailyDateRange.startDate);
      const end = new Date(dailyDateRange.endDate);
      const apiStart = new Date(start);
      apiStart.setDate(apiStart.getDate() - 1);

      const apiStartDateVal = formatDateForAPI(apiStart);
      const apiEndDateVal = formatDateForAPI(end);

      const requestBody = {
        appkey: SOLAR_APPKEY,
        data_point: dailyForm.data_point,
        data_type: dailyForm.data_type,
        end_time: apiEndDateVal,
        lang: '_en_US',
        order: dailyForm.order,
        ps_key_list: [psKey || dailyForm.ps_key],
        query_type: dailyForm.query_type,
        start_time: apiStartDateVal,
        sys_code: 207
      };

      const response = await fetch('https://gateway.isolarcloud.com.hk/openapi/getDevicePointsDayMonthYearDataList', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_SECRET_KEY,
          'sys_code': SOLAR_SYS_CODE,
          'token': token
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.result_code === "1") {
        setDailyData(result);
        setError('');
      } else {
        setError(`API Error: ${result.result_msg}`);
        setDailyData(null);
      }
    } catch (err) {
      setError(`Fetch error: ${err.message || 'Unknown error'}`);
      setDailyData(null);
    } finally {
      setLoading(prev => ({ ...prev, daily: false }));
    }
  }, [token, dailyForm, dailyDateRange, psKey, formatDateForAPI]);

  // Fetch monthly-daily data (daily data over 30 days)
  const fetchMonthlyDailyData = useCallback(async () => {
    if (!token) {
      setError('No login token available. Please login first.');
      return;
    }

    setLoading(prev => ({ ...prev, monthly_daily: true }));
    setError('');

    try {
      // Calculate API start date (one day before user's start date)
      const start = new Date(monthlyDailyDateRange.startDate);
      const end = new Date(monthlyDailyDateRange.endDate);
      const apiStart = new Date(start);
      apiStart.setDate(apiStart.getDate() - 1);

      const apiStartDateVal = formatDateForAPI(apiStart);
      const apiEndDateVal = formatDateForAPI(end);

      const requestBody = {
        appkey: SOLAR_APPKEY,
        data_point: monthlyDailyForm.data_point,
        data_type: monthlyDailyForm.data_type,
        end_time: apiEndDateVal,
        lang: '_en_US',
        order: monthlyDailyForm.order,
        ps_key_list: [psKey || monthlyDailyForm.ps_key],
        query_type: monthlyDailyForm.query_type,
        start_time: apiStartDateVal,
        sys_code: 207
      };

      const response = await fetch('https://gateway.isolarcloud.com.hk/openapi/getDevicePointsDayMonthYearDataList', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_SECRET_KEY,
          'sys_code': SOLAR_SYS_CODE,
          'token': token
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.result_code === "1") {
        setMonthlyDailyData(result);
        setError('');
      } else {
        setError(`API Error: ${result.result_msg}`);
        setMonthlyDailyData(null);
      }
    } catch (err) {
      setError(`Fetch error: ${err.message || 'Unknown error'}`);
      setMonthlyDailyData(null);
    } finally {
      setLoading(prev => ({ ...prev, monthly_daily: false }));
    }
  }, [token, monthlyDailyForm, monthlyDailyDateRange, psKey, formatDateForAPI]);

  // Fetch monthly data DIRECTLY to Solar API
  const fetchMonthlyData = useCallback(async () => {
    if (!token) {
      setError('No login token available');
      return;
    }

    setLoading(prev => ({ ...prev, monthly: true }));
    setError('');

    try {
      const startYear = parseInt(monthRange.startYear);
      const startMonth = parseInt(monthRange.startMonth);
      let apiStartYear = startYear;
      let apiStartMonth = startMonth - 1;
      if (apiStartMonth <= 0) {
        apiStartMonth = 12;
        apiStartYear -= 1;
      }

      const startTime = `${apiStartYear}${apiStartMonth.toString().padStart(2, '0')}`;
      const endTime = `${monthRange.endYear}${monthRange.endMonth}`;

      const requestBody = {
        appkey: SOLAR_APPKEY,
        data_point: monthlyForm.data_point,
        data_type: monthlyForm.data_type,
        end_time: endTime,
        lang: '_en_US',
        order: monthlyForm.order,
        ps_key_list: [psKey || monthlyForm.ps_key],
        query_type: monthlyForm.query_type,
        start_time: startTime,
        sys_code: 207
      };

      const response = await fetch('https://gateway.isolarcloud.com.hk/openapi/getDevicePointsDayMonthYearDataList', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_SECRET_KEY,
          'sys_code': SOLAR_SYS_CODE,
          'token': token
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (result.result_code === "1") {
        setMonthlyData(result);
      } else {
        setError('API Error: ' + result.result_msg);
      }
    } catch (err) {
      setError('Fetch error: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, monthly: false }));
    }
  }, [token, monthlyForm, monthRange, psKey]);

  // Fetch yearly data DIRECTLY to Solar API
  const fetchYearlyData = useCallback(async () => {
    if (!token) {
      setError('No login token available');
      return;
    }

    setLoading(prev => ({ ...prev, yearly: true }));
    setError('');

    try {
      const startYear = parseInt(yearRange.startYear);
      const apiStartYear = (startYear - 1).toString();

      const startTime = apiStartYear;
      const endTime = yearRange.endYear;

      const requestBody = {
        appkey: SOLAR_APPKEY,
        data_point: yearlyForm.data_point,
        data_type: yearlyForm.data_type,
        end_time: endTime,
        lang: '_en_US',
        order: yearlyForm.order,
        ps_key_list: [psKey || yearlyForm.ps_key],
        query_type: yearlyForm.query_type,
        start_time: startTime,
        sys_code: 207
      };

      const response = await fetch('https://gateway.isolarcloud.com.hk/openapi/getDevicePointsDayMonthYearDataList', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_SECRET_KEY,
          'sys_code': SOLAR_SYS_CODE,
          'token': token
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (result.result_code === "1") {
        setYearlyData(result);
      } else {
        setError('API Error: ' + result.result_msg);
      }
    } catch (err) {
      setError('Fetch error: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, yearly: false }));
    }
  }, [token, yearlyForm, yearRange, psKey]);

  // Format minute data for chart
  const formatMinuteData = useCallback(() => {
    if (!minuteData || !minuteData.result_data) {
      return [];
    }

    const psKey = Object.keys(minuteData.result_data)[0];
    if (!psKey) {
      return [];
    }

    const dataArray = minuteData.result_data[psKey];
    if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
      return [];
    }

    return dataArray.map((item, index) => {
      const time = item.time_stamp;
      let hour = '00';
      let minute = '00';

      if (time && time.length >= 12) {
        hour = time.slice(8, 10);
        minute = time.slice(10, 12);
      }

      return {
        time: `${hour}:${minute}`,
        fullTime: time,
        date: time?.slice(0, 8) || '',
        p5: parseFloat(item.p5 || '0'),
        p6: parseFloat(item.p6 || '0'),
        p18: parseFloat(item.p18 || '0'),
        p21: parseFloat(item.p21 || '0'),
        p24: parseFloat(item.p24 || '0'),
        [selectedParameter]: parseFloat(item[selectedParameter] || '0')
      };
    });
  }, [minuteData, selectedParameter]);

  // Format cumulative data from API (raw Wh to kWh)
  const formatCumulativeData = useCallback(() => {
    const isMonthlyDaily = viewMode === 'monthly_daily';
    const dataSource = isMonthlyDaily ? monthlyDailyData : dailyData;
    const currentStartDate = isMonthlyDaily ? monthlyDailyDateRange.startDate : dailyDateRange.startDate;

    if (!dataSource || !dataSource.result_data) {
      return [];
    }

    const psKey = Object.keys(dataSource.result_data)[0];
    if (!psKey) {
      return [];
    }

    const dataPoint = Object.keys(dataSource.result_data[psKey])[0];
    const dataArray = dataSource.result_data[psKey][dataPoint];

    if (!dataArray || dataArray.length === 0) return [];

    // Sort data by timestamp chronologically
    const sortedData = [...dataArray].sort((a, b) => a.time_stamp.localeCompare(b.time_stamp));

    return sortedData.map((item, index) => {
      const timestamp = item.time_stamp;
      const formattedDate = formatDateFromAPI(timestamp);
      const valueKey = Object.keys(item).find(key => key !== 'time_stamp');

      if (!valueKey) {
        return {
          timestamp,
          date: formattedDate,
          originalWh: 0,
          cumulativeKwh: 0,
          cumulativeWh: 0,
          period: 'Daily',
          isFirstPeriod: currentStartDate && timestamp === currentStartDate.replace(/-/g, '')
        };
      }

      const originalWh = parseFloat(item[valueKey]) || 0;
      const cumulativeKwh = Number((originalWh / 1000).toFixed(2));

      return {
        timestamp,
        date: formattedDate,
        originalWh,
        cumulativeKwh,
        cumulativeWh: originalWh,
        period: 'Daily',
        isFirstPeriod: currentStartDate && timestamp === currentStartDate.replace(/-/g, '')
      };
    });
  }, [viewMode, dailyData, monthlyDailyData, dailyDateRange, monthlyDailyDateRange, formatDateFromAPI]);

  // Filter data to show only from user's start date onwards
  const filterDataFromStartDate = useCallback((data) => {
    const isMonthlyDaily = viewMode === 'monthly_daily';
    const startDate = isMonthlyDaily ? monthlyDailyDateRange.startDate : dailyDateRange.startDate;

    if (!startDate) return data;

    const startTimestamp = startDate.replace(/-/g, '');
    return data.filter(item => {
      return item.timestamp >= startTimestamp;
    });
  }, [dailyDateRange.startDate, monthlyDailyDateRange.startDate, viewMode]);

  // Professional conversion: Cumulative to Period Production WITH PREVIOUS DAY DATA
  const convertCumulativeToPeriodProduction = useCallback((cumulativeData) => {
    if (!Array.isArray(cumulativeData) || cumulativeData.length === 0) {
      return [];
    }

    // Filter data to only show from user's start date onwards
    const filteredData = filterDataFromStartDate(cumulativeData);

    if (filteredData.length === 0) {
      return [];
    }

    // Sort chronologically for correct calculations
    const sortedData = [...filteredData].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Get the full dataset including the day before user's start date
    const allCumulativeData = [...cumulativeData].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    let previousProduction = 0;

    return sortedData.map((current, index) => {
      const currentTimestamp = current.timestamp;

      // Find previous day's data in the full dataset
      const previousDayTimestamp = getPreviousDayTimestamp(currentTimestamp);
      const previousDayData = allCumulativeData.find(item => item.timestamp === previousDayTimestamp);

      let periodKwh = 0;
      let calculation = '';

      if (previousDayData) {
        // We have previous day's data, calculate normally
        periodKwh = current.cumulativeKwh - previousDayData.cumulativeKwh;
        calculation = `${current.cumulativeKwh.toFixed(2)} kWh - ${previousDayData.cumulativeKwh.toFixed(2)} kWh = ${periodKwh.toFixed(2)} kWh`;
      } else {
        // No previous day data, this might be the first day after user's start date
        if (index === 0) {
          // This is the user's start date, check if we have data for the day before
          const isMonthlyDaily = viewMode === 'monthly_daily';
          const startDate = isMonthlyDaily ? monthlyDailyDateRange.startDate : dailyDateRange.startDate;

          if (startDate) {
            const dayBeforeStart = getPreviousDayTimestamp(startDate.replace(/-/g, ''));
            const dayBeforeData = allCumulativeData.find(item => item.timestamp === dayBeforeStart);

            if (dayBeforeData) {
              periodKwh = current.cumulativeKwh - dayBeforeData.cumulativeKwh;
              calculation = `${current.cumulativeKwh.toFixed(2)} kWh - ${dayBeforeData.cumulativeKwh.toFixed(2)} kWh = ${periodKwh.toFixed(2)} kWh`;
            } else {
              // No data for day before, set to 0
              periodKwh = 0;
              calculation = 'No previous day data available, set to 0 kWh';
            }
          } else {
            periodKwh = 0;
            calculation = 'Start date not set';
          }

        } else {
          // Not the first day, use previous day in filtered data
          const previous = sortedData[index - 1];
          periodKwh = current.cumulativeKwh - previous.cumulativeKwh;
          calculation = `${current.cumulativeKwh.toFixed(2)} kWh - ${previous.cumulativeKwh.toFixed(2)} kWh = ${periodKwh.toFixed(2)} kWh`;
        }
      }

      // Prevent negative values (data safeguard)
      const safePeriodKwh = Math.max(0, periodKwh);

      if (periodKwh < 0) {
        console.warn(`Negative period value detected: ${current.date} (${periodKwh.toFixed(2)} kWh). Using 0 instead.`);
      }

      // Calculate growth percentage
      let growth = 0;
      if (index > 0) {
        growth = previousProduction > 0
          ? Number(((safePeriodKwh - previousProduction) / previousProduction * 100).toFixed(1))
          : safePeriodKwh > 0 ? 100 : 0;
      }

      // Store current production for next iteration
      previousProduction = safePeriodKwh;

      return {
        timestamp: current.timestamp,
        date: current.date,
        periodProductionKwh: Number(safePeriodKwh.toFixed(2)),
        cumulativeKwh: current.cumulativeKwh,
        originalWh: current.originalWh,
        period: 'Daily',
        growth,
        calculation,
        isFirstPeriod: index === 0
      };
    });
  }, [filterDataFromStartDate, getPreviousDayTimestamp, dailyDateRange.startDate, monthlyDailyDateRange.startDate, viewMode]);

  // Use useMemo for efficient period data calculation
  const periodData = useMemo(() => {
    if (viewMode !== 'daily' && viewMode !== 'monthly_daily') return [];
    const cumulativeData = formatCumulativeData();
    const result = convertCumulativeToPeriodProduction(cumulativeData);
    return result;
  }, [viewMode, formatCumulativeData, convertCumulativeToPeriodProduction]);

  // Format daily data for chart
  const formatDailyData = useCallback(() => {
    const isMonthlyDaily = viewMode === 'monthly_daily';
    const dataSource = isMonthlyDaily ? monthlyDailyData : dailyData;
    const currentForm = isMonthlyDaily ? monthlyDailyForm : dailyForm;
    const rangeSource = isMonthlyDaily ? monthlyDailyDateRange : dailyDateRange;

    if (!dataSource || !dataSource.result_data) {
      return [];
    }

    const psKey = Object.keys(dataSource.result_data)[0];
    if (!psKey) {
      return [];
    }

    const dataPoint = Object.keys(dataSource.result_data[psKey])[0];
    const dataArray = dataSource.result_data[psKey][dataPoint];

    if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
      return [];
    }

    const today = new Date().toISOString().split('T')[0];
    const isEnergyParam = ['p2', 'p87'].includes(currentForm.data_point);

    // If not an energy parameter, use simple conversion
    if (!isEnergyParam) {
      const sortedData = [...dataArray].sort((a, b) => a.time_stamp.localeCompare(b.time_stamp));
      // Use filterByDateRange instead of filterDataFromStartDate to be explicit with range
      const filteredData = filterByDateRange(sortedData.map(item => ({
        timestamp: item.time_stamp,
        value: parseFloat(item[Object.keys(item).find(key => key !== 'time_stamp') || ''] || '0')
      })), rangeSource.startDate, rangeSource.endDate);

      return filteredData.map((item, index) => {
        const date = formatDateFromAPI(item.timestamp);
        const dayDate = new Date(date);
        const dayOfWeek = dayDate.getDay();

        return {
          date,
          value: item.value,
          formattedValue: item.value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          rawValue: item.value.toString(),
          timestamp: item.timestamp,
          formattedDate: `${shortDayNames[dayOfWeek]} ${date.split('-')[2]}`,
          dayOfWeek: dayNames[dayOfWeek],
          isToday: date === today,
          growth: '',
          isEnergyParameter: false,
          isFirstPeriod: index === 0
        };
      });
    }

    // For energy parameters, use the new conversion logic
    if (conversionMode === 'cumulative') {
      const cumulativeData = formatCumulativeData();
      const filteredCumulativeData = filterDataFromStartDate(cumulativeData);

      return filteredCumulativeData.map((item, index) => {
        const dayDate = new Date(item.date);
        const dayOfWeek = dayDate.getDay();

        return {
          date: item.date,
          value: item.cumulativeKwh,
          formattedValue: item.cumulativeKwh.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          rawValue: item.originalWh.toString(),
          timestamp: item.timestamp,
          formattedDate: `${shortDayNames[dayOfWeek]} ${item.date.split('-')[2]}`,
          dayOfWeek: dayNames[dayOfWeek],
          isToday: item.date === today,
          growth: '',
          dailyKwh: item.cumulativeKwh,
          cumulativeKwh: item.cumulativeKwh,
          formattedCumulativeKwh: item.cumulativeKwh.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          isEnergyParameter: true,
          isFirstPeriod: item.isFirstPeriod,
          cumulativeValue: item.cumulativeKwh,
          originalValue: item.originalWh,
          displayValue: item.cumulativeKwh.toFixed(2),
          unit: 'kWh',
          label: 'Cumulative Energy'
        };
      });
    } else {
      // Period mode
      return periodData.map((item, index) => {
        const dayDate = new Date(item.date);
        const dayOfWeek = dayDate.getDay();

        return {
          date: item.date,
          value: item.periodProductionKwh,
          formattedValue: item.periodProductionKwh.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          rawValue: item.originalWh.toString(),
          timestamp: item.timestamp,
          formattedDate: `${shortDayNames[dayOfWeek]} ${item.date.split('-')[2]}`,
          dayOfWeek: dayNames[dayOfWeek],
          isToday: item.date === today,
          growth: item.growth !== undefined ? item.growth.toString() : '',
          dailyKwh: item.periodProductionKwh,
          cumulativeKwh: item.cumulativeKwh,
          formattedCumulativeKwh: item.cumulativeKwh.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          isEnergyParameter: true,
          isFirstPeriod: item.isFirstPeriod,
          calculation: item.calculation,
          periodProductionKwh: item.periodProductionKwh,
          cumulativeValue: item.cumulativeKwh,
          originalValue: item.originalWh,
          displayValue: item.periodProductionKwh.toFixed(2),
          unit: 'kWh',
          label: 'Daily Production'
        };
      });
    }
  }, [
    viewMode,
    dailyData,
    monthlyDailyData,
    dailyForm,
    monthlyDailyForm,
    dailyDateRange,
    monthlyDailyDateRange,
    formatDateFromAPI,
    filterByDateRange,
    conversionMode,
    formatCumulativeData
  ]);

  // Format monthly data for chart
  const formatMonthlyData = useCallback(() => {
    if (!monthlyData || !monthlyData.result_data) return [];

    const psKey = Object.keys(monthlyData.result_data)[0];
    if (!psKey) return [];

    const dataPoint = Object.keys(monthlyData.result_data[psKey])[0];
    const dataArray = monthlyData.result_data[psKey][dataPoint];

    if (!dataArray || dataArray.length === 0) return [];

    const sortedData = [...dataArray].sort((a, b) => a.time_stamp.localeCompare(b.time_stamp));
    const result = [];
    let previousCumulativeKwh = 0;

    sortedData.forEach((item, index) => {
      const timestamp = item.time_stamp;
      const year = timestamp.slice(0, 4);
      const monthNum = parseInt(timestamp.slice(4, 6));
      const valueKey = Object.keys(item).find(key => key !== 'time_stamp');

      if (!valueKey) return;

      const cumulativeValueWh = parseFloat(item[valueKey]);
      const cumulativeValueKwh = cumulativeValueWh / 1000;
      const monthlyKwh = cumulativeValueKwh - previousCumulativeKwh;

      let growth = '';
      if (index > 0 && result[index - 1].monthlyKwh > 0) {
        const previousMonthlyKwh = result[index - 1].monthlyKwh;
        const growthPercentage = ((monthlyKwh - previousMonthlyKwh) / previousMonthlyKwh) * 100;
        growth = growthPercentage.toFixed(1);
      }

      const dataItem = {
        month: timestamp,
        year,
        monthNum,
        monthlyKwh: monthlyKwh,
        cumulativeKwh: cumulativeValueKwh,
        formattedMonthlyKwh: monthlyKwh.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        rawValue: item[valueKey],
        monthName: monthNames[monthNum - 1],
        date: `${shortMonthNames[monthNum - 1]} ${year}`,
        shortDate: `${shortMonthNames[monthNum - 1]} '${year.slice(2)}`,
        growth,
        value: monthlyKwh,
        kwhValue: monthlyKwh,
        formattedValue: monthlyKwh.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      };

      result.push(dataItem);
      previousCumulativeKwh = cumulativeValueKwh;
    });

    return result
      .filter(item => parseInt(item.month) >= parseInt(`${monthRange.startYear}${monthRange.startMonth}`))
      .sort((a, b) => {
        if (a.year !== b.year) return parseInt(a.year) - parseInt(b.year);
        return a.monthNum - b.monthNum;
      });
  }, [monthlyData, monthRange]);

  // Format yearly data for chart
  const formatYearlyData = useCallback(() => {
    if (!yearlyData || !yearlyData.result_data) return [];

    const psKey = Object.keys(yearlyData.result_data)[0];
    if (!psKey) return [];

    const dataPoint = Object.keys(yearlyData.result_data[psKey])[0];
    const dataArray = yearlyData.result_data[psKey][dataPoint];

    if (!dataArray || dataArray.length === 0) return [];

    const sortedData = [...dataArray].sort((a, b) => parseInt(a.time_stamp) - parseInt(b.time_stamp));
    const result = [];
    let previousCumulativeKwh = 0;

    sortedData.forEach((item, index) => {
      const year = item.time_stamp;
      const valueKey = Object.keys(item).find(key => key !== 'time_stamp');

      if (!valueKey) return;

      const cumulativeValueWh = parseFloat(item[valueKey]);
      const cumulativeValueKwh = cumulativeValueWh / 1000;
      const yearlyKwh = cumulativeValueKwh - previousCumulativeKwh;

      let growth = '';
      if (index > 0 && result[index - 1].monthlyKwh > 0) {
        const previousYearlyKwh = result[index - 1].monthlyKwh;
        const growthPercentage = ((yearlyKwh - previousYearlyKwh) / previousYearlyKwh) * 100;
        growth = growthPercentage.toFixed(1);
      }

      const dataItem = {
        year,
        monthlyKwh: yearlyKwh,
        cumulativeKwh: cumulativeValueKwh,
        formattedMonthlyKwh: yearlyKwh.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        rawValue: item[valueKey],
        growth,
        formattedYear: year,
        value: yearlyKwh,
        kwhValue: yearlyKwh,
        formattedValue: yearlyKwh.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      };

      result.push(dataItem);
      previousCumulativeKwh = cumulativeValueKwh;
    });

    return result
      .filter(item => parseInt(item.year) >= parseInt(yearRange.startYear))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [yearlyData, yearRange]);

  // Get parameter configuration
  const getParamConfig = useCallback((param) => {
    const configs = {
      p5: { label: 'PV2 Voltage', unit: 'V', icon: Zap, color: '#8884d8', gradient: '#8884d822' },
      p6: { label: 'PV1 Current', unit: 'A', icon: Activity, color: '#82ca9d', gradient: '#82ca9d22' },
      p18: { label: 'Grid Voltage', unit: 'V', icon: Gauge, color: '#ffc658', gradient: '#ffc65822' },
      p21: { label: 'Output Current', unit: 'A', icon: Wind, color: '#ff7300', gradient: '#ff730022' },
      p24: { label: 'Output Power', unit: 'W', icon: Battery, color: '#0088fe', gradient: '#0088fe22' },
      p2: { label: 'Total Energy', unit: 'kWh', icon: Battery, color: '#10B981', gradient: '#10B98122' },
      p1: { label: 'Total Power', unit: 'W', icon: Zap, color: '#3B82F6', gradient: '#3B82F622' },
      p25: { label: 'Temperature', unit: '°C', icon: Thermometer, color: '#EC4899', gradient: '#EC489922' },
      p14: { label: 'Grid Voltage', unit: 'V', icon: Gauge, color: '#9C27B0', gradient: '#9C27B022' },
      p87: { label: 'Today Energy', unit: 'kWh', icon: Sun, color: '#FF9800', gradient: '#FF980022' }
    };

    return configs[param] || {
      label: param,
      unit: '',
      icon: Activity,
      color: '#6B7280',
      gradient: '#6B728022'
    };
  }, []);

  // Calculate statistics
  const calculateStats = useCallback(() => {
    if (viewMode === 'minute') {
      const data = formatMinuteData();
      if (data.length === 0) return null;

      const values = data.map(d => d[selectedParameter]);
      const max = Math.max(...values);
      const min = Math.min(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      let sum = values.reduce((a, b) => a + b, 0);
      let unit = getParamConfig(selectedParameter).unit;

      // Integration: Convert Power (W) to Energy (kWh) in minute view
      // Energy (kWh) = Sum of Power(W) * (Interval / 60) / 1000
      if (unit === 'W') {
        const interval = Number(minuteForm.minute_interval) || 10;
        sum = (sum * (interval / 60)) / 1000;
        unit = 'kWh';
      }

      return {
        max,
        min,
        avg,
        sum,
        count: values.length,
        unit: unit
      };
    } else if (viewMode === 'daily' || viewMode === 'monthly_daily') {
      const data = formatDailyData();
      if (data.length === 0) return null;

      const isMonthlyDaily = viewMode === 'monthly_daily';
      const currentForm = isMonthlyDaily ? monthlyDailyForm : dailyForm;

      const values = data.map(d => d.value);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const maxItem = data.find(d => d.value === max);
      const minItem = data.find(d => d.value === min);

      const isEnergyParam = data[0]?.isEnergyParameter || false;

      let totalGrowth = 0;
      let totalCumulativeKwh = 0;

      if (isEnergyParam) {
        if (conversionMode === 'cumulative') {
          const cumulativeData = formatCumulativeData();
          const filteredCumulativeData = filterDataFromStartDate(cumulativeData);
          if (filteredCumulativeData.length >= 2) {
            const firstValue = filteredCumulativeData[0].cumulativeKwh;
            const lastValue = filteredCumulativeData[filteredCumulativeData.length - 1].cumulativeKwh;
            totalGrowth = firstValue > 0 ? ((lastValue - firstValue) / firstValue * 100) : 0;
            totalCumulativeKwh = lastValue;
          }
        } else {
          const periodValues = data.map(d => d.periodProductionKwh || d.value);
          if (periodValues.length >= 2) {
            const firstNonZeroIndex = periodValues.findIndex((val, idx) => idx > 0 && val > 0);
            if (firstNonZeroIndex !== -1) {
              const firstNonZeroValue = periodValues[firstNonZeroIndex];
              const lastPeriodValue = periodValues[periodValues.length - 1];
              totalGrowth = firstNonZeroValue > 0 ? ((lastPeriodValue - firstNonZeroValue) / firstNonZeroValue * 100) : 0;
            }
            totalCumulativeKwh = data.length > 0 ? (data[data.length - 1].cumulativeKwh || 0) : 0;
          }
        }
      }

      return {
        max,
        min,
        avg,
        sum,
        count: values.length,
        maxDate: maxItem ? maxItem.date : '',
        minDate: minItem ? minItem.date : '',
        totalCumulativeKwh,
        totalGrowth,
        nonZeroPeriods: values.filter(v => v > 0).length,
        firstValue: values[0] || 0,
        lastValue: values[values.length - 1] || 0,
        unit: getParamConfig(currentForm.data_point).unit
      };
    } else if (viewMode === 'monthly') {
      const data = formatMonthlyData();
      if (data.length === 0) return null;

      const monthlyKwhValues = data.map(d => d.monthlyKwh);
      const sum = monthlyKwhValues.reduce((a, b) => a + b, 0);
      const avg = sum / monthlyKwhValues.length;
      const max = Math.max(...monthlyKwhValues);
      const min = Math.min(...monthlyKwhValues);
      const maxMonth = data.find(d => d.monthlyKwh === max);
      const minMonth = data.find(d => d.monthlyKwh === min);

      let monthlyGrowth = 0;
      if (data.length > 1) {
        const lastMonthValue = data[data.length - 1].monthlyKwh;
        const secondLastMonthValue = data[data.length - 2].monthlyKwh;
        monthlyGrowth = secondLastMonthValue > 0
          ? ((lastMonthValue - secondLastMonthValue) / secondLastMonthValue * 100)
          : 0;
      }

      const totalCumulativeKwh = data.length > 0 ? data[data.length - 1].cumulativeKwh : 0;

      return {
        sum,
        avg,
        max,
        min,
        maxMonth: maxMonth ? `${maxMonth.monthName} ${maxMonth.year}` : '',
        minMonth: minMonth ? `${minMonth.monthName} ${minMonth.year}` : '',
        count: monthlyKwhValues.length,
        monthlyGrowth: monthlyGrowth.toFixed(1),
        totalCumulativeKwh,
        unit: getParamConfig(monthlyForm.data_point).unit
      };
    } else {
      const data = formatYearlyData();
      if (data.length === 0) return null;

      const yearlyKwhValues = data.map(d => d.monthlyKwh);
      const sum = yearlyKwhValues.reduce((a, b) => a + b, 0);
      const avg = sum / yearlyKwhValues.length;
      const max = Math.max(...yearlyKwhValues);
      const min = Math.min(...yearlyKwhValues);
      const maxYearItem = data.find(d => d.monthlyKwh === max);
      const minYearItem = data.find(d => d.monthlyKwh === min);

      let yearlyGrowth = 0;
      if (data.length > 1) {
        const lastYearValue = data[data.length - 1].monthlyKwh;
        const secondLastYearValue = data[data.length - 2].monthlyKwh;
        yearlyGrowth = secondLastYearValue > 0
          ? ((lastYearValue - secondLastYearValue) / secondLastYearValue * 100)
          : 0;
      }

      const totalCumulativeKwh = data.length > 0 ? data[data.length - 1].cumulativeKwh : 0;

      return {
        sum,
        avg,
        max,
        min,
        maxYear: maxYearItem ? maxYearItem.year : '',
        minYear: minYearItem ? minYearItem.year : '',
        count: yearlyKwhValues.length,
        yearlyGrowth: yearlyGrowth.toFixed(1),
        totalCumulativeKwh,
        unit: getParamConfig(yearlyForm.data_point).unit
      };
    }
  }, [
    viewMode,
    formatMinuteData,
    selectedParameter,
    getParamConfig,
    formatDailyData,
    conversionMode,
    formatCumulativeData,
    filterDataFromStartDate,
    periodData,
    dailyForm.data_point,
    formatMonthlyData,
    monthlyForm.data_point,
    formatYearlyData,
    yearlyForm.data_point
  ]);

  // Custom Tooltip component for daily data WITH PREVIOUS DAY LOGIC
  const CustomTooltip = useCallback(({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      if (viewMode === 'daily' && data.isEnergyParameter) {
        const isCumulative = conversionMode === 'cumulative';

        return (
          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <p className="font-semibold text-gray-900 mb-2">{data.date}</p>
            <div className="space-y-2">
              {isCumulative ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cumulative Energy:</span>
                    <span className="font-semibold text-blue-600 ml-2">
                      {data.cumulativeKwh?.toFixed(2) || data.value?.toFixed(2)} kWh
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Original Wh:</span>
                    <span className="font-semibold text-gray-900">
                      {data.originalValue?.toLocaleString() || (data.value * 1000).toLocaleString()} Wh
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Daily Production:</span>
                    <span className={`font-semibold ${data.isFirstPeriod ? 'text-gray-500' : 'text-green-600'} ml-2`}>
                      {data.periodProductionKwh?.toFixed(2) || data.value?.toFixed(2)} kWh
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cumulative to Date:</span>
                    <span className="font-semibold text-blue-600">
                      {data.cumulativeValue?.toFixed(2) || data.cumulativeKwh?.toFixed(2)} kWh
                    </span>
                  </div>
                  {data.growth !== undefined && !data.isFirstPeriod && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Growth:</span>
                      <span className={`font-semibold ${parseFloat(data.growth) > 0 ? 'text-green-600' : parseFloat(data.growth) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {parseFloat(data.growth) > 0 ? '↑' : parseFloat(data.growth) < 0 ? '↓' : '→'} {Math.abs(parseFloat(data.growth))}%
                      </span>
                    </div>
                  )}
                </>
              )}

              {data.isFirstPeriod && conversionMode === 'period' && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Info className="w-3 h-3" />
                    <span>Calculated using previous day's cumulative data</span>
                  </div>
                </div>
              )}

              {!isCumulative && data.calculation && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">{data.calculation}</p>
                </div>
              )}
            </div>
          </div>
        );
      }

      // Default tooltip for other modes
      return (
        <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-gray-700">
            {payload[0].name}: {payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  }, [viewMode, conversionMode]);

  // Export data
  const exportData = useCallback(() => {
    if (viewMode === 'minute') {
      const data = formatMinuteData();
      if (data.length === 0) {
        setError('No data to export');
        return;
      }

      const headers = ['Time', 'Date', ...minuteForm.points.split(',').map(p => getParamConfig(p).label)];
      const csvContent = [
        headers.join(','),
        ...data.map(row => {
          const values = minuteForm.points.split(',').map(p => row[p]);
          return `${row.time},${row.date},${values.join(',')}`;
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minute-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (viewMode === 'daily') {
      const data = formatDailyData();
      if (data.length === 0) {
        setError('No data to export');
        return;
      }

      const isEnergy = data[0]?.isEnergyParameter || false;
      const headers = isEnergy
        ? conversionMode === 'cumulative'
          ? ['Date', 'Day', 'Cumulative (kWh)', 'Cumulative (Wh)', 'Period Type', 'Is First Period']
          : ['Date', 'Day', 'Daily Production (kWh)', 'Cumulative (kWh)', 'Growth %', 'Calculation', 'Original (Wh)', 'Is First Period']
        : ['Date', 'Day', 'Value', 'Raw Value'];

      const csvContent = [
        headers.join(','),
        ...(isEnergy
          ? (conversionMode === 'cumulative'
            ? filterDataFromStartDate(formatCumulativeData()).map(row =>
              `${row.date},${dayNames[new Date(row.date).getDay()]},${row.cumulativeKwh.toFixed(2)},${row.originalWh},Daily,${row.isFirstPeriod ? 'Yes' : 'No'}`
            )
            : periodData.map(row =>
              `${row.date},${dayNames[new Date(row.date).getDay()]},${row.periodProductionKwh.toFixed(2)},${row.cumulativeKwh.toFixed(2)},${row.growth || 0},${row.calculation},${row.originalWh},${row.isFirstPeriod ? 'Yes' : 'No'}`
            )
          )
          : data.map(row =>
            `${row.date},${row.dayOfWeek},${row.value},${row.rawValue}`
          )
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-${conversionMode}-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (viewMode === 'monthly') {
      const data = formatMonthlyData();
      if (data.length === 0) {
        setError('No data to export');
        return;
      }

      const headers = ['Year', 'Month', 'Monthly Production (kWh)', 'Cumulative Energy (kWh)', 'Growth %', 'Raw Value (Wh)'];
      const csvContent = [
        headers.join(','),
        ...data.map(row => {
          return [
            row.year,
            row.monthName,
            row.monthlyKwh.toFixed(2),
            row.cumulativeKwh.toFixed(2),
            row.growth ? `${row.growth}%` : '0%',
            row.rawValue
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monthly-energy-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const data = formatYearlyData();
      if (data.length === 0) {
        setError('No data to export');
        return;
      }

      const headers = ['Year', 'Yearly Production (kWh)', 'Cumulative Energy (kWh)', 'Growth %', 'Raw Value (Wh)'];
      const csvContent = [
        headers.join(','),
        ...data.map(row => {
          return [
            row.year,
            row.monthlyKwh.toFixed(2),
            row.cumulativeKwh.toFixed(2),
            row.growth ? `${row.growth}%` : '0%',
            row.rawValue
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yearly-energy-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  }, [
    viewMode,
    formatMinuteData,
    minuteForm.points,
    getParamConfig,
    formatDailyData,
    conversionMode,
    filterDataFromStartDate,
    formatCumulativeData,
    periodData,
    formatMonthlyData,
    formatYearlyData
  ]);

  // Quick presets for daily data WITH API START DATE LOGIC
  const applyDailyPreset = useCallback((preset) => {
    const now = new Date();
    const start = new Date();

    switch (preset) {
      case 'week': start.setDate(now.getDate() - 7); break;
      case 'month': start.setMonth(now.getMonth() - 1); break;
      case '3months': start.setMonth(now.getMonth() - 3); break;
      case '6months': start.setMonth(now.getMonth() - 6); break;
      case 'year': start.setFullYear(now.getFullYear() - 1); break;
    }

    const formatForDisplay = (date) => date.toISOString().split('T')[0];
    const displayStartDate = formatForDisplay(start);
    const displayEndDate = formatForDisplay(now);

    setDailyDateRange({
      startDate: displayStartDate,
      endDate: displayEndDate
    });

    // Calculate API start date
    const apiStart = new Date(displayStartDate);
    apiStart.setDate(apiStart.getDate() - 1);
    setApiStartDate(formatDateForAPI(apiStart));
  }, [formatDateForAPI]);

  // Quick presets for monthly data
  const applyMonthPreset = useCallback((preset) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    switch (preset) {
      case 'thisYear':
        setMonthRange({
          startYear: currentYear.toString(),
          startMonth: '01',
          endYear: currentYear.toString(),
          endMonth: currentMonth.toString().padStart(2, '0')
        });
        break;
      case 'lastYear':
        setMonthRange({
          startYear: (currentYear - 1).toString(),
          startMonth: '01',
          endYear: (currentYear - 1).toString(),
          endMonth: '12'
        });
        break;
      case 'last6months':
        let startMonth = currentMonth - 5;
        let startYear = currentYear;
        if (startMonth < 1) {
          startMonth += 12;
          startYear -= 1;
        }
        setMonthRange({
          startYear: startYear.toString(),
          startMonth: startMonth.toString().padStart(2, '0'),
          endYear: currentYear.toString(),
          endMonth: currentMonth.toString().padStart(2, '0')
        });
        break;
      case 'yearToDate':
        setMonthRange({
          startYear: currentYear.toString(),
          startMonth: '01',
          endYear: currentYear.toString(),
          endMonth: currentMonth.toString().padStart(2, '0')
        });
        break;
    }
  }, []);

  // Quick presets for yearly data
  const applyYearPreset = useCallback((preset) => {
    const now = new Date();
    const currentYear = now.getFullYear();

    switch (preset) {
      case 'last5years':
        setYearRange({
          startYear: (currentYear - 4).toString(),
          endYear: currentYear.toString()
        });
        break;
      case 'last10years':
        setYearRange({
          startYear: (currentYear - 9).toString(),
          endYear: currentYear.toString()
        });
        break;
      case 'decade':
        const decadeStart = Math.floor(currentYear / 10) * 10;
        setYearRange({
          startYear: decadeStart.toString(),
          endYear: (decadeStart + 9).toString()
        });
        break;
      case 'allYears':
        setYearRange({
          startYear: '2020',
          endYear: currentYear.toString()
        });
        break;
    }
  }, []);

  // Calculate stats for chart header
  const stats = useMemo(() => calculateStats(), [calculateStats]);

  // PROFESSIONAL RENDER CHART FUNCTION
  const renderChart = useCallback(() => {
    let data = [];
    let paramConfig = {};
    let dataKey = '';

    // Get data based on view mode
    if (viewMode === 'minute') {
      data = formatMinuteData();
      paramConfig = getParamConfig(selectedParameter);
      dataKey = selectedParameter;
    } else if (viewMode === 'daily' || viewMode === 'monthly_daily') {
      data = formatDailyData();
      paramConfig = getParamConfig(viewMode === 'monthly_daily' ? monthlyDailyForm.data_point : dailyForm.data_point);
      dataKey = 'value';
    } else if (viewMode === 'monthly') {
      data = formatMonthlyData();
      paramConfig = getParamConfig(monthlyForm.data_point);
      dataKey = 'value';
    } else {
      data = formatYearlyData();
      paramConfig = getParamConfig(yearlyForm.data_point);
      dataKey = 'value';
    }

    if (data.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded-xl">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No data available for chart</p>
            <p className="text-sm text-gray-400 mt-2">
              {viewMode === 'minute' ? 'Load minute data to visualize' :
                viewMode === 'daily' ? 'Load daily data to visualize' :
                  viewMode === 'monthly' ? 'Load monthly data to visualize' :
                    'Load yearly data to visualize'}
            </p>
          </div>
        </div>
      );
    }

    const chartHeight = isFullScreen ? '70vh' : '500px';

    // Transform data for Recharts with proper structure
    const chartData = data.map((item) => {
      if (viewMode === 'minute') {
        return {
          name: item.time,
          [dataKey]: item[dataKey],
          ...item
        };
      } else if (viewMode === 'daily' || viewMode === 'monthly_daily') {
        return {
          name: item.formattedDate || item.date,
          value: item.value,
          date: item.date,
          formattedDate: item.formattedDate,
          ...item
        };
      } else if (viewMode === 'monthly') {
        return {
          name: item.shortDate || item.monthName,
          value: item.value,
          date: item.date,
          monthName: item.monthName,
          ...item
        };
      } else {
        return {
          name: item.year,
          value: item.value,
          year: item.year,
          ...item
        };
      }
    });

    // Prepare chart props
    const chartProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 40, bottom: 40 },
    };

    const renderXAxis = () => {
      if (viewMode === 'minute') {
        return (
          <XAxis
            dataKey="name"
            label={{ value: 'Time', position: 'insideBottom', offset: -10 }}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              if (value && typeof value === 'string') {
                const [hours, minutes] = value.split(':');
                return `${hours}:${minutes}`;
              }
              return value;
            }}
          />
        );
      } else if (viewMode === 'daily' || viewMode === 'monthly_daily') {
        return (
          <XAxis
            dataKey="name"
            label={{ value: 'Date', position: 'insideBottom', offset: -10 }}
            tick={{ fontSize: 10 }} // Reduce font size slightly to fit all
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
        );
      } else if (viewMode === 'monthly') {
        return (
          <XAxis
            dataKey="name"
            label={{ value: 'Month', position: 'insideBottom', offset: -10 }}
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
        );
      } else {
        return (
          <XAxis
            dataKey="name"
            label={{ value: 'Year', position: 'insideBottom', offset: -10 }}
            tick={{ fontSize: 12 }}
          />
        );
      }
    };

    const renderYAxis = () => (
      <YAxis
        tickFormatter={(value) => {
          if (Math.abs(value) >= 1000) {
            return `${(value / 1000).toFixed(1)}k`;
          }
          return value.toLocaleString();
        }}
        label={{
          value: `${paramConfig.label} (${paramConfig.unit})`,
          angle: -90,
          position: 'insideLeft',
          offset: 15,
          style: { textAnchor: 'middle' }
        }}
        width={80}
        tick={{ fontSize: 12 }}
      />
    );

    const renderTooltip = () => (
      <Tooltip
        content={viewMode === 'daily' && data[0]?.isEnergyParameter ? <CustomTooltip /> : undefined}
        contentStyle={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          fontSize: '14px'
        }}
        formatter={(value) => {
          if (typeof value === 'number') {
            return [value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }), paramConfig.label];
          }
          return [value, paramConfig.label];
        }}
      />
    );

    const renderBrush = () => {
      if (viewMode !== 'minute' && chartData.length > 10) {
        return (
          <Brush
            dataKey="name"
            height={30}
            stroke={paramConfig.color}
            fill="#f8fafc"
            travellerWidth={10}
          />
        );
      }
      return null;
    };

    const renderLegend = () => (
      <Legend
        verticalAlign="top"
        height={36}
        formatter={(value) => <span style={{ fontSize: '14px', color: '#374151' }}>{value}</span>}
      />
    );

    // Render chart based on type - BAR CHART IS NOW DEFAULT
    const renderChartContent = () => {
      const commonProps = {
        type: 'monotone',
        stroke: paramConfig.color,
        strokeWidth: chartConfig.strokeWidth,
        fillOpacity: chartConfig.gradient ? 0.3 : 0.6,
        dot: chartConfig.showPoints ? { strokeWidth: 2, r: 4 } : false,
        activeDot: { r: 6, strokeWidth: 2 },
        isAnimationActive: chartConfig.animate,
      };

      // CHANGED: 'bar' case is now first (since it's default)
      switch (chartType) {
        case 'bar': // DEFAULT CHART TYPE
          return (
            <BarChart {...chartProps}>
              <defs>
                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={paramConfig.color} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={paramConfig.color} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              {chartConfig.showGrid && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
              )}
              {renderXAxis()}
              {renderYAxis()}
              {renderTooltip()}
              {renderLegend()}
              <Bar
                dataKey={dataKey}
                name={`${paramConfig.label} (${paramConfig.unit})`}
                fill="url(#colorBar)"
                fillOpacity={0.8}
                stroke={paramConfig.color}
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
                barSize={viewMode === 'minute' ? 30 : 50}
                isAnimationActive={chartConfig.animate}
              />
              {renderBrush()}
            </BarChart>
          );

        case 'area':
          return (
            <AreaChart {...chartProps}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={paramConfig.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={paramConfig.color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              {chartConfig.showGrid && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
              )}
              {renderXAxis()}
              {renderYAxis()}
              {renderTooltip()}
              {renderLegend()}
              <Area
                {...commonProps}
                dataKey={dataKey}
                name={`${paramConfig.label} (${paramConfig.unit})`}
                fill={chartConfig.gradient ? "url(#colorGradient)" : paramConfig.color}
              />
              {renderBrush()}
            </AreaChart>
          );

        case 'line':
          return (
            <LineChart {...chartProps}>
              {chartConfig.showGrid && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
              )}
              {renderXAxis()}
              {renderYAxis()}
              {renderTooltip()}
              {renderLegend()}
              <Line
                {...commonProps}
                dataKey={dataKey}
                name={`${paramConfig.label} (${paramConfig.unit})`}
                strokeWidth={chartConfig.strokeWidth + 1}
              />
              {renderBrush()}
            </LineChart>
          );

        default:
          // Default to bar chart if unknown type
          return (
            <BarChart {...chartProps}>
              <defs>
                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={paramConfig.color} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={paramConfig.color} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              {chartConfig.showGrid && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
              )}
              {renderXAxis()}
              {renderYAxis()}
              {renderTooltip()}
              {renderLegend()}
              <Bar
                dataKey={dataKey}
                name={`${paramConfig.label} (${paramConfig.unit})`}
                fill="url(#colorBar)"
                fillOpacity={0.8}
                stroke={paramConfig.color}
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
                barSize={viewMode === 'minute' ? 30 : 50}
                isAnimationActive={chartConfig.animate}
              />
              {renderBrush()}
            </BarChart>
          );
      }
    };

    return (
      <div className={`relative ${isFullScreen ? 'fixed inset-0 z-50 bg-white p-8 ' : ''}`}>

        {/* Chart Container with Professional Styling */}
        <div className="relative" style={{ height: chartHeight }}>
          {/* Chart Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center mb-4 px-4 pt-2">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: paramConfig.color }}
              />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {paramConfig.label} {
                    viewMode === 'minute' ? 'Daily' :
                      viewMode === 'daily' ? 'Weekly' :
                        viewMode === 'monthly_daily' ? 'Monthly' :
                          viewMode === 'monthly' ? 'Yearly' :
                            'Life Time'
                  } Data
                  {['minute', 'daily', 'monthly_daily', 'monthly', 'yearly'].includes(viewMode) && stats && (
                    <div className="flex items-center gap-4 ml-8">
                      <span className="inline-flex items-center px-4 py-2 rounded-lg text-base font-bold bg-white text-blue-700 border border-blue-200 shadow-md ring-4 ring-blue-50 transition-all hover:shadow-lg">
                        Total: {stats.sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {stats.unit}
                      </span>
                      {viewMode === 'daily' && (
                        <>
                          <span className="inline-flex items-center px-4 py-2 rounded-lg text-base font-bold bg-white text-emerald-700 border border-emerald-200 shadow-md ring-4 ring-emerald-50 transition-all hover:shadow-lg">
                            Avg/Day: {(stats.sum / 7).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {stats.unit}
                          </span>
                          <span className="inline-flex items-center px-4 py-2 rounded-lg text-base font-bold bg-white text-purple-700 border border-purple-200 shadow-md ring-4 ring-purple-50 transition-all hover:shadow-lg">
                            Spec. Yield: {((stats.sum / 7) / inverterCapacity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {stats.unit}/kW
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </h3>
                <p className="text-xs text-gray-500">
                  {viewMode === 'minute'
                    ? `${dateTime.startDate} ${dateTime.startTime} - ${dateTime.endDate} ${dateTime.endTime}`
                    : viewMode === 'daily'
                      ? `${dailyDateRange.startDate} - ${dailyDateRange.endDate}`
                      : viewMode === 'monthly_daily'
                        ? `${monthlyDailyDateRange.startDate} - ${monthlyDailyDateRange.endDate}`
                        : viewMode === 'monthly'
                          ? `${monthRange.startYear}-${monthRange.startMonth} to ${monthRange.endYear}-${monthRange.endMonth}`
                          : `${yearRange.startYear} - ${yearRange.endYear}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Chart Area */}
          <div className="h-full pt-12">
            <ResponsiveContainer width="100%" height="100%">
              {renderChartContent()}
            </ResponsiveContainer>
          </div>

          {/* Chart Footer */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 text-xs text-gray-500 flex justify-between">
            <span>Total Data Points: {data.length}</span>
            <span>
              {viewMode === 'daily' && data[0]?.isEnergyParameter
                ? `Mode: ${conversionMode === 'cumulative' ? 'Cumulative kWh' : 'Daily Production'}`
                : `View: ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}`
              }
            </span>
          </div>
        </div>
      </div>
    );
  }, [
    viewMode,
    formatMinuteData,
    selectedParameter,
    getParamConfig,
    formatDailyData,
    dailyForm.data_point,
    formatMonthlyData,
    monthlyForm.data_point,
    formatYearlyData,
    yearlyForm.data_point,
    isFullScreen,
    dateTime,
    dailyDateRange,
    monthRange,
    yearRange,
    chartType,
    chartConfig,
    CustomTooltip,
    conversionMode,
    stats
  ]);

  // Get fetch function based on view mode
  const getFetchFunction = useCallback(() => {
    switch (viewMode) {
      case 'minute': return fetchMinuteData;
      case 'daily': return fetchDailyData;
      case 'monthly': return fetchMonthlyData;
      case 'yearly': return fetchYearlyData;
      default: return fetchMinuteData;
    }
  }, [viewMode, fetchMinuteData, fetchDailyData, fetchMonthlyData, fetchYearlyData]);

  // Get loading state based on view mode
  const getLoadingState = useCallback(() => {
    switch (viewMode) {
      case 'minute': return loading.minute;
      case 'daily': return loading.daily;
      case 'monthly': return loading.monthly;
      case 'yearly': return loading.yearly;
      default: return false;
    }
  }, [viewMode, loading]);

  return (
    <div className={`min-h-screen ${isFullScreen ? 'overflow-hidden' : 'bg-gradient-to-br from-gray-50 to-gray-100 p-0  '}`}>
      {!isFullScreen && (
        <div className="w-full max-h-screen ">
          {/* Header */}
          <div className="mb-8 ">

            {/* View Mode Toggle */}
            <div className="flex items-center justify-end mb-6">
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                <button
                  onClick={() => setViewMode('minute')}
                  className={`px-6 py-3 rounded-md font-medium transition flex items-center gap-2 ${viewMode === 'minute'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                    }`}
                >
                  <Clock className="w-5 h-5" />
                  Daily Data
                </button>
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-6 py-3 rounded-md font-medium transition flex items-center gap-2 ${viewMode === 'daily'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                    }`}
                >
                  <Sun className="w-5 h-5" />
                  Weekly Data
                </button>
                <button
                  onClick={() => setViewMode('monthly_daily')}
                  className={`px-6 py-3 rounded-md font-medium transition flex items-center gap-2 ${viewMode === 'monthly_daily'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                    }`}
                >
                  <CalendarDays className="w-5 h-5" />
                  Monthly Data
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-6 py-3 rounded-md font-medium transition flex items-center gap-2 ${viewMode === 'monthly'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                    }`}
                >
                  <Calendar className="w-5 h-5" />
                  Yearly Data
                </button>
                <button
                  onClick={() => setViewMode('yearly')}
                  className={`px-6 py-3 rounded-md font-medium transition flex items-center gap-2 ${viewMode === 'yearly'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                    }`}
                >
                  <CalendarDays className="w-5 h-5" />
                  Life Time Data
                </button>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Panel - Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* AutoLogin Component */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <AutoLogin
                  onTokenChange={handleTokenChange}
                  onDeviceDataChange={handleDeviceDataChange}
                  onBeneficiarySelect={handleBeneficiarySelect}
                />
              </div>

              {/* Configuration Panel */}
              <ConfigurationPanel
                psKey={psKey}
                // Add this prop to handle fetch requests
                onFetchData={() => {
                  console.log('Manual fetch triggered for view mode:', viewMode);
                  switch (viewMode) {
                    case 'minute':
                      if (minuteForm.start_time_stamp && minuteForm.end_time_stamp) {
                        fetchMinuteData();
                      } else {
                        setError('Please set valid start and end times for minute data');
                      }
                      break;
                    case 'daily':
                      if (dailyDateRange.startDate && dailyDateRange.endDate) {
                        fetchDailyData();
                      } else {
                        setError('Please set valid date range for daily data');
                      }
                      break;
                    case 'monthly_daily':
                      if (monthlyDailyDateRange.startDate && monthlyDailyDateRange.endDate) {
                        fetchMonthlyDailyData();
                      } else {
                        setError('Please set valid date range for monthly data');
                      }
                      break;
                    case 'monthly':
                      if (monthRange.startYear && monthRange.startMonth) {
                        fetchMonthlyData();
                      } else {
                        setError('Please set valid month and year for monthly data');
                      }
                      break;
                    case 'yearly':
                      if (yearRange.startYear) {
                        fetchYearlyData();
                      } else {
                        setError('Please set valid year range for yearly data');
                      }
                      break;
                    default:
                      setError('Please select a valid view mode');
                  }
                }}
                viewMode={viewMode}
                conversionMode={conversionMode}
                setConversionMode={setConversionMode}
                dateTime={dateTime}
                setDateTime={setDateTime}
                minuteForm={minuteForm}
                setMinuteForm={setMinuteForm}
                selectedParameter={selectedParameter}
                setSelectedParameter={setSelectedParameter}
                dailyDateRange={dailyDateRange}
                setDailyDateRange={setDailyDateRange}
                dailyForm={dailyForm}
                setDailyForm={setDailyForm}
                monthlyDailyDateRange={monthlyDailyDateRange}
                setMonthlyDailyDateRange={setMonthlyDailyDateRange}
                monthlyDailyForm={monthlyDailyForm}
                setMonthlyDailyForm={setMonthlyDailyForm}
                applyDailyPreset={applyDailyPreset}
                monthRange={monthRange}
                setMonthRange={setMonthRange}
                monthlyForm={monthlyForm}
                setMonthlyForm={setMonthlyForm}
                applyMonthPreset={applyMonthPreset}
                yearRange={yearRange}
                setYearRange={setYearRange}
                yearlyForm={yearlyForm}
                setYearlyForm={setYearlyForm}
                applyYearPreset={applyYearPreset}
                token={token}
                loading={loading}
                error={error}
                getFetchFunction={getFetchFunction}
                getLoadingState={getLoadingState}
                minuteData={minuteData}
                dailyData={dailyData}
                monthlyData={monthlyData}
                yearlyData={yearlyData}
                formatMinuteData={formatMinuteData}
                formatDailyData={formatDailyData}
                formatMonthlyData={formatMonthlyData}
                formatYearlyData={formatYearlyData}
              />
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 " ref={chartContainerRef}>
                {renderChart()}
              </div>

              {/* Chart Settings Panel */}
              <ChartSettingsPanel
                chartType={chartType}
                setChartType={setChartType}
                chartConfig={chartConfig}
                setChartConfig={setChartConfig}
              />
            </div>
          </div>
        </div>
      )}

      {isFullScreen && renderChart()}
    </div>
  );
};

export default CombinedAreaChart;