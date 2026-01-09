import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, Legend
} from 'recharts';
import { RefreshCw, BarChart3, AlertCircle, Info, ArrowUp, ArrowDown } from 'lucide-react';

// Environment variables
const SOLAR_APPKEY = import.meta.env.VITE_SOLAR_APP_KEY;
const SOLAR_SECRET_KEY = import.meta.env.VITE_SOLAR_SECRET_KEY;
const SOLAR_SYS_CODE = import.meta.env.VITE_SOLAR_SYS_CODE || '207';
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec";
const SHEET_NAME = "Inverter_id";

const SpecificYieldRanking = ({ token }) => {
    // State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [rankingData, setRankingData] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Fetch Data
    const fetchData = async () => {
        if (!token) {
            // Silently wait for token, or show "Waiting for login..."
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Fetch Google Sheet Data
            const sheetResponse = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}&action=fetch`);
            if (!sheetResponse.ok) throw new Error('Failed to fetch Google Sheets data');

            const sheetText = await sheetResponse.text();
            let sheetJson;
            try {
                sheetJson = JSON.parse(sheetText);
            } catch (e) {
                // Fallback for JSONP-like responses
                const start = sheetText.indexOf('{');
                const end = sheetText.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    sheetJson = JSON.parse(sheetText.substring(start, end + 1));
                } else {
                    throw new Error('Invalid JSON from Google Sheets');
                }
            }

            // Parse Sheet Rows
            let rows = [];
            if (sheetJson.table?.rows) rows = sheetJson.table.rows;
            else if (Array.isArray(sheetJson)) rows = sheetJson;
            else if (sheetJson.values) {
                rows = sheetJson.values.map(row => ({ c: row.map(val => ({ v: val })) }));
            }

            // Extract Inverters
            const inverters = [];
            rows.forEach((row, index) => {
                if (index === 0) return; // Skip Header

                let rowValues = [];
                if (row.c) rowValues = row.c.map(cell => cell?.v || '');
                else if (Array.isArray(row)) rowValues = row;

                const serialNo = String(rowValues[0] || '').trim();
                const inverterId = String(rowValues[1] || '').trim();
                const beneficiaryName = String(rowValues[2] || '').trim();
                const capacityStr = String(rowValues[3] || '').trim();
                const capacity = parseFloat(capacityStr) || 1; // Default to 1 to avoid div/0

                if (inverterId && beneficiaryName) {
                    inverters.push({
                        id: index,
                        inverterId,
                        beneficiaryName,
                        capacity,
                        serialNo
                    });
                }
            });

            console.log(`Found ${inverters.length} inverters from sheet`);

            if (inverters.length === 0) {
                setTimeout(() => setLoading(false), 500);
                return;
            }

            // Parallel Fetching for Robustness (Limit concurrency)
            // We need: Sheet Inverter -> (Get PS Key) -> (Get Weekly Data) -> Calc

            const processInverter = async (inverter) => {
                try {
                    // A. Get PS Key
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
                            sn_list: [inverter.inverterId],
                            lang: '_en_US',
                            sys_code: 207
                        })
                    });
                    const deviceJson = await deviceRes.json();

                    // Robust PS Key finding
                    let psKey = null;
                    if (deviceJson.result_code === "1" && deviceJson.result_data?.device_point_list) {
                        const point = deviceJson.result_data.device_point_list.find(p => p?.device_point?.ps_key);
                        psKey = point?.device_point?.ps_key;
                    }

                    if (!psKey) {
                        console.warn(`No PS Key found for inverter: ${inverter.inverterId}`);
                        return null;
                    }

                    // B. Get Last 7 Days Energy
                    const today = new Date();
                    const endDate = formatDateForAPI(today);
                    const startDateObj = new Date();
                    startDateObj.setDate(today.getDate() - 7);
                    const startDate = formatDateForAPI(startDateObj);

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
                            data_point: 'p2', // Monthly/Daily Energy
                            data_type: '2', // Day
                            end_time: endDate,
                            lang: '_en_US',
                            order: '0',
                            ps_key_list: [psKey],
                            query_type: '1', // Range
                            start_time: startDate,
                            sys_code: 207
                        })
                    });

                    const energyJson = await energyRes.json();

                    let totalWeeklyKwh = 0;
                    if (energyJson.result_code === "1" && energyJson.result_data) {
                        // Sum up the values
                        // The result_data is usually an array (Time, Value) or object list
                        // The API returns strictly [{time:..., value:...}, ...]
                        const list = energyJson.result_data;
                        if (Array.isArray(list)) {
                            list.forEach(item => {
                                const val = parseFloat(item.value || 0);
                                totalWeeklyKwh += val;
                            });
                        }
                    } else {
                        console.warn(`Failed to fetch energy data for ${inverter.inverterId}: ${energyJson.result_msg}`);
                    }

                    const avgDaily = totalWeeklyKwh / 7;
                    const specYield = avgDaily / inverter.capacity;

                    return {
                        ...inverter,
                        totalWeeklyKwh,
                        avgDaily,
                        specYield
                    };

                } catch (e) {
                    console.error(`Error processing ${inverter.inverterId}:`, e);
                    return null;
                }
            };

            // Process in batches of 5 to respect API rate limits
            const results = [];
            for (let i = 0; i < inverters.length; i += 5) {
                const chunk = inverters.slice(i, i + 5);
                const chunkResults = await Promise.all(chunk.map(processInverter));
                results.push(...chunkResults.filter(r => r !== null));
            }

            // Sort by Specific Yield (Desc)
            results.sort((a, b) => b.specYield - a.specYield);

            setRankingData(results);
            setLastUpdated(new Date());

        } catch (err) {
            console.error('Ranking fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Helpers
    const formatDateForAPI = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    // Initial Fetch
    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    // Dynamic height calculation
    const chartHeight = Math.max(rankingData.length * 60, 400);

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mt-8">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-purple-600" />
                        Specific Yield Ranking
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Performance comparison normalized by capacity (Avg Daily kWh / Installed kW)
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${loading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 hover:shadow-sm'
                        }`}
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Analyzing...' : 'Refresh Ranking'}
                </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-x-auto">
                {error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
                        <AlertCircle className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                ) : loading && rankingData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3"></div>
                        <p>Fetching inverter data and calculating specific yields...</p>
                        <p className="text-xs text-gray-400 mt-2">This process analyzes 7 days of data for each inverter</p>
                    </div>
                ) : rankingData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                        <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
                        <p>No data available. Ensure AutoLogin has a valid token.</p>
                    </div>
                ) : (
                    <div style={{ height: `${chartHeight}px`, minWidth: '600px' }} className="w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={rankingData}
                                layout="vertical"
                                margin={{ top: 20, right: 50, left: 20, bottom: 20 }}
                                barSize={30}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" domain={[0, 'auto']} hide={false} tick={{ fontSize: 11 }} />
                                <YAxis
                                    dataKey="beneficiaryName"
                                    type="category"
                                    width={180}
                                    tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                                    interval={0}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-100 text-sm z-50">
                                                    <p className="font-bold text-gray-900 mb-1">{data.beneficiaryName}</p>
                                                    <div className="space-y-1 text-gray-600">
                                                        <p className="flex justify-between gap-4">
                                                            <span>Inverter ID:</span>
                                                            <span className="font-mono">{data.inverterId}</span>
                                                        </p>
                                                        <p className="flex justify-between gap-4">
                                                            <span>Capacity:</span>
                                                            <span className="font-medium text-gray-900">{data.capacity} kW</span>
                                                        </p>
                                                        <div className="h-px bg-gray-100 my-2"></div>
                                                        <p className="flex justify-between gap-4">
                                                            <span>Weekly Total:</span>
                                                            <span>{data.totalWeeklyKwh.toFixed(1)} kWh</span>
                                                        </p>
                                                        <p className="flex justify-between gap-4">
                                                            <span>Avg Daily:</span>
                                                            <span>{data.avgDaily.toFixed(2)} kWh</span>
                                                        </p>
                                                        <p className="flex justify-between gap-4 text-purple-700 font-bold bg-purple-50 px-2 py-1 rounded">
                                                            <span>Spec. Yield:</span>
                                                            <span>{data.specYield.toFixed(3)} kWh/kW</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar
                                    dataKey="specYield"
                                    name="Specific Yield"
                                    radius={[0, 4, 4, 0]}
                                    animationDuration={1000}
                                >
                                    {rankingData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={index < 3 ? '#9333ea' : '#c084fc'}
                                            fillOpacity={index < 3 ? 1 : 0.8}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            {rankingData.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Target: &gt; 4.0 kWh/kW/day indicates excellent performance</span>
                    <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}</span>
                </div>
            )}
        </div>
    );
};

export default SpecificYieldRanking;
