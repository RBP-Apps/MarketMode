// components/WeeklyPerformanceReport.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDeviceContext } from './DeviceContext'; // Corrected path
import AdminLayout from '../../components/layout/AdminLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, ReferenceLine,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Calendar, Download, Filter, RefreshCw, BarChart3,
  TrendingUp, Zap, Battery, Sun, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Maximize2, Minimize2,
  Layers, Database, Calculator, Info, Users, Grid3x3,
  Clock, CalendarDays, Search, X, DownloadCloud,
  ArrowUpRight, ArrowDownRight, Target, LogIn, Wifi, WifiOff,
  Save, Upload, Server, FileText, Bell
} from 'lucide-react';

// Environment variables - with fallbacks for development
const SOLAR_APPKEY = import.meta.env.VITE_SOLAR_APP_KEY || '';
const SOLAR_SECRET_KEY = import.meta.env.VITE_SOLAR_SECRET_KEY || '';
const SOLAR_SYS_CODE = import.meta.env.VITE_SOLAR_SYS_CODE || '207';
const USER_ACCOUNT = import.meta.env.VITE_USER_ACCOUNT || '';
const USER_PASSWORD = import.meta.env.VITE_USER_PASSWORD || '';
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec";
const SHEET_NAME = "Inverter_id";

// Cache utility functions - Moved outside component
const CACHE_KEYS = {
  PS_KEYS: 'wpr_ps_keys_cache',
  TOKEN: 'solarToken',
  TOKEN_TIMESTAMP: 'solarTokenTimestamp',
  SYNC_INFO: 'csvSyncInfo',
  LAST_CSV_SYNC: 'lastCSVSync',
  AUTO_SYNC_STATUS: 'autoSyncStatus',
  LAST_AUTO_SYNC_DATE: 'lastAutoSyncDate'
};

const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    // Check if cache is expired (older than 24 hours for PS keys)
    if (key === CACHE_KEYS.PS_KEYS) {
      const cacheAge = Date.now() - parsed.timestamp;
      if (cacheAge > 24 * 60 * 60 * 1000) { // 24 hours
        localStorage.removeItem(key);
        return null;
      }
    }
    return parsed.data;
  } catch (e) {
    console.warn('Cache read error:', e);
    localStorage.removeItem(key);
    return null;
  }
};

const setCachedData = (key, data, timestamp = Date.now()) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp }));
  } catch (e) {
    console.warn('Cache write error:', e);
  }
};

const clearCachedData = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Cache clear error:', e);
  }
};

// Helper function to format date as dd/mm/yyyy
const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
};

