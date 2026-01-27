// components/WeeklyPerformanceReport.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDeviceContext } from './DeviceContext';
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
  ArrowUpRight, ArrowDownRight, Target
} from 'lucide-react';

// Environment variables
const SOLAR_APPKEY = import.meta.env.VITE_SOLAR_APP_KEY;
const SOLAR_SECRET_KEY = import.meta.env.VITE_SOLAR_SECRET_KEY;
const SOLAR_SYS_CODE = import.meta.env.VITE_SOLAR_SYS_CODE || '207';
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec";
const SHEET_NAME = "Inverter_id";

// Cache utility functions
const CACHE_KEYS = {
  INVERTERS: 'wpr_inverters_cache',
  PERFORMANCE_PREFIX: 'wpr_performance_',
  PS_KEYS: 'wpr_ps_keys_cache', // Cache PS Keys separately (they rarely change)
  LAST_FETCH: 'wpr_last_fetch'
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache validity

const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed;
  } catch (e) {
    console.warn('Cache read error:', e);
    return null;
  }
};

const setCachedData = (key, data, timestamp = Date.now()) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp }));
  } catch (e) {
    console.warn('Cache write error:', e);
    // Clear old caches if storage is full
    clearOldPerformanceCaches();
  }
};

const clearOldPerformanceCaches = () => {
  try {
    const keys = Object.keys(localStorage);
    const performanceKeys = keys.filter(k => k.startsWith(CACHE_KEYS.PERFORMANCE_PREFIX));
    // Sort by timestamp and keep only last 5
    const cachesWithTime = performanceKeys.map(key => {
      const cached = getCachedData(key);
      return { key, timestamp: cached?.timestamp || 0 };
    }).sort((a, b) => b.timestamp - a.timestamp);

    // Remove old caches beyond the 5 most recent
    cachesWithTime.slice(5).forEach(({ key }) => {
      localStorage.removeItem(key);
    });
  } catch (e) {
    console.warn('Cache cleanup error:', e);
  }
};

const generatePerformanceCacheKey = (startDate, endDate, inverterIds) => {
  const sortedIds = [...inverterIds].sort().join(',');
  return `${CACHE_KEYS.PERFORMANCE_PREFIX}${startDate}_${endDate}_${sortedIds.substring(0, 50)}`;
};

