import React, { useState, useEffect, useRef } from 'react';
import { Key, Cpu, Search, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useDeviceContext } from './DeviceContext';

// Environment variables
const SOLAR_APPKEY = import.meta.env.VITE_SOLAR_APP_KEY;
const SOLAR_SECRET_KEY = import.meta.env.VITE_SOLAR_SECRET_KEY;
const SOLAR_SYS_CODE = import.meta.env.VITE_SOLAR_SYS_CODE || '207';
const USER_ACCOUNT = import.meta.env.VITE_USER_ACCOUNT;
const USER_PASSWORD = import.meta.env.VITE_USER_PASSWORD;

// Google Sheets Config
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec";
const SHEET_NAME = "Inverter_id";

const AutoLogin = ({ onTokenChange, onDeviceDataChange, onBeneficiarySelect }) => {
  const { psKey, setPsKey, setSelectedDevice } = useDeviceContext();

  // State for auto-login toggle
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(() => {
    const saved = localStorage.getItem('autoLoginEnabled');
    return saved ? JSON.parse(saved) : true;
  });

  // State for serial number
  const [serialNumber, setSerialNumber] = useState(() => {
    return localStorage.getItem('serialNumber') || '';
  });

  // State for token and loading
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState({
    login: false,
    device: false,
    googleSheets: false
  });

  const [error, setError] = useState('');
  const [deviceData, setDeviceData] = useState(null);

  // Google Sheets Data States
  const [inverterData, setInverterData] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [isMouseInDropdown, setIsMouseInDropdown] = useState(false);

  // Refs
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  // Track initial mount and manual changes
  const isInitialMount = useRef(true);
  const isManualSerialChange = useRef(false);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('autoLoginEnabled', JSON.stringify(autoLoginEnabled));
  }, [autoLoginEnabled]);

  useEffect(() => {
    localStorage.setItem('serialNumber', serialNumber);
  }, [serialNumber]);

  // Initialize auto login on mount
  useEffect(() => {
    if (autoLoginEnabled) {
      handleLogin();
    }
    // Load Google Sheets data on mount
    fetchGoogleSheetsData();
  }, []);

  // Fetch Google Sheets Data
  const fetchGoogleSheetsData = async () => {
    setLoading(prev => ({ ...prev, googleSheets: true }));
    setError('');

    try {
      const url = `${GOOGLE_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}&action=fetch`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch Google Sheets data');

      const text = await response.text();
      let jsonData;

      // Try to parse JSON
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

      const processedData = [];
      const beneficiarySet = new Set();

      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header

        let rowValues = [];

        if (row.c) {
          rowValues = row.c.map(cell => cell?.v || '');
        } else if (Array.isArray(row)) {
          rowValues = row;
        }

        const beneficiary = String(rowValues[2] || '').trim();
        const inverterId = String(rowValues[1] || '').trim();
        const capacity = String(rowValues[3] || '').trim();

        if (beneficiary && inverterId) {
          beneficiarySet.add(beneficiary);
          processedData.push({
            id: index,
            beneficiaryName: beneficiary,
            inverterId: inverterId,
            capacity: capacity,
            serialNo: rowValues[0] || ''
          });
        }
      });

      setInverterData(processedData);
      const sortedBeneficiaries = [...beneficiarySet].sort();
      setBeneficiaries(sortedBeneficiaries);
      setFilteredBeneficiaries(sortedBeneficiaries);

    } catch (err) {
      console.error('Error fetching Google Sheets:', err);
      setError(`Failed to load beneficiary data: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, googleSheets: false }));
    }
  };

  // Filter beneficiaries based on search
  const handleBeneficiarySearch = (value) => {
    setBeneficiarySearch(value);

    if (!value.trim()) {
      setFilteredBeneficiaries(beneficiaries);
      return;
    }

    const filtered = beneficiaries.filter(beneficiary =>
      beneficiary.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredBeneficiaries(filtered);
  };

  // Handle beneficiary selection
  const handleSelectBeneficiary = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setBeneficiarySearch(beneficiary);
    setShowDropdown(false);

    // Find inverter IDs for this beneficiary
    const inverterIds = inverterData
      .filter(item => item.beneficiaryName === beneficiary)
      .map(item => item.inverterId)
      .filter((id, index, self) => self.indexOf(id) === index);

    let selectedInverterId = '';

    // If there's only one inverter ID, auto-select it
    if (inverterIds.length === 1) {
      selectedInverterId = inverterIds[0];
      isManualSerialChange.current = false;
      setSerialNumber(selectedInverterId);

      // Auto-fetch device data for this inverter
      if (token) {
        setTimeout(() => {
          fetchDeviceDataBySerial(token, selectedInverterId);
        }, 100);
      }
    } else if (inverterIds.length > 0) {
      // If multiple inverter IDs, select the first one
      selectedInverterId = inverterIds[0];
      isManualSerialChange.current = false;
      setSerialNumber(selectedInverterId);

      // Auto-fetch device data for this inverter
      if (token) {
        setTimeout(() => {
          fetchDeviceDataBySerial(token, selectedInverterId);
        }, 100);
      }
    }

    // Find capacity for the selected inverter
    const selectedInverterItem = inverterData.find(
      item => item.beneficiaryName === beneficiary && item.inverterId === selectedInverterId
    );
    const capacity = selectedInverterItem?.capacity ? parseFloat(selectedInverterItem.capacity) : 1;

    // Call the callback with selected beneficiary and inverter ID
    if (onBeneficiarySelect) {
      onBeneficiarySelect({
        beneficiary,
        inverterId: selectedInverterId,
        capacity
      });
    }

    // Focus back to input after selection
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Handle serial number change
  const handleSerialNumberChange = (e) => {
    const value = e.target.value;
    isManualSerialChange.current = true;
    setSerialNumber(value);

    // Clear selected beneficiary when manually typing serial number
    if (value && selectedBeneficiary) {
      setSelectedBeneficiary('');
      setBeneficiarySearch('');
    }
  };

  // Handle mouse enter for search container
  const handleSearchContainerMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (filteredBeneficiaries.length > 0) {
      setShowDropdown(true);
    }
  };

  // Handle mouse leave for search container
  const handleSearchContainerMouseLeave = () => {
    if (!isMouseInDropdown) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowDropdown(false);
      }, 150);
    }
  };

  // Handle mouse enter for dropdown
  const handleDropdownMouseEnter = () => {
    setIsMouseInDropdown(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  // Handle mouse leave for dropdown
  const handleDropdownMouseLeave = () => {
    setIsMouseInDropdown(false);
    hideTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 150);
  };

  // Clear search
  const clearSearch = () => {
    setBeneficiarySearch('');
    setSelectedBeneficiary('');
    setFilteredBeneficiaries(beneficiaries);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (filteredBeneficiaries.length > 0) {
      setShowDropdown(true);
    }
  };

  // Handle input blur
  const handleInputBlur = (e) => {
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget)) {
      return;
    }

    setTimeout(() => {
      if (!isMouseInDropdown) {
        setShowDropdown(false);
      }
    }, 150);
  };

  // Direct login function
  const handleLogin = async (retryCount = 0) => {
    setLoading(prev => ({ ...prev, login: true }));
    setError('');

    try {
      if (!SOLAR_APPKEY || !SOLAR_SECRET_KEY || !USER_ACCOUNT || !USER_PASSWORD) {
        throw new Error('Missing API credentials. Please check environment variables.');
      }

      const requestBody = {
        appkey: SOLAR_APPKEY,
        user_account: USER_ACCOUNT,
        user_password: USER_PASSWORD
      };

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
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.result_msg || 'Login failed'}`);
      }

      if (result.result_code === "1") {
        const newToken = result.result_data?.token || '';
        setToken(newToken);
        onTokenChange(newToken);

        localStorage.setItem('solarToken', newToken);
        localStorage.setItem('solarTokenTimestamp', Date.now().toString());

        console.log('Login successful, token:', newToken.substring(0, 20) + '...');

        // Fetch device data if serial number is set
        if (serialNumber) {
          fetchDeviceDataBySerial(newToken);
        }
      } else {
        if (result.result_msg.includes('busy') && retryCount < 2) {
          setTimeout(() => handleLogin(retryCount + 1), 2000);
          return;
        }
        setError(`Login failed: ${result.result_msg}`);
      }
    } catch (err) {
      console.error('Login error:', err);

      if (retryCount < 2) {
        setTimeout(() => handleLogin(retryCount + 1), 2000);
        return;
      }
      setError(err.message || 'Unknown login error');
    } finally {
      setLoading(prev => ({ ...prev, login: false }));
    }
  };

  // Fetch device data by serial number
  const fetchDeviceDataBySerial = async (tokenParam, serialNumberParam = null) => {
    const actualToken = tokenParam || token;
    const actualSerialNumber = serialNumberParam || serialNumber;

    if (!actualToken) {
      setError('No login token available. Please login first.');
      return;
    }

    if (!actualSerialNumber || !actualSerialNumber.trim()) {
      setError('Please enter a serial number');
      return;
    }

    setLoading(prev => ({ ...prev, device: true }));
    setError('');

    try {
      console.log('Fetching device data for serial:', actualSerialNumber);
      console.log('Using token:', actualToken.substring(0, 20) + '...');

      const requestBody = {
        appkey: SOLAR_APPKEY,
        sn_list: [actualSerialNumber.trim()],
        lang: '_en_US',
        sys_code: 207
      };

      const response = await fetch('https://gateway.isolarcloud.com.hk/openapi/getPVInverterRealTimeData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_SECRET_KEY,
          'sys_code': SOLAR_SYS_CODE,
          'token': actualToken
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      console.log('Device API Response:', result);

      if (result.result_code === "1") {
        const devicePoint = result.result_data?.device_point_list?.[0]?.device_point;
        if (devicePoint) {
          const newPsKey = devicePoint.ps_key;
          console.log('Device data fetched successfully. PS Key:', newPsKey);

          // Update device data state
          setDeviceData(devicePoint);

          // Update context - CRITICAL: This updates the PS Key
          setPsKey(newPsKey);
          setSelectedDevice(devicePoint);

          // Call the parent callback
          if (onDeviceDataChange) {
            onDeviceDataChange(devicePoint);
          }
        } else {
          setError('No device data found for the serial number');
        }
      } else {
        setError(`Device fetch failed: ${result.result_msg}`);
      }
    } catch (err) {
      console.error('Device fetch error:', err);
      setError(`Device fetch error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(prev => ({ ...prev, device: false }));
    }
  };

  // Load saved token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('solarToken');
    const tokenTimestamp = localStorage.getItem('solarTokenTimestamp');

    if (savedToken && tokenTimestamp) {
      const tokenAge = Date.now() - parseInt(tokenTimestamp);
      if (tokenAge < 60 * 60 * 1000) { // 1 hour
        setToken(savedToken);
        onTokenChange(savedToken);
        console.log('Loaded saved token:', savedToken.substring(0, 20) + '...');
      } else {
        localStorage.removeItem('solarToken');
        localStorage.removeItem('solarTokenTimestamp');
      }
    }
  }, [onTokenChange]);

  // Auto-trigger search when serial number changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (token && serialNumber && serialNumber.trim() && isManualSerialChange.current) {
      console.log('Auto-fetching device data for serial number:', serialNumber);

      const timeoutId = setTimeout(() => {
        fetchDeviceDataBySerial();
      }, 800);

      return () => clearTimeout(timeoutId);
    }
  }, [serialNumber, token]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard navigation for dropdown
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  // Manual search button click handler
  const handleManualSearchClick = () => {
    isManualSerialChange.current = false;
    fetchDeviceDataBySerial();
  };

  // Debug function to check PS Key state
  const debugPSKey = () => {
    console.log('Current PS Key from context:', psKey);
    console.log('Current device data:', deviceData);
    console.log('Current serial number:', serialNumber);
    console.log('Current token:', token ? token.substring(0, 20) + '...' : 'No token');
  };

  return (
    <div>

      {/* Auto Login Toggle Section */}
      <div className="space-y-3">

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <button
            onClick={() => {
              if (!loading.login) {
                setAutoLoginEnabled(!autoLoginEnabled)
                if (!autoLoginEnabled) {
                  handleLogin()
                }
              }
            }}
            disabled={loading.login}
            className={`w-full px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm ${loading.login
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : autoLoginEnabled
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-600 hover:bg-gray-700 text-white"
              }`}
          >
            {loading.login ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>{autoLoginEnabled ? "Auto Login - Refresh Token" : "Enable Auto Login & Refresh"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Beneficiary Search Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Beneficiary Search
        </h3>

        <div className="space-y-2">

          <div
            ref={searchContainerRef}
            className="relative"
            onMouseEnter={handleSearchContainerMouseEnter}
            onMouseLeave={handleSearchContainerMouseLeave}
            onKeyDown={handleKeyDown}
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={beneficiarySearch}
                  onChange={(e) => handleBeneficiarySearch(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Type beneficiary name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                />

                {beneficiarySearch && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    type="button"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                onClick={fetchGoogleSheetsData}
                disabled={loading.googleSheets}
                className={`px-4 py-3 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap text-sm ${loading.googleSheets
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                type="button"
              >
                {loading.googleSheets ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </button>
            </div>

            {/* Dropdown List */}
            {showDropdown && filteredBeneficiaries.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                onMouseEnter={handleDropdownMouseEnter}
                onMouseLeave={handleDropdownMouseLeave}
              >
                {filteredBeneficiaries.map((beneficiary, index) => {
                  const beneficiaryItems = inverterData
                    .filter(item => item.beneficiaryName === beneficiary);

                  // Deduplicate by inverterId
                  const uniqueItems = [];
                  const seenIds = new Set();
                  beneficiaryItems.forEach(item => {
                    if (!seenIds.has(item.inverterId)) {
                      seenIds.add(item.inverterId);
                      uniqueItems.push(item);
                    }
                  });

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectBeneficiary(beneficiary)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div className="font-medium text-gray-800">{beneficiary}</div>
                      {uniqueItems.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {uniqueItems.length === 1 ? 'Inverter ID: ' : 'Inverter IDs: '}
                          {uniqueItems.map((item, idx) => (
                            <span key={idx}>
                              {item.inverterId}
                              {item.capacity ? ` (${item.capacity}kW)` : ''}
                              {idx < uniqueItems.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Data Status */}
            <div className="my-2 flex items-center justify-between">
              <div>
                {loading.googleSheets ? (
                  <p className="text-xs text-gray-500">Loading beneficiary data...</p>
                ) : beneficiaries.length > 0 ? (
                  <p className="text-xs text-gray-500">
                    {selectedBeneficiary && (
                      <span className="ml-2 text-blue-600 font-medium">
                        Selected: {selectedBeneficiary}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    No beneficiary data loaded. Click "Refresh" to load.
                  </p>
                )}
              </div>

              {selectedBeneficiary && (
                <button
                  onClick={() => {
                    setSelectedBeneficiary('');
                    setBeneficiarySearch('');
                  }}
                  className="text-xs text-red-600 hover:text-red-800"
                  type="button"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Device Configuration Section */}
      <div className="space-y-3">

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Inverter Serial Number
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={serialNumber}
              onChange={handleSerialNumberChange}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm font-mono"
              placeholder="Enter inverter serial number..."
            />
            <button
              onClick={handleManualSearchClick}
              disabled={loading.device || !token}
              className={`px-4 py-3 rounded-lg font-medium transition flex items-center gap-2 text-sm ${loading.device || !token
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              type="button"
            >
              {loading.device ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="w-4 h-4" />
              )}

            </button>
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-3 mt-2">
            {serialNumber && token && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-gray-600">Auto-search enabled</span>
              </div>
            )}

            {deviceData && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">Device data loaded</span>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-800 text-sm">Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => setError('')}
                className="text-xs text-red-600 hover:text-red-800 mt-2"
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default AutoLogin;