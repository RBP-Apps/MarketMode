// components/ConfigurationPanel.jsx
import React, { useCallback, useMemo, useEffect } from 'react';
import {
  Settings,
  AlertCircle,
  Clock,
  Sun,
  Calendar,
  CalendarDays,
  Layers,
} from 'lucide-react';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ConfigurationPanel = React.memo(({
  viewMode,
  conversionMode,
  setConversionMode,
  dateTime,
  setDateTime,
  minuteForm,
  setMinuteForm,
  selectedParameter,
  setSelectedParameter,
  dailyDateRange,
  setDailyDateRange,
  dailyForm,
  setDailyForm,
  monthlyDailyDateRange,
  setMonthlyDailyDateRange,
  monthlyDailyForm,
  setMonthlyDailyForm,
  applyDailyPreset,
  monthRange,
  setMonthRange,
  monthlyForm,
  setMonthlyForm,
  applyMonthPreset,
  yearRange,
  setYearRange,
  yearlyForm,
  setYearlyForm,
  applyYearPreset,
  token,
  loading,
  error,
  getFetchFunction,
  getLoadingState,
  minuteData,
  dailyData,
  monthlyData,
  yearlyData,
  formatMinuteData,
  formatDailyData,
  formatMonthlyData,
  formatYearlyData,
  psKey,
  onFetchData,
}) => {
  // Memoized calculation of time difference
  const calculateTimeDifference = useCallback(() => {
    if (!dateTime.startDate || !dateTime.startTime || !dateTime.endDate || !dateTime.endTime) {
      return 0;
    }

    const startDateTime = new Date(`${dateTime.startDate}T${dateTime.startTime}`);
    const endDateTime = new Date(`${dateTime.endDate}T${dateTime.endTime}`);

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    return diffMs / (1000 * 60 * 60);
  }, [dateTime]);

  // Validate and adjust time period
  const validateAndAdjustTimePeriod = useCallback((field, value) => {
    if (viewMode !== 'minute') return { ...dateTime, [field]: value };

    const newDateTime = { ...dateTime, [field]: value };

    if (!newDateTime.startDate || !newDateTime.startTime ||
      !newDateTime.endDate || !newDateTime.endTime) {
      return newDateTime;
    }

    const startDateTime = new Date(`${newDateTime.startDate}T${newDateTime.startTime}`);
    const endDateTime = new Date(`${newDateTime.endDate}T${newDateTime.endTime}`);

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > 3) {
      const adjustedEndDateTime = new Date(startDateTime.getTime() + (3 * 60 * 60 * 1000));

      const adjustedDate = adjustedEndDateTime.toISOString().split('T')[0];
      const adjustedTime = adjustedEndDateTime.toTimeString().slice(0, 5);

      return {
        ...newDateTime,
        endDate: adjustedDate,
        endTime: adjustedTime
      };
    }

    return newDateTime;
  }, [dateTime, viewMode]);

  // Handle date/time changes
  const handleDateTimeChange = useCallback((field, value) => {
    const updatedDateTime = validateAndAdjustTimePeriod(field, value);
    setDateTime(updatedDateTime);
  }, [validateAndAdjustTimePeriod, setDateTime]);

  // Check if time period is valid
  const isTimePeriodValid = useCallback(() => {
    if (viewMode !== 'minute') return true;
    const diffHours = calculateTimeDifference();
    return diffHours === 3;
  }, [viewMode, calculateTimeDifference]);

  // Auto-set end time
  useEffect(() => {
    if (viewMode === 'minute' && dateTime.startDate && dateTime.startTime) {
      const startDateTime = new Date(`${dateTime.startDate}T${dateTime.startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + (3 * 60 * 60 * 1000));

      const endDate = endDateTime.toISOString().split('T')[0];
      const endTime = endDateTime.toTimeString().slice(0, 5);

      if (dateTime.endDate !== endDate || dateTime.endTime !== endTime) {
        setDateTime(prev => ({
          ...prev,
          endDate,
          endTime
        }));
      }
    }
  }, [dateTime.startDate, dateTime.startTime, viewMode, setDateTime]);

  // Auto-fetch removed from child as it is now handled by the parent's consolidated useEffect


  // Memoized values
  const timeDifference = useMemo(() => calculateTimeDifference(), [calculateTimeDifference]);
  const isExact3Hours = useMemo(() => timeDifference === 3, [timeDifference]);
  const isValidMinuteData = useMemo(() =>
    viewMode !== 'minute' || (viewMode === 'minute' && isExact3Hours),
    [viewMode, isExact3Hours]
  );

  // Get the appropriate fetch function
  const currentFetchFunction = useMemo(() => {
    if (onFetchData) return onFetchData;
    if (getFetchFunction) return getFetchFunction();
    return () => console.warn('No fetch function provided');
  }, [onFetchData, getFetchFunction]);

  // Get loading state
  const currentLoadingState = useMemo(() => {
    if (typeof getLoadingState === 'function') return getLoadingState();
    return loading || false;
  }, [getLoadingState, loading]);

  // Handle fetch button click
  const handleFetchClick = useCallback(() => {
    if (!token) {
      console.error('No token available');
      return;
    }

    if (viewMode === 'minute' && !isExact3Hours) {
      console.error('Time period must be exactly 3 hours for minute data');
      return;
    }

    if (typeof currentFetchFunction === 'function') {
      currentFetchFunction();
    }
  }, [currentFetchFunction, token, viewMode, isExact3Hours]);

  // Button text based on view mode
  const buttonConfig = useMemo(() => {
    switch (viewMode) {
      case 'minute':
        return {
          icon: <Clock className="w-5 h-5" />,
          loadingText: 'Loading Minute Data...',
          text: 'Fetch Minute Data'
        };
      case 'daily':
        return {
          icon: <Sun className="w-5 h-5" />,
          loadingText: 'Loading Weekly Data...',
          text: 'Fetch Weekly Data'
        };
      case 'monthly_daily':
        return {
          icon: <CalendarDays className="w-5 h-5" />,
          loadingText: 'Loading Monthly Data...',
          text: 'Fetch Monthly Data'
        };
      case 'monthly':
        return {
          icon: <Calendar className="w-5 h-5" />,
          loadingText: 'Loading Yearly Data...',
          text: 'Fetch Yearly Data'
        };
      case 'yearly':
        return {
          icon: <Layers className="w-5 h-5" />,
          loadingText: 'Loading Life Time Data...',
          text: 'Fetch Life Time Data'
        };
      default:
        return {
          icon: <Settings className="w-5 h-5" />,
          loadingText: 'Loading Data...',
          text: 'Fetch Data'
        };
    }
  }, [viewMode]);

  // Handle Start Date change for Daily view (auto-set end date to +6 days)
  const handleDailyStartDateChange = useCallback((e) => {
    const newStartDate = e.target.value;

    // If cleared, just update start date
    if (!newStartDate) {
      setDailyDateRange(prev => ({ ...prev, startDate: newStartDate }));
      return;
    }

    // Calculate end date (Start Date + 6 days for a 1-week range)
    const start = new Date(newStartDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    // Format to YYYY-MM-DD
    const newEndDate = end.toISOString().split('T')[0];

    setDailyDateRange({
      startDate: newStartDate,
      endDate: newEndDate
    });
  }, [setDailyDateRange]);

  // Handle Start Date change for Monthly-Daily view (auto-set end date to +29 days)
  const handleMonthlyDailyStartDateChange = useCallback((e) => {
    const newStartDate = e.target.value;

    // If cleared, just update start date
    if (!newStartDate) {
      setMonthlyDailyDateRange(prev => ({ ...prev, startDate: newStartDate }));
      return;
    }

    // Calculate end date (Start Date + 29 days for a 30-day range)
    const start = new Date(newStartDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 29);

    // Format to YYYY-MM-DD
    const newEndDate = end.toISOString().split('T')[0];

    setMonthlyDailyDateRange({
      startDate: newStartDate,
      endDate: newEndDate
    });
  }, [setMonthlyDailyDateRange]);

  // Handle Month Range changes with validation
  const handleMonthChange = useCallback((type, field, value) => {
    setMonthRange(prev => {
      const newRange = { ...prev, [field]: value };

      // If user changes End, automatically set Start to be 11 months prior to maintain 12-month window
      if (type === 'end') {
        const endYearNum = parseInt(newRange.endYear);
        const endMonthNum = parseInt(newRange.endMonth);

        let startMonthNum = endMonthNum - 11;
        let startYearNum = endYearNum;

        if (startMonthNum <= 0) {
          startMonthNum += 12;
          startYearNum -= 1;
        }

        newRange.startYear = startYearNum.toString();
        newRange.startMonth = startMonthNum.toString().padStart(2, '0');
      }

      const startVal = parseInt(`${newRange.startYear}${newRange.startMonth}`);
      const endVal = parseInt(`${newRange.endYear}${newRange.endMonth}`);

      // If user changes Start manually, and it becomes later than End, move End to match Start
      if (type === 'start' && startVal > endVal) {
        newRange.endYear = newRange.startYear;
        newRange.endMonth = newRange.startMonth;
      }

      return newRange;
    });
  }, [setMonthRange]);

  // Panel title
  const panelTitle = useMemo(() => {
    switch (viewMode) {
      case 'minute': return 'Daily Data Config';
      case 'daily': return 'Weekly Data Config';
      case 'monthly': return 'Yearly Data Config';
      case 'yearly': return 'Life Time Data Config';
      default: return 'Data Configuration';
    }
  }, [viewMode]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">

      <div className="flex items-center justify-between gap-4 mb-2">
        {/* Left: Title */}
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {panelTitle}
          </h3>
        </div>

        {/* Right: Status Button */}
        {/* Time Difference Display */}
        {viewMode === 'minute' && (
          <div className=''>
            <button
              type="button"
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${isExact3Hours
                ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-rose-500 bg-rose-50 text-rose-500 hover:bg-rose-200"
                }`}
            >
              <Clock className="h-4 w-4" />
              <span>{timeDifference.toFixed(2)}h</span>
            </button>
            {!isExact3Hours && (
              <p className="text-xs text-rose-600 mt-1">
                End time will be adjusted to exactly 3 hours from start time
              </p>
            )}
          </div>
        )}

      </div>



      {viewMode === 'minute' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateTime.startDate || ''}
                onChange={(e) => handleDateTimeChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={dateTime.startTime || ''}
                onChange={(e) => handleDateTimeChange('startTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                step="60"
              />
              <p className="text-xs text-gray-500 mt-1">Seconds: 00</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateTime.endDate || ''}
                onChange={(e) => handleDateTimeChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={dateTime.endTime || ''}
                onChange={(e) => handleDateTimeChange('endTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                step="60"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated (3 hours from start)</p>
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minute Interval
            </label>
            <select
              value={minuteForm?.minute_interval || 5}
              onChange={(e) => setMinuteForm(prev => ({ ...prev, minute_interval: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>
        </div>
      ) : viewMode === 'daily' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dailyDateRange.startDate || ''}
                onChange={handleDailyStartDateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dailyDateRange.endDate || ''}
                onChange={(e) => setDailyDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>
      ) : viewMode === 'monthly_daily' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={monthlyDailyDateRange.startDate || ''}
                onChange={handleMonthlyDailyStartDateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={monthlyDailyDateRange.endDate || ''}
                onChange={(e) => setMonthlyDailyDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>
      ) : viewMode === 'monthly' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Month
              </label>
              <select
                value={monthRange.startMonth || '01'}
                onChange={(e) => handleMonthChange('start', 'startMonth', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                    {monthNames[i]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Year
              </label>
              <select
                value={monthRange.startYear || new Date().getFullYear().toString()}
                onChange={(e) => handleMonthChange('start', 'startYear', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Month
              </label>
              <select
                value={monthRange.endMonth || '12'}
                onChange={(e) => handleMonthChange('end', 'endMonth', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                    {monthNames[i]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Year
              </label>
              <select
                value={monthRange.endYear || new Date().getFullYear().toString()}
                onChange={(e) => handleMonthChange('end', 'endYear', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Year
              </label>
              <select
                value={yearRange.startYear || (new Date().getFullYear() - 5).toString()}
                onChange={(e) => setYearRange(prev => ({ ...prev, startYear: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {Array.from({ length: 15 }, (_, i) => {
                  const year = new Date().getFullYear() - 10 + i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Year
              </label>
              <select
                value={yearRange.endYear || new Date().getFullYear().toString()}
                onChange={(e) => setYearRange(prev => ({ ...prev, endYear: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {Array.from({ length: 15 }, (_, i) => {
                  const year = new Date().getFullYear() - 10 + i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Fetch Button */}
      <button
        onClick={handleFetchClick}
        disabled={currentLoadingState || !token || (viewMode === 'minute' && !isExact3Hours)}
        className={`w-full mt-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${currentLoadingState || !token || (viewMode === 'minute' && !isExact3Hours)
          ? 'bg-gray-300 cursor-not-allowed text-gray-500'
          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
          }`}
      >
        {currentLoadingState ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            {buttonConfig.loadingText}
          </>
        ) : (
          <>
            {buttonConfig.icon}
            {buttonConfig.text}
          </>
        )}
      </button>

      {viewMode === 'minute' && !isExact3Hours && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Validation Required</span>
          </div>
          <p className="text-sm text-yellow-600 mt-1">
            For minute data, the time period must be exactly 3 hours. Please wait for auto-adjustment or check your inputs.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
});

export default ConfigurationPanel;