const WeeklyPerformanceReport = () => {
  const { token } = useDeviceContext();
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
  const [isFromCache, setIsFromCache] = useState(false); // Track if showing cached data
  const [isRefreshing, setIsRefreshing] = useState(false); // Track background refresh
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 }); // Progress tracking

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

  // Load cached inverters on mount
  useEffect(() => {
    const cachedInverters = getCachedData(CACHE_KEYS.INVERTERS);
    if (cachedInverters?.data && cachedInverters.data.length > 0) {
      setInverters(cachedInverters.data);
      setSelectedInverters(cachedInverters.data.map(inv => inv.inverterId));
      setIsFromCache(true);
    }
  }, []);

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
  }, []);

  // Fetch inverter list from Google Sheets with caching
  const fetchInverterList = useCallback(async (forceRefresh = false) => {
    if (loading.inverters) return;

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedInverters = getCachedData(CACHE_KEYS.INVERTERS);
      if (cachedInverters?.data && cachedInverters.data.length > 0) {
        // Show cached data immediately
        setInverters(cachedInverters.data);
        setSelectedInverters(cachedInverters.data.map(inv => inv.inverterId));
        setIsFromCache(true);

        // Check if cache is still valid (less than 1 hour old)
        const cacheAge = Date.now() - (cachedInverters.timestamp || 0);
        if (cacheAge < CACHE_DURATION) {
          return; // Cache is fresh, no need to refetch
        }
        // Cache is stale, continue to fetch fresh data in background
      }
    }

    setLoading(prev => ({ ...prev, inverters: true }));
    if (!isFromCache) setError('');

    try {
      const url = `${GOOGLE_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}&action=fetch`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch inverter list');

      const text = await response.text();
      let jsonData;

      try {
        jsonData = JSON.parse(text);
      } catch {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          jsonData = JSON.parse(text.substring(start, end + 1));
        } else {
          throw new Error('Invalid JSON response');
        }
      }

      let rows = [];

      // Handle different data formats
      if (jsonData.table?.rows) rows = jsonData.table.rows;
      else if (Array.isArray(jsonData)) rows = jsonData;
      else if (jsonData.values) {
        rows = jsonData.values.map(row => ({ c: row.map(val => ({ v: val })) }));
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
            serialNo,
            inverterId,
            beneficiaryName,
            capacity,
            selected: true
          });
        }
      });

      // Cache the fresh data
      setCachedData(CACHE_KEYS.INVERTERS, inverterList);

      setInverters(inverterList);
      setSelectedInverters(inverterList.map(inv => inv.inverterId));
      setIsFromCache(false);
      setError('');
    } catch (err) {
      console.error('Error fetching inverter list:', err);
      // Only show error if we don't have cached data
      if (inverters.length === 0) {
        setError(`Failed to load inverter list: ${err.message}`);
      }
    } finally {
      setLoading(prev => ({ ...prev, inverters: false }));
    }
  }, [loading.inverters, isFromCache, inverters.length]);

  // Format date for API
  const formatDateForAPI = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }, []);

  // Calculate number of days in date range
  const calculateDaysInRange = useCallback(() => {
    if (!dateRange.startDate || !dateRange.endDate) return 7;

    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  }, [dateRange]);

  // Fetch performance data for all selected inverters with caching
  const fetchPerformanceData = useCallback(async (forceRefresh = false) => {
    if (!token) {
      setError('Please login first');
      return;
    }

    if (selectedInverters.length === 0) {
      setError('No inverters selected');
      return;
    }

    if (!dateRange.startDate || !dateRange.endDate) {
      setError('Please select a date range');
      return;
    }

    // Generate cache key for this specific query
    const cacheKey = generatePerformanceCacheKey(
      dateRange.startDate,
      dateRange.endDate,
      selectedInverters
    );

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedPerformance = getCachedData(cacheKey);
      if (cachedPerformance?.data && cachedPerformance.data.length > 0) {
        // Show cached data immediately
        setPerformanceData(cachedPerformance.data);
        setLastUpdated(new Date(cachedPerformance.timestamp));
        setIsFromCache(true);

        // Check if cache is still valid (less than 1 hour old)
        const cacheAge = Date.now() - (cachedPerformance.timestamp || 0);
        if (cacheAge < CACHE_DURATION) {
          return; // Cache is fresh, no need to refetch
        }
        // Cache is stale, continue to fetch fresh data in background
        setIsRefreshing(true);
      }
    }

    // Only show loading if we don't have cached data
    if (!isFromCache) {
      setLoading(prev => ({ ...prev, data: true, allData: true }));
      setError('');
    }

    // Initialize progress
    setFetchProgress({ current: 0, total: selectedInverters.length });

    try {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      const apiStart = new Date(start);
      apiStart.setDate(apiStart.getDate() - 1); // Get previous day for cumulative calculation

      const apiStartDate = formatDateForAPI(apiStart);
      const apiEndDate = formatDateForAPI(end);
      const daysInRange = calculateDaysInRange();

      // Load cached PS Keys
      const cachedPsKeys = getCachedData(CACHE_KEYS.PS_KEYS)?.data || {};
      const psKeyCache = { ...cachedPsKeys };

      const results = [];

      // OPTIMIZED: Increased batch size from 3 to 10 for faster processing
      const batchSize = 10;

      for (let i = 0; i < selectedInverters.length; i += batchSize) {
        const batch = selectedInverters.slice(i, i + batchSize);

        const batchPromises = batch.map(async (inverterId) => {
          try {
            // Find inverter details
            const inverter = inverters.find(inv => inv.inverterId === inverterId);
            if (!inverter) return null;

            let psKey = psKeyCache[inverterId];

            // 1. Get PS Key (use cache if available)
            if (!psKey) {
              const deviceRes = await fetch('https://gateway.isolarcloud.com.hk/openapi/getPVInverterRealTimeData', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-access-key': SOLAR_SECRET_KEY,
                  'sys_code': SOLAR_SYS_CODE,
                  'token': token
                },
                body: JSON.stringify({
                  appkey: SOLAR_APPKEY,
                  sn_list: [inverterId],
                  lang: '_en_US',
                  sys_code: 207
                })
              });

              const deviceData = await deviceRes.json();

              if (deviceData.result_code === "1" && deviceData.result_data?.device_point_list) {
                const point = deviceData.result_data.device_point_list.find(p => p?.device_point?.ps_key);
                psKey = point?.device_point?.ps_key;

                // Cache the PS Key for future use
                if (psKey) {
                  psKeyCache[inverterId] = psKey;
                }
              }
            }

            if (!psKey) {
              console.warn(`No PS Key found for inverter: ${inverterId}`);
              return {
                ...inverter,
                psKey: null,
                totalKwh: 0,
                avgDailyKwh: 0,
                specYield: 0,
                dailyData: [],
                error: 'No PS Key found'
              };
            }

            // 2. Get Energy Data for the date range
            const energyRes = await fetch('https://gateway.isolarcloud.com.hk/openapi/getDevicePointsDayMonthYearDataList', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-access-key': SOLAR_SECRET_KEY,
                'sys_code': SOLAR_SYS_CODE,
                'token': token
              },
              body: JSON.stringify({
                appkey: SOLAR_APPKEY,
                data_point: 'p2', // Total Energy
                data_type: '2', // Daily
                end_time: apiEndDate,
                lang: '_en_US',
                order: '0',
                ps_key_list: [psKey],
                query_type: '1', // Range query
                start_time: apiStartDate,
                sys_code: 207
              })
            });

            const energyData = await energyRes.json();
            let totalKwh = 0;
            const dailyData = [];

            if (energyData.result_code === "1" && energyData.result_data) {
              const psKeyData = Object.keys(energyData.result_data)[0];
              if (psKeyData) {
                const dataPoint = Object.keys(energyData.result_data[psKeyData])[0];
                const dataArray = energyData.result_data[psKeyData][dataPoint];

                if (dataArray && Array.isArray(dataArray)) {
                  // Sort by timestamp
                  const sortedData = [...dataArray].sort((a, b) =>
                    a.time_stamp.localeCompare(b.time_stamp)
                  );

                  // Calculate cumulative to period production
                  let previousValue = 0;
                  sortedData.forEach((item, idx) => {
                    const valueKey = Object.keys(item).find(key => key !== 'time_stamp');
                    if (valueKey) {
                      const currentValue = parseFloat(item[valueKey]) || 0;
                      const currentKwh = currentValue / 1000; // Convert Wh to kWh

                      if (idx === 0) {
                        // First day in API range (previous day)
                        previousValue = currentKwh;
                      } else {
                        // Daily production = current cumulative - previous cumulative
                        const dailyKwh = Math.max(0, currentKwh - previousValue);
                        dailyData.push({
                          date: item.time_stamp,
                          dailyKwh: dailyKwh,
                          cumulativeKwh: currentKwh
                        });
                        previousValue = currentKwh;
                      }
                    }
                  });

                  // Filter to only include dates in the selected range
                  const filteredDailyData = dailyData.filter(item => {
                    const itemDate = item.date.slice(0, 8); // YYYYMMDD
                    const startStr = dateRange.startDate.replace(/-/g, '');
                    const endStr = dateRange.endDate.replace(/-/g, '');
                    return itemDate >= startStr && itemDate <= endStr;
                  });

                  // Calculate totals
                  totalKwh = filteredDailyData.reduce((sum, day) => sum + day.dailyKwh, 0);
                }
              }
            }

            const avgDailyKwh = daysInRange > 0 ? totalKwh / daysInRange : 0;
            const specYield = inverter.capacity > 0 ? avgDailyKwh / inverter.capacity : 0;

            return {
              ...inverter,
              psKey,
              totalKwh: Number(totalKwh.toFixed(2)),
              avgDailyKwh: Number(avgDailyKwh.toFixed(2)),
              specYield: Number(specYield.toFixed(3)),
              dailyData: dailyData,
              error: null,
              daysInRange
            };

          } catch (err) {
            console.error(`Error processing inverter ${inverterId}:`, err);
            return {
              ...inverters.find(inv => inv.inverterId === inverterId),
              psKey: null,
              totalKwh: 0,
              avgDailyKwh: 0,
              specYield: 0,
              dailyData: [],
              error: err.message
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(r => r !== null);
        results.push(...validResults);

        // Update progress
        const currentProgress = Math.min(i + batchSize, selectedInverters.length);
        setFetchProgress({ current: currentProgress, total: selectedInverters.length });

        // PROGRESSIVE LOADING: Update state after each batch so user sees results immediately
        if (validResults.length > 0) {
          const sortedPartial = [...results].sort((a, b) => {
            const aValue = a[sortBy] || 0;
            const bValue = b[sortBy] || 0;
            return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
          });
          setPerformanceData(sortedPartial);
        }

        // OPTIMIZED: Reduced delay from 1000ms to 300ms
        if (i + batchSize < selectedInverters.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Save PS Key cache
      setCachedData(CACHE_KEYS.PS_KEYS, psKeyCache);

      // Sort final results
      const sortedResults = [...results].sort((a, b) => {
        const aValue = a[sortBy] || 0;
        const bValue = b[sortBy] || 0;
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      });

      // Cache the fresh data
      setCachedData(cacheKey, sortedResults);

      setPerformanceData(sortedResults);
      setLastUpdated(new Date());
      setIsFromCache(false);
      setIsRefreshing(false);
      setFetchProgress({ current: 0, total: 0 });
      setError('');

    } catch (err) {
      console.error('Error fetching performance data:', err);
      // Only show error if we don't have cached data
      if (performanceData.length === 0) {
        setError(`Failed to fetch performance data: ${err.message}`);
      }
      setIsRefreshing(false);
      setFetchProgress({ current: 0, total: 0 });
    } finally {
      setLoading(prev => ({ ...prev, data: false, allData: false }));
    }
  }, [token, selectedInverters, inverters, dateRange, formatDateForAPI, calculateDaysInRange, sortBy, sortOrder, isFromCache, performanceData.length]);

  // Initialize data
  useEffect(() => {
    if (token && inverters.length === 0) {
      fetchInverterList();
    }
  }, [token, inverters.length, fetchInverterList]);

  // Auto-fetch when date range changes and inverters are loaded
  useEffect(() => {
    if (token && inverters.length > 0 && dateRange.startDate && dateRange.endDate && !loading.inverters) {
      const timeoutId = setTimeout(() => {
        fetchPerformanceData();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [token, inverters.length, dateRange.startDate, dateRange.endDate, fetchPerformanceData, loading.inverters]);

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
    let data = [...performanceData];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(item =>
        item.beneficiaryName.toLowerCase().includes(term) ||
        item.inverterId.toLowerCase().includes(term) ||
        item.serialNo.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    return data.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }, [performanceData, searchTerm, sortBy, sortOrder]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const totalKwh = filteredData.reduce((sum, item) => sum + item.totalKwh, 0);
    const avgDailyKwh = filteredData.reduce((sum, item) => sum + item.avgDailyKwh, 0) / filteredData.length;
    const avgSpecYield = filteredData.reduce((sum, item) => sum + item.specYield, 0) / filteredData.length;
    const totalCapacity = filteredData.reduce((sum, item) => sum + item.capacity, 0);

    // Find best and worst performers
    const sortedByYield = [...filteredData].sort((a, b) => b.specYield - a.specYield);
    const bestPerformer = sortedByYield[0];
    const worstPerformer = sortedByYield[sortedByYield.length - 1];

    return {
      totalKwh: Number(totalKwh.toFixed(2)),
      avgDailyKwh: Number(avgDailyKwh.toFixed(2)),
      avgSpecYield: Number(avgSpecYield.toFixed(3)),
      totalCapacity: Number(totalCapacity.toFixed(2)),
      totalInverters: filteredData.length,
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
  }, []);

  // Export data to CSV
  const exportToCSV = useCallback(() => {
    if (filteredData.length === 0) return;

    const headers = [
      'Serial No',
      'Inverter ID',
      'Beneficiary Name',
      'Capacity (kW)',
      `Total Energy (${dateRange.startDate} to ${dateRange.endDate}) (kWh)`,
      'Avg Daily Energy (kWh)',
      'Specific Yield (kWh/kW)',
      'Days in Range'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.serialNo,
        item.inverterId,
        `"${item.beneficiaryName}"`,
        item.capacity,
        item.totalKwh,
        item.avgDailyKwh,
        item.specYield,
        item.daysInRange || calculateDaysInRange()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-performance-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [filteredData, dateRange, calculateDaysInRange]);

  // Chart data for specific yield ranking
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
                  {dateRange.startDate} to {dateRange.endDate} ({calculateDaysInRange()} days)
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
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    label={{ value: 'Specific Yield (kWh/kW)', position: 'insideBottom', offset: -10 }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={140}
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
                  <ReferenceLine x={4} stroke="#10B981" strokeDasharray="3 3" label="Target" />
                  <Bar
                    dataKey="specYield"
                    name="Specific Yield"
                    radius={[0, 4, 4, 0]}
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
                    label={{ value: 'Specific Yield (kWh/kW)', angle: -90, position: 'insideLeft' }}
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
                    label={{ value: 'Specific Yield (kWh/kW)', angle: -90, position: 'insideLeft' }}
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

  return (
    <AdminLayout>
      <div className={`min-h-screen ${isFullScreen ? 'overflow-hidden' : 'bg-transparent'}`}>
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
                  {/* Cache Status Indicator */}
                  {(isFromCache || isRefreshing || lastUpdated || fetchProgress.total > 0) && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isFromCache && !isRefreshing && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                          <Database className="w-3 h-3" />
                          Showing cached data
                        </span>
                      )}
                      {isRefreshing && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Updating in background...
                        </span>
                      )}
                      {/* Progress Indicator */}
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
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
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

                  <button
                    onClick={() => fetchPerformanceData(true)}
                    disabled={loading.data || !token}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${loading.data || !token
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading.data || isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              {summaryStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                      {dateRange.startDate} to {dateRange.endDate} ({calculateDaysInRange()} days)
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
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value, customRange: true }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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

              {/* Filters Panel */}
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

              {/* Chart View */}
              {expandedView === 'chart' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
                  {renderChart()}
                </div>
              )}

              {/* Table View */}
              {expandedView === 'table' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
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
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('inverterId')}
                          >
                            <div className="flex items-center gap-1">
                              Inverter ID
                              {sortBy === 'inverterId' && (
                                sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('capacity')}
                          >
                            <div className="flex items-center gap-1">
                              Capacity (kW)
                              {sortBy === 'capacity' && (
                                sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('totalKwh')}
                          >
                            <div className="flex items-center gap-1">
                              Total (kWh)
                              {sortBy === 'totalKwh' && (
                                sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('avgDailyKwh')}
                          >
                            <div className="flex items-center gap-1">
                              Avg/Day (kWh)
                              {sortBy === 'avgDailyKwh' && (
                                sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('specYield')}
                          >
                            <div className="flex items-center gap-1">
                              Spec. Yield (kWh/kW)
                              {sortBy === 'specYield' && (
                                sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredData.map((item, index) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{item.beneficiaryName}</div>
                                  <div className="text-sm text-gray-500">{item.serialNo}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-mono">{item.inverterId}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {item.capacity} kW
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{item.totalKwh.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">{item.daysInRange || calculateDaysInRange()} days</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-semibold text-green-600">{item.avgDailyKwh.toFixed(2)}</div>
                                {index === 0 && summaryStats?.bestPerformer?.inverterId === item.inverterId && (
                                  <ArrowUpRight className="w-4 h-4 text-green-500 ml-1" />
                                )}
                                {index === filteredData.length - 1 && summaryStats?.worstPerformer?.inverterId === item.inverterId && (
                                  <ArrowDownRight className="w-4 h-4 text-red-500 ml-1" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-bold ${item.specYield >= 4 ? 'text-green-600' : item.specYield >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {item.specYield.toFixed(3)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.specYield >= 4 ? 'Excellent' : item.specYield >= 3 ? 'Good' : 'Needs Improvement'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.error ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Error
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer */}
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      Showing {filteredData.length} of {inverters.length} inverters
                      {lastUpdated && (
                        <span className="ml-4">
                          Last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={exportToCSV}
                        disabled={filteredData.length === 0}
                        className={`px-3 py-1 text-sm rounded ${filteredData.length === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        Export Table
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-800 text-sm">Error</h4>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                      <button
                        onClick={() => setError('')}
                        className="text-xs text-red-600 hover:text-red-800 mt-2"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {(loading.data || loading.allData) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-700 font-medium">Loading performance data...</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Processing {selectedInverters.length} inverters
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