const WeeklyPerformanceReport = () => {
  const { token, setToken, clearToken } = useDeviceContext();

  // Login state
  const [localToken, setLocalToken] = useState(token || '');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // State variables
  const [loading, setLoading] = useState({
    inverters: false,
    data: false,
    allData: false
  });
  const [error, setError] = useState('');
  const [inverters, setInverters] = useState([]);
  const [selectedInverters, setSelectedInverters] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });

  // Sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    lastSync: null,
    count: 0,
    totalRows: 0,
    timestamp: null,
    format: null
  });

  // Auto-sync state
  const [autoSyncStatus, setAutoSyncStatus] = useState({
    enabled: false,
    lastAutoSync: null,
    nextAutoSync: null,
    days: ['Monday', 'Wednesday'],
    isTodayAutoSyncDay: false,
    autoSyncTriggered: false
  });

  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
    customRange: false
  });

  // UI state
  const [chartType, setChartType] = useState('bar');
  const [sortBy, setSortBy] = useState('specYield');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [expandedView, setExpandedView] = useState('chart');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Use refs to store functions that can be called from useEffect
  const syncCSVFormatRef = useRef(null);
  const autoSyncTriggeredRef = useRef(false);

  // Toast notification helper
  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, duration);
  }, []);

  // Check if today is Monday or Wednesday
  const isTodayAutoSyncDay = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
    return dayOfWeek === 1 || dayOfWeek === 3; // Monday or Wednesday
  }, []);

  // Get day name
  const getDayName = useCallback((dayNumber) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
  }, []);

  // Calculate next auto-sync date
  const getNextAutoSyncDate = useCallback((today) => {
    const nextDate = new Date(today);
    const dayOfWeek = today.getDay();
    
    // If today is Monday, next is Wednesday (2 days)
    // If today is Wednesday, next is Monday (5 days)
    if (dayOfWeek === 1) { // Monday
      nextDate.setDate(nextDate.getDate() + 2);
    } else if (dayOfWeek === 3) { // Wednesday
      nextDate.setDate(nextDate.getDate() + 5);
    } else {
      // Find next Monday
      const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
      nextDate.setDate(nextDate.getDate() + daysUntilMonday);
    }
    
    return nextDate;
  }, []);

  // Check and update auto-sync status
  const checkAutoSyncDay = useCallback(() => {
    const today = new Date();
    const isToday = isTodayAutoSyncDay();
    const lastAutoSyncDate = getCachedData(CACHE_KEYS.LAST_AUTO_SYNC_DATE);
    
    // Calculate next auto-sync date
    const nextAutoSync = new Date(today);
    if (isToday) {
      // If today is auto-sync day, check if already synced
      const todayStr = today.toDateString();
      const hasSyncedToday = lastAutoSyncDate === todayStr;
      
      if (!hasSyncedToday) {
        setAutoSyncStatus(prev => ({
          ...prev,
          isTodayAutoSyncDay: true,
          lastAutoSync: lastAutoSyncDate ? new Date(lastAutoSyncDate) : null,
          nextAutoSync: today,
          autoSyncTriggered: false
        }));
      } else {
        setAutoSyncStatus(prev => ({
          ...prev,
          isTodayAutoSyncDay: true,
          lastAutoSync: new Date(lastAutoSyncDate),
          nextAutoSync: getNextAutoSyncDate(today),
          autoSyncTriggered: true
        }));
      }
    } else {
      // Calculate next auto-sync date
      setAutoSyncStatus(prev => ({
        ...prev,
        isTodayAutoSyncDay: false,
        lastAutoSync: lastAutoSyncDate ? new Date(lastAutoSyncDate) : null,
        nextAutoSync: getNextAutoSyncDate(today),
        autoSyncTriggered: false
      }));
    }
  }, [isTodayAutoSyncDay, getNextAutoSyncDate]);

  // Calculate number of days in date range
  const calculateDaysInRange = useCallback(() => {
    if (!dateRange.startDate || !dateRange.endDate) return 7;

    try {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 7;
      }

      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch (e) {
      console.error('Error calculating days:', e);
      return 7;
    }
  }, [dateRange]);

  // Initialize default date range (last 7 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setDateRange({
      startDate: formatDate(start),
      endDate: formatDate(end),
      customRange: false
    });

    // Restore sync status
    const savedSyncInfo = getCachedData(CACHE_KEYS.SYNC_INFO);
    if (savedSyncInfo) {
      try {
        const syncInfo = JSON.parse(savedSyncInfo);
        if (syncInfo.lastSync) {
          syncInfo.lastSync = new Date(syncInfo.lastSync);
          setSyncStatus(syncInfo);
        }
      } catch (err) {
        console.warn("Failed to restore sync info:", err);
        clearCachedData(CACHE_KEYS.SYNC_INFO);
      }
    }

    // Restore auto-sync status
    const savedAutoSyncStatus = getCachedData(CACHE_KEYS.AUTO_SYNC_STATUS);
    if (savedAutoSyncStatus) {
      setAutoSyncStatus(savedAutoSyncStatus);
    }

    // Check if today is auto-sync day
    checkAutoSyncDay();
  }, [checkAutoSyncDay]);

  // Format date for API
  const formatDateForAPI = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }, []);

  // Fetch inverter list from Google Sheets
  const fetchInverterList = useCallback(async () => {
    if (loading.inverters) return;

    setLoading(prev => ({ ...prev, inverters: true }));
    setError('');

    try {
      const url = `${GOOGLE_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}&action=fetch`;
      console.log('Fetching inverter list from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch inverter list: ${response.status}`);
      }

      const text = await response.text();
      let jsonData;

      try {
        jsonData = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response:', text);
        // Try to extract JSON from response
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          jsonData = JSON.parse(text.substring(start, end + 1));
        } else {
          throw new Error('Invalid JSON response from Google Sheets');
        }
      }

      let rows = [];

      // Handle different data formats
      if (jsonData.table?.rows) {
        rows = jsonData.table.rows;
      } else if (Array.isArray(jsonData)) {
        rows = jsonData;
      } else if (jsonData.values) {
        rows = jsonData.values.map(row => ({ c: row.map(val => ({ v: val })) }));
      } else if (jsonData.success === false) {
        throw new Error(jsonData.error || 'Failed to fetch sheet data');
      }

      const inverterList = [];
      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header

        let rowValues = [];
        if (row.c) {
          rowValues = row.c.map(cell => cell?.v || '');
        } else if (Array.isArray(row)) {
          rowValues = row;
        }

        const serialNo = String(rowValues[0] || '').trim();
        const inverterId = String(rowValues[1] || '').trim();
        const beneficiaryName = String(rowValues[2] || '').trim();
        const capacityStr = String(rowValues[3] || '').trim();
        const capacity = parseFloat(capacityStr) || 1;

        if (inverterId && beneficiaryName) {
          inverterList.push({
            id: index,
            serialNo: serialNo || `S${index}`,
            inverterId,
            beneficiaryName,
            capacity,
            selected: true
          });
        }
      });

      if (inverterList.length === 0) {
        showToast('No inverters found in the sheet. Please check the Inverter_id sheet.', 'warning');
      }

      setInverters(inverterList);
      setSelectedInverters(inverterList.map(inv => inv.inverterId));
      setError('');

      showToast(`✓ Loaded ${inverterList.length} inverters`, 'success');

    } catch (err) {
      console.error('Error fetching inverter list:', err);
      setError(`Failed to load inverter list: ${err.message}`);
      showToast(`⚠ Failed to load inverters: ${err.message}`, 'error');

      // Provide sample data if fetch fails
      if (inverters.length === 0) {
        const sampleInverters = [
          { id: 1, serialNo: '49', inverterId: 'I2492100573', beneficiaryName: 'RAHUL SHARMA', capacity: 3, selected: true },
          { id: 2, serialNo: '29', inverterId: 'I2492100118', beneficiaryName: 'JACKY SANCHETI', capacity: 3, selected: true },
          { id: 3, serialNo: '19', inverterId: 'I2460100025', beneficiaryName: 'JAI KUMAR NEBHANI', capacity: 3, selected: true }
        ];
        setInverters(sampleInverters);
        setSelectedInverters(sampleInverters.map(inv => inv.inverterId));
        showToast('Using sample inverter data', 'info');
      }
    } finally {
      setLoading(prev => ({ ...prev, inverters: false }));
    }
  }, [loading.inverters, showToast, inverters.length]);

  // Track last fetched parameters to avoid redundant calls
  const lastFetchedParamsRef = React.useRef({
    dateRange: { startDate: '', endDate: '' },
    selectedInverters: []
  });

  // Check if token is expired
  const isTokenExpired = useCallback((tokenTimestamp) => {
    if (!tokenTimestamp) return true;
    const tokenAge = Date.now() - parseInt(tokenTimestamp);
    return tokenAge > 55 * 60 * 1000; // Expire after 55 minutes (5 minutes buffer)
  }, []);

  // Auto-login function
  const handleAutoLogin = useCallback(async (retryCount = 0) => {
    if (loginLoading) return;

    setLoginLoading(true);
    setLoginError('');

    try {
      // Validate environment variables
      const missingVars = [];
      if (!SOLAR_APPKEY) missingVars.push('VITE_SOLAR_APP_KEY');
      if (!SOLAR_SECRET_KEY) missingVars.push('VITE_SOLAR_SECRET_KEY');
      if (!USER_ACCOUNT) missingVars.push('VITE_USER_ACCOUNT');
      if (!USER_PASSWORD) missingVars.push('VITE_USER_PASSWORD');

      if (missingVars.length > 0) {
        throw new Error(`Missing API credentials: ${missingVars.join(', ')}. Please check environment configuration.`);
      }

      const requestBody = {
        appkey: SOLAR_APPKEY,
        user_account: USER_ACCOUNT,
        user_password: USER_PASSWORD
      };

      console.log('Attempting login to iSolarCloud...');
      const response = await fetch('https://gateway.isolarcloud.com.hk/openapi/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_SECRET_KEY,
          'sys_code': SOLAR_SYS_CODE
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Invalid JSON response:', responseText);
        throw new Error(`Invalid server response. Please try again.`);
      }

      if (!response.ok) {
        const errorMsg = result.result_msg || `Server error (${response.status})`;
        console.error('Login failed:', errorMsg);
        throw new Error(errorMsg);
      }

      if (result.result_code === "1") {
        const newToken = result.result_data?.token || '';
        if (!newToken) {
          throw new Error('No token received from server');
        }

        setLocalToken(newToken);
        setToken(newToken);
        setLoginSuccess(true);
        setLoginError('');

        // Cache token with timestamp
        localStorage.setItem(CACHE_KEYS.TOKEN, newToken);
        localStorage.setItem(CACHE_KEYS.TOKEN_TIMESTAMP, Date.now().toString());

        showToast('✓ Login successful! Fetching data...', 'success');
        console.log('Auto-login successful for WeeklyPerformanceReport');

        // Fetch inverter list after successful login
        setTimeout(() => fetchInverterList(), 500);
      } else {
        // Retry on busy server
        if (result.result_msg?.toLowerCase().includes('busy') && retryCount < 2) {
          showToast('Server busy, retrying...', 'info');
          setTimeout(() => handleAutoLogin(retryCount + 1), 2000);
          return;
        }
        throw new Error(result.result_msg || 'Login failed with unknown error');
      }
    } catch (err) {
      console.error('Auto-login error:', err);

      // Clear invalid token
      clearToken();
      clearCachedData(CACHE_KEYS.TOKEN);
      clearCachedData(CACHE_KEYS.TOKEN_TIMESTAMP);

      // Retry on network errors
      if (retryCount < 2 && err.message.includes('network') || err.message.includes('Failed to fetch')) {
        showToast(`Network error, retrying... (${retryCount + 1}/3)`, 'info');
        setTimeout(() => handleAutoLogin(retryCount + 1), 3000);
        return;
      }

      setLoginError(err.message || 'Unable to connect to server');
      setLoginSuccess(false);
      showToast(`⚠ Login failed: ${err.message}`, 'error', 8000);
    } finally {
      setLoginLoading(false);
    }
  }, [loginLoading, setToken, clearToken, showToast, fetchInverterList]);

  // Auto-login on mount if no valid token
  useEffect(() => {
    const savedToken = localStorage.getItem(CACHE_KEYS.TOKEN);
    const tokenTimestamp = localStorage.getItem(CACHE_KEYS.TOKEN_TIMESTAMP);

    if (savedToken && tokenTimestamp) {
      if (!isTokenExpired(tokenTimestamp)) {
        setLocalToken(savedToken);
        setToken(savedToken);
        setLoginSuccess(true);
        console.log('Using cached token');
        return;
      } else {
        console.log('Token expired, clearing cache');
        clearCachedData(CACHE_KEYS.TOKEN);
        clearCachedData(CACHE_KEYS.TOKEN_TIMESTAMP);
      }
    }

    // No valid token, trigger auto-login
    if (!localToken && !loginLoading) {
      console.log('No valid token found, triggering auto-login');
      handleAutoLogin();
    }
  }, []);

  // Handle inverter list fetching on mount
  useEffect(() => {
    const activeToken = localToken || token;
    if (activeToken && inverters.length === 0 && !loading.inverters) {
      fetchInverterList();
    }
  }, [localToken, token, inverters.length, loading.inverters, fetchInverterList]);

  // Fetch performance data for all selected inverters
  const fetchPerformanceData = useCallback(async (isManualRefresh = false) => {
    const activeToken = localToken || token;
    if (!activeToken) {
      setError('Not logged in. Please wait for auto-login or click "Retry Login" below.');
      showToast('⚠ Login required to fetch performance data', 'error');
      return;
    }

    if (selectedInverters.length === 0) {
      setError('No inverters selected');
      setPerformanceData([]);
      return;
    }

    if (!dateRange.startDate || !dateRange.endDate) {
      setError('Please select a date range');
      return;
    }

    // Optimization: Skip if parameters haven't changed and it's not a manual refresh
    const currentParams = {
      dateRange: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      selectedInverters: [...selectedInverters].sort()
    };

    const paramsChanged =
      currentParams.dateRange.startDate !== lastFetchedParamsRef.current.dateRange.startDate ||
      currentParams.dateRange.endDate !== lastFetchedParamsRef.current.dateRange.endDate ||
      JSON.stringify(currentParams.selectedInverters) !== JSON.stringify(lastFetchedParamsRef.current.selectedInverters);

    if (!paramsChanged && !isManualRefresh && performanceData.length > 0) {
      showToast('Data is already up to date', 'info');
      return;
    }

    if (loading.data) return;

    setLoading(prev => ({ ...prev, data: true, allData: true }));
    setError('');
    setIsRefreshing(true);

    // Initialize progress
    setFetchProgress({ current: 0, total: selectedInverters.length });

    try {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date range selected');
      }

      const apiStart = new Date(start);
      apiStart.setDate(apiStart.getDate() - 1); // API needs day before for daily calculation

      const apiStartDate = formatDateForAPI(apiStart);
      const apiEndDate = formatDateForAPI(end);
      const daysInRange = calculateDaysInRange();

      const cachedPsKeys = getCachedData(CACHE_KEYS.PS_KEYS) || {};
      const psKeyCache = { ...cachedPsKeys };

      const results = [];
      const batchSize = 10; // Reduced batch size for better reliability

      for (let i = 0; i < selectedInverters.length; i += batchSize) {
        const batch = selectedInverters.slice(i, i + batchSize);

        const batchPromises = batch.map(async (inverterId) => {
          try {
            const inverter = inverters.find(inv => inv.inverterId === inverterId);
            if (!inverter) {
              console.warn(`Inverter not found: ${inverterId}`);
              return null;
            }

            let psKey = psKeyCache[inverterId];

            // Fetch PS key if not cached
            if (!psKey) {
              console.log(`Fetching PS key for inverter: ${inverterId}`);
              const deviceRes = await fetch('https://gateway.isolarcloud.com.hk/openapi/getPVInverterRealTimeData', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-access-key': SOLAR_SECRET_KEY,
                  'sys_code': SOLAR_SYS_CODE,
                  'token': activeToken
                },
                body: JSON.stringify({
                  appkey: SOLAR_APPKEY,
                  sn_list: [inverterId],
                  lang: '_en_US',
                  sys_code: 207
                })
              });

              if (!deviceRes.ok) {
                if (deviceRes.status === 401 || deviceRes.status === 403) {
                  // Token expired
                  clearToken();
                  clearCachedData(CACHE_KEYS.TOKEN);
                  throw new Error('Session expired. Please login again.');
                }
                throw new Error(`Failed to fetch device data: ${deviceRes.status}`);
              }

              const deviceData = await deviceRes.json();

              if (deviceData.result_code === "1" && deviceData.result_data?.device_point_list) {
                const point = deviceData.result_data.device_point_list.find(p => p?.device_point?.ps_key);
                psKey = point?.device_point?.ps_key;
                if (psKey) {
                  psKeyCache[inverterId] = psKey;
                } else {
                  console.warn(`No PS key found for inverter: ${inverterId}`);
                  return {
                    ...inverter,
                    psKey: null,
                    totalKwh: 0,
                    avgDailyKwh: 0,
                    specYield: 0,
                    dailyData: [],
                    error: 'No PS Key found',
                    daysInRange
                  };
                }
              } else {
                console.warn(`Invalid device data response for ${inverterId}:`, deviceData);
                return {
                  ...inverter,
                  psKey: null,
                  totalKwh: 0,
                  avgDailyKwh: 0,
                  specYield: 0,
                  dailyData: [],
                  error: deviceData.result_msg || 'Invalid device response',
                  daysInRange
                };
              }
            }

            // Fetch energy data using PS key
            console.log(`Fetching energy data for inverter: ${inverterId}, PS Key: ${psKey}`);
            const energyRes = await fetch('https://gateway.isolarcloud.com.hk/openapi/getDevicePointsDayMonthYearDataList', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-access-key': SOLAR_SECRET_KEY,
                'sys_code': SOLAR_SYS_CODE,
                'token': activeToken
              },
              body: JSON.stringify({
                appkey: SOLAR_APPKEY,
                data_point: 'p2',
                data_type: '2',
                end_time: apiEndDate,
                lang: '_en_US',
                order: '0',
                ps_key_list: [psKey],
                query_type: '1',
                start_time: apiStartDate,
                sys_code: 207
              })
            });

            if (!energyRes.ok) {
              if (energyRes.status === 401 || energyRes.status === 403) {
                clearToken();
                clearCachedData(CACHE_KEYS.TOKEN);
                throw new Error('Session expired. Please login again.');
              }
              throw new Error(`Failed to fetch energy data: ${energyRes.status}`);
            }

            const energyData = await energyRes.json();
            let totalKwh = 0;
            const dailyData = [];

            if (energyData.result_code === "1" && energyData.result_data) {
              const psKeyData = Object.keys(energyData.result_data)[0];
              if (psKeyData) {
                const dataPoint = Object.keys(energyData.result_data[psKeyData])[0];
                const dataArray = energyData.result_data[psKeyData][dataPoint];

                if (dataArray && Array.isArray(dataArray)) {
                  const sortedData = [...dataArray].sort((a, b) => a.time_stamp.localeCompare(b.time_stamp));
                  let previousValue = 0;

                  sortedData.forEach((item, idx) => {
                    const valueKey = Object.keys(item).find(key => key !== 'time_stamp');
                    if (valueKey) {
                      const currentKwh = (parseFloat(item[valueKey]) || 0) / 1000;
                      if (idx === 0) {
                        previousValue = currentKwh;
                      } else {
                        const dailyKwh = Math.max(0, currentKwh - previousValue);
                        dailyData.push({
                          date: item.time_stamp,
                          dailyKwh,
                          cumulativeKwh: currentKwh
                        });
                        previousValue = currentKwh;
                      }
                    }
                  });

                  // Filter to selected date range
                  const filteredDailyData = dailyData.filter(item => {
                    try {
                      const itemDate = item.date.slice(0, 8);
                      const startStr = dateRange.startDate.replace(/-/g, '');
                      const endStr = dateRange.endDate.replace(/-/g, '');
                      return itemDate >= startStr && itemDate <= endStr;
                    } catch (e) {
                      return false;
                    }
                  });

                  totalKwh = filteredDailyData.reduce((sum, day) => sum + day.dailyKwh, 0);
                }
              }
            } else {
              console.warn(`Invalid energy data for ${inverterId}:`, energyData);
              return {
                ...inverter,
                psKey,
                totalKwh: 0,
                avgDailyKwh: 0,
                specYield: 0,
                dailyData: [],
                error: energyData.result_msg || 'Invalid energy data',
                daysInRange
              };
            }

            const avgDailyKwh = daysInRange > 0 ? totalKwh / daysInRange : 0;
            const specYield = inverter.capacity > 0 ? avgDailyKwh / inverter.capacity : 0;

            return {
              ...inverter,
              psKey,
              totalKwh: Number(totalKwh.toFixed(2)),
              avgDailyKwh: Number(avgDailyKwh.toFixed(2)),
              specYield: Number(specYield.toFixed(3)),
              dailyData,
              error: null,
              daysInRange,
              lifetimeGeneration: dailyData.length > 0 ? dailyData[dailyData.length - 1].cumulativeKwh : 0
            };
          } catch (err) {
            console.error(`Error processing inverter ${inverterId}:`, err);
            const inverter = inverters.find(inv => inv.inverterId === inverterId) || {
              id: i,
              inverterId,
              beneficiaryName: 'Unknown',
              capacity: 1
            };
            return {
              ...inverter,
              error: err.message,
              totalKwh: 0,
              avgDailyKwh: 0,
              specYield: 0,
              dailyData: [],
              daysInRange: calculateDaysInRange(),
              lifetimeGeneration: 0
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(Boolean);
        results.push(...validResults);

        const currentProg = Math.min(i + batchSize, selectedInverters.length);
        setFetchProgress({ current: currentProg, total: selectedInverters.length });

        // Update performance data progressively
        setPerformanceData([...results]);

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < selectedInverters.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Cache PS keys
      setCachedData(CACHE_KEYS.PS_KEYS, psKeyCache);

      // Update fetched params tracker
      lastFetchedParamsRef.current = currentParams;

      // Set last updated timestamp
      const updateTime = new Date();
      setLastUpdated(updateTime);

      // Show success message
      const successfulResults = results.filter(r => !r.error);
      const failedResults = results.filter(r => r.error);

      if (failedResults.length > 0) {
        showToast(`Fetched ${successfulResults.length} inverters, ${failedResults.length} failed`, 'warning');
      } else {
        showToast(`✓ Successfully fetched ${successfulResults.length} inverters`, 'success');
      }

      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Failed to fetch data: ${err.message}`);
      showToast(`⚠ Fetch failed: ${err.message}`, 'error');

      // If token expired, trigger re-login
      if (err.message.includes('Session expired') || err.message.includes('401') || err.message.includes('403')) {
        clearToken();
        clearCachedData(CACHE_KEYS.TOKEN);
        showToast('Session expired. Reconnecting...', 'info');
        setTimeout(() => handleAutoLogin(), 2000);
      }
    } finally {
      setLoading(prev => ({ ...prev, data: false, allData: false }));
      setIsRefreshing(false);
      setFetchProgress({ current: 0, total: 0 });
    }
  }, [localToken, token, selectedInverters, inverters, dateRange, formatDateForAPI, calculateDaysInRange, showToast, clearToken, handleAutoLogin]);

  // SYNC TO GOOGLE SHEETS IN CSV FORMAT
  const handleSyncCSVFormat = useCallback(async () => {
    if (performanceData.length === 0) {
      showToast("No performance data available to sync", "error");
      return { success: false };
    }

    setSyncLoading(true);
    showToast("Syncing data in CSV format to Google Sheets...", "info");

    try {
      const syncData = [];
      const now = new Date();

      // Format dates as dd/mm/yyyy for the header
      const formattedStartDate = formatDateToDDMMYYYY(dateRange.startDate);
      const formattedEndDate = formatDateToDDMMYYYY(dateRange.endDate);

      // For each inverter, prepare data in CSV format
      performanceData.forEach(item => {
        if (!item.error) { // Only sync successful data
          syncData.push({
            serialNo: item.serialNo || `S${item.id}`,
            inverterId: item.inverterId.trim(),
            beneficiaryName: item.beneficiaryName.trim(),
            capacity: item.capacity,
            totalKwh: item.totalKwh,
            avgDailyKwh: item.avgDailyKwh,
            specYield: item.specYield,
            daysInRange: item.daysInRange || calculateDaysInRange(),
            lifetimeGeneration: item.lifetimeGeneration || 0
          });
        }
      });

      if (syncData.length === 0) {
        throw new Error("No valid data to sync (all records have errors)");
      }

      console.log("Preparing to sync CSV format data:", syncData.length, "records");
      console.log("Date range:", formattedStartDate, "to", formattedEndDate);

      const jsonData = JSON.stringify(syncData);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          action: 'syncCSVFormat',
          sheetName: 'Weekly_Performance_Logs',
          dateRangeStart: formattedStartDate,
          dateRangeEnd: formattedEndDate,
          data: JSON.stringify(syncData)
        }).toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("CSV Format Sync response:", result);

      if (result.success) {
        const syncInfo = {
          lastSync: new Date(),
          count: result.newRows + result.updatedRows,
          totalRows: result.totalRows,
          timestamp: result.timestamp,
          format: 'csv'
        };
        setSyncStatus(syncInfo);
        setCachedData(CACHE_KEYS.SYNC_INFO, JSON.stringify(syncInfo));
        setCachedData(CACHE_KEYS.LAST_CSV_SYNC, Date.now().toString());

        let message = `✓ Synced ${syncData.length} records in CSV format`;
        if (result.newRows > 0) message += ` (${result.newRows} new)`;
        if (result.updatedRows > 0) message += ` (${result.updatedRows} updated)`;

        showToast(message, "success", 6000);
        return { success: true };
      } else {
        throw new Error(result.error || result.message || "Sync failed");
      }
    } catch (err) {
      console.error("CSV Format Sync error:", err);
      showToast(`CSV Sync Failed: ${err.message}`, "error", 8000);
      return { success: false, error: err.message };
    } finally {
      setSyncLoading(false);
    }
  }, [performanceData, dateRange, calculateDaysInRange, showToast]);

  // Store handleSyncCSVFormat in ref so it can be used in useEffect
  useEffect(() => {
    syncCSVFormatRef.current = handleSyncCSVFormat;
  }, [handleSyncCSVFormat]);

  // AUTO-SYNC EFFECT - Triggers on Monday/Wednesday
  useEffect(() => {
    const checkAndTriggerAutoSync = async () => {
      // Check if today is auto-sync day
      const isToday = isTodayAutoSyncDay();
      if (!isToday) return;

      // Check if we have data and token
      const activeToken = localToken || token;
      if (!activeToken || performanceData.length === 0 || loading.data) return;

      // Check if already synced today
      const todayStr = new Date().toDateString();
      const lastAutoSyncDate = getCachedData(CACHE_KEYS.LAST_AUTO_SYNC_DATE);
      if (lastAutoSyncDate === todayStr) return;

      // Check if auto-sync already triggered
      if (autoSyncTriggeredRef.current) return;

      console.log('🚀 AUTO-SYNC: Today is', getDayName(new Date().getDay()), '- triggering automatic CSV sync');

      // Show auto-sync notification
      showToast(`📅 Auto-sync: Today is ${getDayName(new Date().getDay())}. Submitting weekly report...`, 'info', 6000);

      // Update auto-sync status
      setAutoSyncStatus(prev => ({
        ...prev,
        autoSyncTriggered: true,
        isTodayAutoSyncDay: true
      }));

      autoSyncTriggeredRef.current = true;

      // Trigger auto-sync after a short delay to ensure data is ready
      setTimeout(async () => {
        try {
          const result = await syncCSVFormatRef.current();
          
          if (result.success) {
            // Mark as synced
            setCachedData(CACHE_KEYS.LAST_AUTO_SYNC_DATE, todayStr);
            
            // Update auto-sync status
            setAutoSyncStatus(prev => ({
              ...prev,
              lastAutoSync: new Date(),
              nextAutoSync: getNextAutoSyncDate(new Date())
            }));

            // Show success toast
            showToast('✅ Auto-sync: Weekly report submitted successfully!', 'success', 8000);
            
            console.log('✅ AUTO-SYNC: Completed successfully');
          } else {
            console.error('❌ AUTO-SYNC: Failed:', result.error);
            showToast('❌ Auto-sync failed. Please try manual sync.', 'error', 8000);
          }
        } catch (error) {
          console.error('❌ AUTO-SYNC: Error:', error);
          showToast('❌ Auto-sync error. Please try manual sync.', 'error', 8000);
        }
      }, 3000);
    };

    // Check and trigger auto-sync when conditions are met
    if (loginSuccess && performanceData.length > 0 && !loading.data) {
      checkAndTriggerAutoSync();
    }
  }, [loginSuccess, performanceData.length, loading.data, localToken, token, isTodayAutoSyncDay, showToast, getDayName, getNextAutoSyncDate]);

  // UNIFIED AUTO-REFRESH EFFECT
  useEffect(() => {
    // Requirements for auto-fetch
    const activeToken = localToken || token;
    if (!activeToken || inverters.length === 0 || loading.inverters || loading.data) return;
    if (!dateRange.startDate || !dateRange.endDate) return;

    // Check if token is still valid
    const tokenTimestamp = localStorage.getItem(CACHE_KEYS.TOKEN_TIMESTAMP);
    if (isTokenExpired(tokenTimestamp)) {
      console.log('Token expired, refreshing...');
      handleAutoLogin();
      return;
    }

    // Trigger if params changed or if graph is empty
    const currentParams = {
      dateRange: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      selectedInverters: [...selectedInverters].sort()
    };

    const paramsChanged =
      currentParams.dateRange.startDate !== lastFetchedParamsRef.current.dateRange.startDate ||
      currentParams.dateRange.endDate !== lastFetchedParamsRef.current.dateRange.endDate ||
      JSON.stringify(currentParams.selectedInverters) !== JSON.stringify(lastFetchedParamsRef.current.selectedInverters);

    if (paramsChanged || performanceData.length === 0) {
      const timeoutId = setTimeout(() => {
        fetchPerformanceData();
      }, 500); // Increased debounce for better performance
      return () => clearTimeout(timeoutId);
    }
  }, [localToken, token, inverters.length, selectedInverters, dateRange, performanceData.length, loading.inverters, loading.data, fetchPerformanceData, isTokenExpired, handleAutoLogin]);

  // Handle inverter selection
  const toggleInverterSelection = useCallback((inverterId) => {
    if (selectedInverters.includes(inverterId)) {
      setSelectedInverters(prev => prev.filter(id => id !== inverterId));
    } else {
      setSelectedInverters(prev => [...prev, inverterId]);
    }
  }, [selectedInverters]);

  const toggleSelectAll = useCallback(() => {
    if (selectedInverters.length === inverters.length) {
      setSelectedInverters([]);
    } else {
      setSelectedInverters(inverters.map(inv => inv.inverterId));
    }
  }, [selectedInverters, inverters]);

  // Handle sort
  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  }, [sortBy]);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let data = [...performanceData].filter(item => !item.error); // Filter out errored items

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(item =>
        item.beneficiaryName?.toLowerCase().includes(term) ||
        item.inverterId?.toLowerCase().includes(term) ||
        item.serialNo?.toLowerCase().includes(term)
      );
    }

    return data.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }, [performanceData, searchTerm, sortBy, sortOrder]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const validData = filteredData.filter(item => item.totalKwh > 0);
    if (validData.length === 0) return null;

    const totalKwh = validData.reduce((sum, item) => sum + item.totalKwh, 0);
    const avgDailyKwh = validData.reduce((sum, item) => sum + item.avgDailyKwh, 0) / validData.length;
    const avgSpecYield = validData.reduce((sum, item) => sum + item.specYield, 0) / validData.length;
    const totalCapacity = validData.reduce((sum, item) => sum + item.capacity, 0);

    const sortedByYield = [...validData].sort((a, b) => b.specYield - a.specYield);
    const bestPerformer = sortedByYield[0];
    const worstPerformer = sortedByYield[sortedByYield.length - 1];

    return {
      totalKwh: Number(totalKwh.toFixed(2)),
      avgDailyKwh: Number(avgDailyKwh.toFixed(2)),
      avgSpecYield: Number(avgSpecYield.toFixed(3)),
      totalCapacity: Number(totalCapacity.toFixed(2)),
      totalInverters: validData.length,
      bestPerformer,
      worstPerformer
    };
  }, [filteredData]);

  // Handle date preset
  const applyDatePreset = useCallback((preset) => {
    const end = new Date();
    const start = new Date();

    switch (preset) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case '2weeks':
        start.setDate(start.getDate() - 14);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case '3months':
        start.setMonth(start.getMonth() - 3);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setDateRange({
      startDate: formatDate(start),
      endDate: formatDate(end),
      customRange: false
    });

    showToast(`Date range set to last ${preset}`, 'info');
  }, [showToast]);

  // Export to CSV with dd/mm/yyyy format
  const exportToCSV = useCallback(() => {
    if (filteredData.length === 0) {
      showToast("No data available to export", "warning");
      return;
    }

    // Format dates as dd/mm/yyyy
    const formattedStartDate = formatDateToDDMMYYYY(dateRange.startDate);
    const formattedEndDate = formatDateToDDMMYYYY(dateRange.endDate);

    const headers = [
      'Serial No',
      'Inverter ID',
      'Beneficiary Name',
      'Capacity (kW)',
      `Total Energy (${formattedStartDate} to ${formattedEndDate}) (kWh)`,
      'Avg Daily Energy (kWh)',
      'Specific Yield (kWh/kW)',
      'Days in Range',
      'Lifetime Generation (kWh)',
      'Status'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.serialNo || `S${item.id}`,
        item.inverterId,
        `"${item.beneficiaryName}"`,
        item.capacity,
        item.totalKwh,
        item.avgDailyKwh,
        item.specYield,
        item.daysInRange || calculateDaysInRange(),
        item.lifetimeGeneration || 0,
        item.error ? `Error: ${item.error}` : 'Success'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solar-performance-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast(`CSV exported with ${filteredData.length} records`, 'success');
  }, [filteredData, dateRange, calculateDaysInRange, showToast]);

  // Clear sync history
  const handleClearSyncHistory = useCallback(() => {
    clearCachedData(CACHE_KEYS.SYNC_INFO);
    clearCachedData(CACHE_KEYS.LAST_CSV_SYNC);
    setSyncStatus({ lastSync: null, count: 0, totalRows: 0, timestamp: null, format: null });
    showToast("Sync history cleared", "info");
  }, [showToast]);

  // Clear auto-sync history
  const handleClearAutoSyncHistory = useCallback(() => {
    clearCachedData(CACHE_KEYS.LAST_AUTO_SYNC_DATE);
    autoSyncTriggeredRef.current = false;
    setAutoSyncStatus(prev => ({
      ...prev,
      lastAutoSync: null,
      autoSyncTriggered: false
    }));
    showToast("Auto-sync history cleared", "info");
  }, [showToast]);

  // Manually trigger auto-sync
  const handleManualAutoSync = useCallback(async () => {
    if (performanceData.length === 0) {
      showToast("No data available for auto-sync", "warning");
      return;
    }

    showToast("🔄 Manually triggering auto-sync...", "info");
    
    try {
      const result = await handleSyncCSVFormat();
      
      if (result.success) {
        // Mark as synced
        const todayStr = new Date().toDateString();
        setCachedData(CACHE_KEYS.LAST_AUTO_SYNC_DATE, todayStr);
        
        // Update auto-sync status
        setAutoSyncStatus(prev => ({
          ...prev,
          lastAutoSync: new Date(),
          autoSyncTriggered: true
        }));
        
        showToast("✅ Manual auto-sync completed!", "success");
      } else {
        showToast("❌ Manual auto-sync failed", "error");
      }
    } catch (error) {
      showToast("❌ Manual auto-sync error", "error");
    }
  }, [performanceData.length, handleSyncCSVFormat, showToast]);

  // Chart data
  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      name: item.beneficiaryName,
      inverterId: item.inverterId,
      specYield: item.specYield,
      avgDaily: item.avgDailyKwh,
      total: item.totalKwh,
      capacity: item.capacity,
      color: item.specYield >= 4 ? '#10B981' : item.specYield >= 3 ? '#F59E0B' : '#EF4444'
    }));
  }, [filteredData]);

  // Render chart
  const renderChart = useCallback(() => {
    if (chartData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded-xl">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No data available for chart</p>
            <p className="text-sm text-gray-400 mt-2">
              Select inverters and date range to visualize data
            </p>
          </div>
        </div>
      );
    }

    const chartHeight = isFullScreen ? '70vh' : '400px';

    return (
      <div className={`relative ${isFullScreen ? 'fixed inset-0 z-50 bg-white p-8' : ''}`}>
        <div className="relative" style={{ height: chartHeight }}>
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center mb-4 px-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  Specific Yield Ranking
                </h3>
                <p className="text-xs text-gray-500">
                  {formatDateToDDMMYYYY(dateRange.startDate)} to {formatDateToDDMMYYYY(dateRange.endDate)} ({calculateDaysInRange()} days)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="h-full pt-12">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <YAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Specific Yield (kWh/kW)', angle: -90, position: 'insideLeft', offset: -10 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                            <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                            <p className="text-sm text-gray-600">Inverter: {data.inverterId}</p>
                            <p className="text-sm text-gray-600">Capacity: {data.capacity} kW</p>
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-sm">
                                <span className="font-medium">Specific Yield: </span>
                                <span className={`font-bold ${data.specYield >= 4 ? 'text-green-600' : data.specYield >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {data.specYield} kWh/kW
                                </span>
                              </p>
                              <p className="text-sm">Avg Daily: {data.avgDaily.toFixed(2)} kWh</p>
                              <p className="text-sm">Total: {data.total.toFixed(2)} kWh</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={4} stroke="#10B981" strokeDasharray="3 3" label="Target" />
                  <Bar
                    dataKey="specYield"
                    name="Specific Yield"
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'area' ? (
                <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                          <p className="text-sm">Specific Yield: {data.specYield} kWh/kW</p>
                          <p className="text-sm">Avg Daily: {data.avgDaily.toFixed(2)} kWh</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Area
                    type="monotone"
                    dataKey="specYield"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                    name="Specific Yield"
                  />
                </AreaChart>
              ) : (
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                          <p className="text-sm">Specific Yield: {data.specYield} kWh/kW</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Line
                    type="monotone"
                    dataKey="specYield"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Specific Yield"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }, [chartData, chartType, isFullScreen, dateRange, calculateDaysInRange]);

  // Handle logout
  const handleLogout = useCallback(() => {
    clearToken();
    clearCachedData(CACHE_KEYS.TOKEN);
    clearCachedData(CACHE_KEYS.TOKEN_TIMESTAMP);
    setLocalToken('');
    setLoginSuccess(false);
    setPerformanceData([]);
    setInverters([]);
    showToast('Logged out successfully', 'info');
  }, [clearToken, showToast]);

  // Debug function to check environment variables (remove in production)
  const checkEnvironment = useCallback(() => {
    console.log('Environment Check:');
    console.log('- SOLAR_APPKEY:', SOLAR_APPKEY ? 'Set' : 'Missing');
    console.log('- SOLAR_SECRET_KEY:', SOLAR_SECRET_KEY ? 'Set' : 'Missing');
    console.log('- USER_ACCOUNT:', USER_ACCOUNT ? 'Set' : 'Missing');
    console.log('- USER_PASSWORD:', USER_PASSWORD ? 'Set' : 'Missing');
    console.log('- GOOGLE_SCRIPT_URL:', GOOGLE_SCRIPT_URL);
    console.log('- Cached Token:', localStorage.getItem(CACHE_KEYS.TOKEN) ? 'Exists' : 'None');
  }, []);

  // Check environment on component mount (development only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      checkEnvironment();
    }
  }, [checkEnvironment]);

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-[100] max-w-md p-4 rounded-xl shadow-2xl border transform transition-all duration-500 ease-out animate-slide-in ${toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : toast.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : toast.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-gray-50 border-gray-200 text-gray-800'
            }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />}
            <p className="font-medium text-sm">{toast.message}</p>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="ml-auto p-1 hover:opacity-70 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Login Loading Overlay */}
      {loginLoading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[90] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm mx-4 text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connecting to Server</h3>
            <p className="text-gray-600 text-sm">Please wait while we authenticate your session...</p>
          </div>
        </div>
      )}

      {/* Login Error Banner */}
      {(loginError || (!localToken && !token && !loginLoading)) && (
        <div className="fixed top-0 left-0 right-0 z-[80] bg-gradient-to-r from-red-500 to-orange-500 text-white py-4 px-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <WifiOff className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Login Required</h3>
                <p className="text-white/90 text-sm">
                  {loginError || 'Unable to authenticate. Please check your credentials and try again.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {import.meta.env.DEV && (
                <button
                  onClick={checkEnvironment}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition flex items-center gap-2"
                >
                  <Info className="w-4 h-4" />
                  Debug
                </button>
              )}
              <button
                onClick={() => handleAutoLogin(0)}
                disabled={loginLoading}
                className="px-6 py-2.5 bg-white text-red-600 rounded-lg font-semibold hover:bg-white/90 transition flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Retry Login
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Success Indicator */}
      {loginSuccess && localToken && !loginLoading && (
        <div className="fixed top-4 left-4 z-[70] flex items-center gap-2 px-3 py-1.5 bg-green-100 border border-green-200 rounded-full text-green-700 text-sm font-medium shadow-sm">
          <Wifi className="w-4 h-4" />
          <span>Connected</span>
          <button
            onClick={handleLogout}
            className="ml-2 px-2 py-0.5 text-xs bg-green-200 hover:bg-green-300 rounded transition"
          >
            Logout
          </button>
        </div>
      )}

      <div className={`min-h-screen ${isFullScreen ? 'overflow-hidden' : 'bg-transparent'} ${(loginError || (!localToken && !token && !loginLoading)) ? 'pt-20' : ''}`}>
        {!isFullScreen && (
          <div className="w-full">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                    Weekly Performance Report
                  </h1>
                  <p className="text-gray-600">
                    Compare performance across all inverters with customizable date range
                  </p>
                  {(isRefreshing || lastUpdated || fetchProgress.total > 0) && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isRefreshing && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Refreshing...
                        </span>
                      )}
                      {fetchProgress.total > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                            <Zap className="w-3 h-3" />
                            Fetching: {fetchProgress.current}/{fetchProgress.total} inverters
                          </span>
                          <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all duration-300"
                              style={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {lastUpdated && !isRefreshing && fetchProgress.total === 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          <Clock className="w-3 h-3" />
                          Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                      )}
                      {syncStatus.lastSync && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                          <Database className="w-3 h-3" />
                          Last sync: {syncStatus.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({syncStatus.format || 'unknown'})
                        </span>
                      )}
                      {/* Auto-sync Status Indicator */}
                      {autoSyncStatus.isTodayAutoSyncDay && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${autoSyncStatus.autoSyncTriggered ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          <Bell className="w-3 h-3" />
                          {autoSyncStatus.autoSyncTriggered ? 'Auto-sync completed' : 'Auto-sync pending'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={exportToCSV}
                    disabled={filteredData.length === 0}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${filteredData.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                  >
                    <DownloadCloud className="w-4 h-4" />
                    Export CSV
                  </button>

                  {/* Sync Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSyncCSVFormat}
                      disabled={syncLoading || filteredData.length === 0 || (!localToken && !token)}
                      className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${syncLoading || filteredData.length === 0 || (!localToken && !token)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                        }`}
                      title="Sync in CSV format (weekly report)"
                    >
                      <FileText className={`w-4 h-4 ${syncLoading ? 'animate-pulse' : ''}`} />
                      {syncLoading ? 'Syncing...' : 'Sync CSV Format'}
                    </button>
                    
                    {/* Manual Auto-sync Trigger */}
                    {autoSyncStatus.isTodayAutoSyncDay && !autoSyncStatus.autoSyncTriggered && (
                      <button
                        onClick={handleManualAutoSync}
                        disabled={syncLoading || filteredData.length === 0}
                        className="px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                        title="Trigger auto-sync now (normally runs automatically on Monday/Wednesday)"
                      >
                        <Bell className="w-4 h-4" />
                        Trigger Auto-sync
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => fetchPerformanceData(true)}
                    disabled={loading.data || (!localToken && !token)}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${loading.data || (!localToken && !token)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading.data ? 'animate-spin' : ''}`} />
                    {loading.data ? 'Refreshing...' : 'Refresh Data'}
                  </button>
                </div>
              </div>

              {summaryStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Energy</p>
                        <p className="text-2xl font-bold text-blue-600">{summaryStats.totalKwh} kWh</p>
                      </div>
                      <Zap className="w-8 h-8 text-blue-100 bg-blue-600 p-2 rounded-lg" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Across {summaryStats.totalInverters} inverters
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Avg Daily</p>
                        <p className="text-2xl font-bold text-green-600">{summaryStats.avgDailyKwh} kWh</p>
                      </div>
                      <Sun className="w-8 h-8 text-green-100 bg-green-600 p-2 rounded-lg" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Per inverter average
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Avg Spec. Yield</p>
                        <p className="text-2xl font-bold text-purple-600">{summaryStats.avgSpecYield} kWh/kW</p>
                      </div>
                      <Target className="w-8 h-8 text-purple-100 bg-purple-600 p-2 rounded-lg" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {summaryStats.avgSpecYield >= 4 ? 'Excellent' : summaryStats.avgSpecYield >= 3 ? 'Good' : 'Needs Improvement'}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Capacity</p>
                        <p className="text-2xl font-bold text-orange-600">{summaryStats.totalCapacity} kW</p>
                      </div>
                      <Battery className="w-8 h-8 text-orange-100 bg-orange-600 p-2 rounded-lg" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Installed capacity
                    </p>
                  </div>

                  {/* Sync Status Card */}
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Auto-sync Status</p>
                        <p className={`text-2xl font-bold ${autoSyncStatus.isTodayAutoSyncDay ? 'text-orange-600' : 'text-gray-600'}`}>
                          {autoSyncStatus.isTodayAutoSyncDay ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <Bell className="w-8 h-8 text-indigo-100 bg-indigo-600 p-2 rounded-lg" />
                    </div>
                    <div className="text-xs text-gray-400 mt-2 space-y-1">
                      <p>
                        <span className="font-medium">Schedule:</span> Monday & Wednesday
                      </p>
                      {autoSyncStatus.lastAutoSync && (
                        <p>
                          <span className="font-medium">Last Auto-sync:</span> {autoSyncStatus.lastAutoSync.toLocaleDateString()}
                        </p>
                      )}
                      {autoSyncStatus.nextAutoSync && (
                        <p>
                          <span className="font-medium">Next Auto-sync:</span> {autoSyncStatus.nextAutoSync.toLocaleDateString()}
                        </p>
                      )}
                      <p className={`font-medium ${autoSyncStatus.isTodayAutoSyncDay ? 'text-orange-600' : 'text-gray-600'}`}>
                        {autoSyncStatus.isTodayAutoSyncDay 
                          ? (autoSyncStatus.autoSyncTriggered ? '✅ Auto-sync completed today' : '🔄 Auto-sync pending for today')
                          : 'Auto-sync not scheduled today'}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleClearAutoSyncHistory}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Clear auto-sync
                      </button>
                      <button
                        onClick={checkAutoSyncDay}
                        className="text-xs text-blue-500 hover:text-blue-700 ml-auto"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-sync Notification Banner */}
              {autoSyncStatus.isTodayAutoSyncDay && !autoSyncStatus.autoSyncTriggered && (
                <div className="mb-6 p-4 bg-gradient-to-r from-orange-100 to-yellow-100 border border-orange-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-orange-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-800">Auto-sync Scheduled for Today</h3>
                      <p className="text-sm text-orange-700">
                        Today is {getDayName(new Date().getDay())}. The system will automatically submit the weekly report to Google Sheets.
                        {performanceData.length > 0 ? ' Ready to sync...' : ' Waiting for data...'}
                      </p>
                    </div>
                    <button
                      onClick={handleManualAutoSync}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      Sync Now
                    </button>
                  </div>
                </div>
              )}

              {/* Date Range Selector */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Date Range Selection
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {formatDateToDDMMYYYY(dateRange.startDate)} to {formatDateToDDMMYYYY(dateRange.endDate)} ({calculateDaysInRange()} days)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value, customRange: true }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      max={dateRange.endDate}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value, customRange: true }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => applyDatePreset('week')}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                      >
                        Last 7 Days
                      </button>
                      <button
                        onClick={() => applyDatePreset('2weeks')}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                      >
                        Last 14 Days
                      </button>
                      <button
                        onClick={() => applyDatePreset('month')}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                      >
                        Last 30 Days
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedView('chart')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${expandedView === 'chart'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <BarChart3 className="w-4 h-4 inline mr-2" />
                      Chart View
                    </button>
                    <button
                      onClick={() => setExpandedView('table')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${expandedView === 'table'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <Grid3x3 className="w-4 h-4 inline mr-2" />
                      Table View
                    </button>
                  </div>

                  {expandedView === 'chart' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setChartType('bar')}
                        className={`px-3 py-1 rounded text-sm ${chartType === 'bar'
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        Bar
                      </button>
                      <button
                        onClick={() => setChartType('area')}
                        className={`px-3 py-1 rounded text-sm ${chartType === 'area'
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        Area
                      </button>
                      <button
                        onClick={() => setChartType('line')}
                        className={`px-3 py-1 rounded text-sm ${chartType === 'line'
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        Line
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search inverters..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Inverter Selection</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleSelectAll}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                      >
                        {selectedInverters.length === inverters.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="text-sm text-gray-500">
                        {selectedInverters.length} of {inverters.length} selected
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-2">
                    {inverters.map((inverter) => (
                      <label
                        key={inverter.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${selectedInverters.includes(inverter.inverterId)
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedInverters.includes(inverter.inverterId)}
                          onChange={() => toggleInverterSelection(inverter.inverterId)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{inverter.beneficiaryName}</p>
                          <p className="text-xs text-gray-500">{inverter.inverterId} ({inverter.capacity} kW)</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {expandedView === 'chart' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
                  {renderChart()}
                </div>
              )}

              {expandedView === 'table' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('beneficiaryName')}
                          >
                            <div className="flex items-center gap-1">
                              Beneficiary Name
                              {sortBy === 'beneficiaryName' && (
                                sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('inverterId')}
                          >
                            Inverter ID
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('capacity')}
                          >
                            Capacity
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('totalKwh')}
                          >
                            Total Energy
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('avgDailyKwh')}
                          >
                            Avg Daily
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('specYield')}
                          >
                            Spec. Yield
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lifetime Gen
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredData.map((item, index) => (
                          <tr key={`${item.id}-${index}`} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.beneficiaryName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                              {item.inverterId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.capacity} kW
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {item.totalKwh.toFixed(2)} kWh
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                              {item.avgDailyKwh.toFixed(2)} kWh
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-bold ${item.specYield >= 4 ? 'text-green-600' : item.specYield >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {item.specYield.toFixed(3)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {item.lifetimeGeneration ? item.lifetimeGeneration.toFixed(2) : '0'} kWh
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.error ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={item.error}>
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Error
                                </span>
                              ) : syncStatus.lastSync ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredData.length === 0 && performanceData.some(item => item.error) && (
                          <tr>
                            <td colSpan="8" className="px-6 py-8 text-center">
                              <div className="text-yellow-600 bg-yellow-50 p-4 rounded-lg">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                <p className="font-medium">Some inverters failed to fetch</p>
                                <p className="text-sm text-yellow-700 mt-1">
                                  {performanceData.filter(item => item.error).length} inverters had errors. Try refreshing or check connection.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    onClick={() => setError('')}
                    className="ml-auto text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {loading.allData && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-xl shadow-xl text-center">
                    <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="font-medium text-gray-900">Fetching performance data...</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Please wait while we process {selectedInverters.length} inverters.
                    </p>
                    <div className="mt-4 w-48 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {fetchProgress.current} of {fetchProgress.total} completed
                    </p>
                  </div>
                </div>
              )}

              {syncLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-xl shadow-xl text-center">
                    <Database className="w-10 h-10 text-indigo-600 animate-pulse mx-auto mb-4" />
                    <p className="font-medium text-gray-900">Syncing to Google Sheets...</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Please wait while we sync {filteredData.length} inverter records.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Format: CSV with professional spacing
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isFullScreen && renderChart()}
      </div>
    </AdminLayout>
  );
};

export default WeeklyPerformanceReport;