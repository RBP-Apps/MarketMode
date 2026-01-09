import React, { useState, useEffect, useCallback, useMemo } from "react";
import AdminLayout from "../components/layout/AdminLayout";
import {
    Loader2, AlertTriangle, RefreshCw, Search, Zap,
    Calendar, CheckCircle, Database, Activity, Grid3x3,
    Layers, Users, Download
} from "lucide-react";

// Solar API Constants
const SOLAR_APPKEY = import.meta.env.VITE_SOLAR_APP_KEY;
const SOLAR_SECRET_KEY = import.meta.env.VITE_SOLAR_SECRET_KEY;
const SOLAR_SYS_CODE = import.meta.env.VITE_SOLAR_SYS_CODE || '207';
const USER_ACCOUNT = import.meta.env.VITE_USER_ACCOUNT;
const USER_PASSWORD = import.meta.env.VITE_USER_PASSWORD;

function AllGraph() {
    // 1. Google Sheet Data State
    const [inverterData, setInverterData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    // 2. Solar API State (Logic from DecadeYearlyAggregatedChart)
    const [token, setToken] = useState(() => {
        const savedToken = localStorage.getItem('solarToken');
        const tokenTimestamp = localStorage.getItem('solarTokenTimestamp');
        if (savedToken && tokenTimestamp) {
            const tokenAge = Date.now() - parseInt(tokenTimestamp);
            if (tokenAge < 60 * 60 * 1000) return savedToken;
        }
        return '';
    });

    const [devices, setDevices] = useState([]); // Array of { serialNumber, psKey, deviceName }
    const [yearlyData, setYearlyData] = useState({}); // { serialNumber: { data, formatted } }
    const [aggregatedData, setAggregatedData] = useState([]);
    const [solarLoading, setSolarLoading] = useState(false);
    const [solarError, setSolarError] = useState(null);
    const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });

    const [yearRange, setYearRange] = useState({
        startYear: new Date().getFullYear() - 9,
        endYear: new Date().getFullYear()
    });

    const yearlyForm = {
        data_point: 'p2',
        data_type: '2',
        query_type: '3',
        order: '0'
    };

    // 3. Fetch Inverter List from Google Sheet
    const fetchInverterDataFromSheet = async () => {
        try {
            setLoading(true);
            setError(null);
            const sheetId = "1Cc8RltkrZMfeSgHqnrJ1zdTx-NDu1BpLnh5O7i711Pc";
            const sheetName = "Inverter_id";
            const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status}`);

            const text = await response.text();
            const jsonStart = text.indexOf("{");
            const jsonEnd = text.lastIndexOf("}");
            const jsonString = text.substring(jsonStart, jsonEnd + 1);
            const data = JSON.parse(jsonString);

            if (data.table && data.table.rows) {
                const processedData = data.table.rows.slice(0).map((row) => ({
                    serialNo: row.c[0] ? row.c[0].v : "",
                    inverterId: row.c[1] ? row.c[1].v : "",
                    beneficiaryName: row.c[2] ? row.c[2].v : "",
                })).filter(item => item.inverterId);

                setInverterData(processedData);
                console.log(`Loaded ${processedData.length} inverters from Google Sheet`);
            }
        } catch (err) {
            console.error("Sheet Fetch Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 4. Refined Sync Logic (Merged from DecadeYearlyAggregatedChart)
    const handleSyncAllSolar = async () => {
        if (inverterData.length === 0) {
            setSolarError("No inverters found from sheet. Please fetch sheet data first.");
            return;
        }

        setSolarLoading(true);
        setSolarError(null);
        setProgress({ current: 0, total: 100, message: 'Starting cloud sync...' });

        try {
            // A. Authenticate
            let currentToken = token;
            const tokenTimestamp = localStorage.getItem('solarTokenTimestamp');
            const tokenAge = tokenTimestamp ? Date.now() - parseInt(tokenTimestamp) : Infinity;

            if (!currentToken || tokenAge > 50 * 60 * 1000) {
                setProgress({ current: 10, total: 100, message: 'Authenticating...' });
                const loginResponse = await fetch('https://gateway.isolarcloud.com.hk/openapi/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-access-key': SOLAR_SECRET_KEY, 'sys_code': SOLAR_SYS_CODE },
                    body: JSON.stringify({ appkey: SOLAR_APPKEY, user_account: USER_ACCOUNT, user_password: USER_PASSWORD })
                });
                const loginResult = await loginResponse.json();
                if (loginResult.result_code !== "1") throw new Error(loginResult.result_msg);

                currentToken = loginResult.result_data.token;
                setToken(currentToken);
                localStorage.setItem('solarToken', currentToken);
                localStorage.setItem('solarTokenTimestamp', Date.now().toString());
            }

            // B. Fetch PS Keys (Devices) in bulk using SNs from Google Sheet
            setProgress({ current: 30, total: 100, message: 'Mapping cloud devices...' });
            const snList = inverterData.map(inv => inv.inverterId.trim());
            const deviceResponse = await fetch('https://gateway.isolarcloud.com.hk/openapi/getPVInverterRealTimeData', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', 'x-access-key': SOLAR_SECRET_KEY,
                    'sys_code': SOLAR_SYS_CODE, 'token': currentToken
                },
                body: JSON.stringify({ appkey: SOLAR_APPKEY, sn_list: snList, lang: '_en_US', sys_code: 207 })
            });

            const devicesResult = await deviceResponse.json();
            if (devicesResult.result_code !== "1") throw new Error(devicesResult.result_msg);

            const deviceList = devicesResult.result_data?.device_point_list || [];
            const fetchedDevices = [];

            deviceList.forEach(item => {
                const dp = item.device_point;
                if (dp && dp.ps_key) {
                    const sn = dp.sn || dp.serial_number || dp.device_sn ||
                        snList.find(s => (dp.device_name?.includes(s)) || (dp.ps_key?.includes(s)));

                    const sheetMatch = inverterData.find(inv => inv.inverterId.trim() === sn);

                    fetchedDevices.push({
                        serialNumber: sn || 'Unknown',
                        psKey: dp.ps_key,
                        deviceName: sheetMatch?.beneficiaryName || dp.device_name || sn,
                        success: true
                    });
                }
            });

            setDevices(fetchedDevices);
            if (fetchedDevices.length === 0) throw new Error('Could not find cloud match for these inverters.');

            // C. Fetch Yearly Data in bulk (Lifecycle)
            setProgress({ current: 60, total: 100, message: 'Retrieving annual logs...' });
            const psKeyList = fetchedDevices.map(d => d.psKey);
            const historyResponse = await fetch('https://gateway.isolarcloud.com.hk/openapi/getDevicePointsDayMonthYearDataList', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', 'x-access-key': SOLAR_SECRET_KEY,
                    'sys_code': SOLAR_SYS_CODE, 'token': currentToken
                },
                body: JSON.stringify({
                    appkey: SOLAR_APPKEY,
                    data_point: yearlyForm.data_point,
                    data_type: yearlyForm.data_type,
                    end_time: yearRange.endYear.toString(),
                    lang: '_en_US',
                    order: yearlyForm.order,
                    ps_key_list: psKeyList,
                    query_type: yearlyForm.query_type,
                    start_time: yearRange.startYear.toString(),
                    sys_code: 207
                })
            });

            const yearlyResult = await historyResponse.json();
            if (yearlyResult.result_code !== "1") throw new Error(yearlyResult.result_msg);

            const resultData = yearlyResult.result_data;
            const newYearlyData = {};
            let successCount = 0;

            if (resultData) {
                fetchedDevices.forEach(device => {
                    const deviceData = resultData[device.psKey];
                    if (deviceData) {
                        const syntheticApiResult = { result_data: { [device.psKey]: deviceData } };
                        newYearlyData[device.serialNumber] = {
                            deviceName: device.deviceName,
                            data: syntheticApiResult,
                            formatted: formatYearlyData(syntheticApiResult, device.serialNumber, yearRange)
                        };
                        successCount++;
                    }
                });
            }

            setYearlyData(newYearlyData);
            if (successCount > 0) {
                calculateAggregatedData(newYearlyData);
            }

            setProgress({ current: 100, total: 100, message: 'Sync Complete' });
            setTimeout(() => setProgress({ current: 0, total: 0, message: '' }), 1500);

        } catch (err) {
            console.error("Solar Sync Error:", err);
            setSolarError(err.message);
        } finally {
            setSolarLoading(false);
        }
    };

    // 5. Data Formatting Helpers
    const formatYearlyData = (apiData, serialNumber, range) => {
        if (!apiData || !apiData.result_data) return [];
        const psKey = Object.keys(apiData.result_data)[0];
        const dataPoint = Object.keys(apiData.result_data[psKey])[0];
        const dataArray = apiData.result_data[psKey][dataPoint];
        if (!dataArray || dataArray.length === 0) return [];

        const sortedData = [...dataArray].sort((a, b) => parseInt(a.time_stamp) - parseInt(b.time_stamp));
        const result = [];
        let previousCumulativeKwh = 0;

        sortedData.forEach(item => {
            const year = item.time_stamp;
            const valueKey = Object.keys(item).find(key => key !== 'time_stamp');
            if (!valueKey) return;

            const cumulativeKwh = (parseFloat(item[valueKey]) || 0) / 1000;
            const yearlyKwh = cumulativeKwh - previousCumulativeKwh;
            const safeYearlyKwh = Math.max(0, yearlyKwh);

            const yearNum = parseInt(year);
            if (yearNum >= range.startYear && yearNum <= range.endYear) {
                result.push({
                    year,
                    yearNum,
                    yearlyKwh: safeYearlyKwh,
                    cumulativeKwh: cumulativeKwh,
                    serialNumber
                });
            }
            previousCumulativeKwh = cumulativeKwh;
        });
        return result.sort((a, b) => a.yearNum - b.yearNum);
    };

    const calculateAggregatedData = (yearlyDataObj) => {
        const allYears = new Set();
        Object.values(yearlyDataObj).forEach(deviceData => {
            deviceData.formatted.forEach(item => allYears.add(item.year));
        });

        const yearsArray = Array.from(allYears).sort();
        const aggregated = yearsArray.map(year => {
            let totalYearlyKwh = 0;
            let totalCumulativeKwh = 0;
            Object.values(yearlyDataObj).forEach(deviceData => {
                const yearData = deviceData.formatted.find(item => item.year === year);
                if (yearData) {
                    totalYearlyKwh += yearData.yearlyKwh;
                    totalCumulativeKwh += yearData.cumulativeKwh;
                }
            });
            return {
                year,
                yearNum: parseInt(year),
                totalYearlyKwh: Number(totalYearlyKwh.toFixed(2)),
                totalCumulativeKwh: Number(totalCumulativeKwh.toFixed(2))
            };
        });
        setAggregatedData(aggregated);
    };

    const applyDecadePreset = (preset) => {
        const currentYear = new Date().getFullYear();
        if (preset === 'lastDecade') setYearRange({ startYear: currentYear - 9, endYear: currentYear });
        if (preset === '2010s') setYearRange({ startYear: 2010, endYear: 2019 });
        if (preset === '2000s') setYearRange({ startYear: 2000, endYear: 2009 });
    };

    // 6. Effects
    useEffect(() => {
        fetchInverterDataFromSheet();
    }, []);

    // Filter Logic
    const filteredData = inverterData.filter(
        (item) =>
            item.beneficiaryName?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.inverterId?.toString().toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="p-8 space-y-8 bg-white min-h-full">

                {/* 1. Refined Dashboard Header (Merged Style) */}
                <div className="bg-white rounded-3xl shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] border border-gray-100 p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                                <Zap className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                                    Solar Production Intelligence
                                </h1>
                                <p className="text-lg text-gray-500 font-semibold mt-2">
                                    Monitoring energy across <span className="text-blue-600 font-bold">{inverterData.length}</span> verified units
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Quick search units..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 w-full md:w-80 text-base font-bold transition-all"
                                />
                            </div>

                            <button
                                onClick={handleSyncAllSolar}
                                disabled={solarLoading || loading}
                                className={`group relative flex items-center gap-4 px-10 py-5 rounded-2xl font-black text-lg transition-all duration-300 shadow-xl ${solarLoading
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-900 text-white hover:bg-black active:scale-95 shadow-gray-200'
                                    }`}
                            >
                                {solarLoading ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        <span>Syncing Cloud...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500 text-blue-400" />
                                        <span>Sync Lifetime Data</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className=" pt-8 border-t border-gray-50 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">

                            {[].map(preset => (
                                <button
                                    key={preset}
                                    onClick={() => applyDecadePreset(preset)}
                                    className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all ${yearRange.startYear === (preset === 'lastDecade' ? new Date().getFullYear() - 9 : preset === '2010s' ? 2010 : 2000)
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {preset === 'lastDecade' ? 'Current Decade' : preset}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 text-base font-black text-gray-700 bg-blue-50/50 border border-blue-100 px-6 py-3 rounded-2xl">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <span>Interval: {yearRange.startYear} — {yearRange.endYear}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Error Display */}
                {(error || solarError) && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-semibold">{error || solarError}</p>
                        <button onClick={() => { setError(null); setSolarError(null) }} className="ml-auto text-xs font-bold underline">Dismiss</button>
                    </div>
                )}

                {/* 3. Progress Overlay (if syncing) */}
                {solarLoading && progress.total > 0 && (
                    <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm animate-pulse">
                        <div className="flex items-center justify-between mb-3 text-sm font-bold text-blue-600">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                <span>{progress.message}</span>
                            </div>
                            <span>{progress.current}%</span>
                        </div>
                        <div className="w-full bg-blue-50 rounded-full h-3">
                            <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress.current}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* 4. Main Inverter Insights (The Table) */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-8 py-6 text-left text-xs font-black text-gray-400 uppercase tracking-[0.2em]">SN</th>
                                    <th className="px-8 py-6 text-left text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Hardware ID</th>
                                    <th className="px-8 py-6 text-left text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Beneficiary</th>
                                    <th className="px-8 py-6 text-left text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Cloud Status</th>
                                    <th className="px-8 py-6 text-left text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Lifecycle Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="w-12 h-12 text-blue-200 animate-spin" />
                                                <p className="text-gray-500 text-lg font-bold">Synchronizing registry...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.length > 0 ? (
                                    filteredData.map((item, index) => {
                                        const deviceSync = yearlyData[item.inverterId];
                                        const lifetimeVal = deviceSync?.formatted?.slice(-1)[0]?.cumulativeKwh;
                                        const isConnected = !!devices.find(d => d.serialNumber === item.inverterId);

                                        return (
                                            <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-8 py-8 text-base text-gray-500 font-black">{item.serialNo || index + 1}</td>
                                                <td className="px-8 py-8 text-lg font-black text-gray-900">{item.inverterId}</td>
                                                <td className="px-8 py-8 text-base text-gray-700 font-bold group-hover:text-black transition-colors">
                                                    {item.beneficiaryName}
                                                </td>
                                                <td className="px-8 py-8">
                                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${isConnected ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                                                        }`}>
                                                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                                        {isConnected ? 'Online' : 'Standby'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-8">
                                                    {solarLoading ? (
                                                        <div className="h-8 w-32 bg-gray-100 animate-pulse rounded-lg" />
                                                    ) : lifetimeVal !== undefined ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-2xl font-black text-blue-600 leading-none">
                                                                {lifetimeVal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                                <span className="text-xs ml-1.5 text-gray-400 font-bold">kWh</span>
                                                            </span>
                                                            <span className="text-xs text-gray-400 font-black uppercase tracking-tight mt-1">Verified Lifecycle</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 font-black italic text-base">No Cloud Data</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-black text-lg">
                                            No units found matching "{searchQuery}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 5. Dashboard Summary (Merged Style) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Network Coverage</span>
                            <Grid3x3 className="w-6 h-6 text-blue-200" />
                        </div>
                        <div className="mt-6">
                            <div className="text-4xl font-black text-gray-900">{inverterData.length}</div>
                            <div className="text-sm text-gray-500 font-bold mt-2">Total Registered Units</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Cloud Availability</span>
                            <Layers className="w-6 h-6 text-green-200" />
                        </div>
                        <div className="mt-6">
                            <div className="text-4xl font-black text-gray-900">
                                {devices.length} <span className="text-sm text-gray-300 font-bold">/ {inverterData.length}</span>
                            </div>
                            <div className="text-sm text-green-600 font-black mt-2 flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4" /> Linked Successfully
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Aggregate Output</span>
                            <Activity className="w-6 h-6 text-orange-200" />
                        </div>
                        <div className="mt-6">
                            <div className="text-4xl font-black text-gray-900 leading-tight">
                                {aggregatedData.length > 0 ? (aggregatedData.reduce((acc, curr) => acc + curr.totalYearlyKwh, 0).toLocaleString()) : '0'}
                                <span className="text-sm text-gray-300 ml-1.5 font-bold">kWh</span>
                            </div>
                            <div className="text-sm text-gray-500 font-bold mt-2">Total System Production</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Historical Span</span>
                            <Calendar className="w-6 h-6 text-purple-200" />
                        </div>
                        <div className="mt-6">
                            <div className="text-4xl font-black text-gray-900">{aggregatedData.length}</div>
                            <div className="text-sm text-gray-500 font-bold mt-2">Years of Aggregated Data</div>
                        </div>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
}

export default AllGraph;