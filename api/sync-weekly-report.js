// import dotenv from 'dotenv';
// dotenv.config();

export default async function handler(req, res) {
    console.log('Starting weekly report sync cron job...');

    // 1. Setup environment variables
    const SOLAR_APPKEY = process.env.VITE_SOLAR_APP_KEY;
    const SOLAR_SECRET_KEY = process.env.VITE_SOLAR_SECRET_KEY;
    const SOLAR_SYS_CODE = process.env.VITE_SOLAR_SYS_CODE || '207';
    const USER_ACCOUNT = process.env.VITE_USER_ACCOUNT;
    const USER_PASSWORD = process.env.VITE_USER_PASSWORD;
    const GOOGLE_SCRIPT_URL = process.env.VITE_GOOGLE_SCRIPT_URL;
    const SHEET_NAME = "Inverter_id";

    // Check vercel CRON authentication (strongly recommended for cron endpoints)
    const authHeader = req.headers.authorization;
    if (req.headers['user-agent'] !== 'vercel-cron' && process.env.CRON_SECRET) {
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    if (!SOLAR_APPKEY || !SOLAR_SECRET_KEY || !USER_ACCOUNT || !USER_PASSWORD || !GOOGLE_SCRIPT_URL) {
        console.error('Missing required environment variables');
        return res.status(500).json({ error: 'Missing API credentials. Please set them in Vercel environment variables.' });
    }

    try {
        // 2. Login to iSolarCloud
        console.log('Logging in to iSolarCloud...');
        const loginRes = await fetch('https://gateway.isolarcloud.com.hk/openapi/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-access-key': SOLAR_SECRET_KEY,
                'sys_code': SOLAR_SYS_CODE
            },
            body: JSON.stringify({
                appkey: SOLAR_APPKEY,
                user_account: USER_ACCOUNT,
                user_password: USER_PASSWORD
            })
        });

        if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
        const loginResult = await loginRes.json();
        if (loginResult.result_code !== "1") throw new Error(`Login failed: ${loginResult.result_msg}`);

        const token = loginResult.result_data?.token;
        if (!token) throw new Error('No token received from server');

        // 3. Fetch Inverters from Google Sheets
        console.log('Fetching inverters from Google Sheets...');
        const sheetUrl = `${GOOGLE_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}&action=fetch`;
        const sheetRes = await fetch(sheetUrl);

        if (!sheetRes.ok) throw new Error(`Failed to fetch inverter list: ${sheetRes.status}`);
        const sheetText = await sheetRes.text();
        let sheetData;

        try {
            sheetData = JSON.parse(sheetText);
        } catch (e) {
            const startIdx = sheetText.indexOf('{');
            const endIdx = sheetText.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                sheetData = JSON.parse(sheetText.substring(startIdx, endIdx + 1));
            } else {
                throw new Error('Invalid JSON response from Google Sheets');
            }
        }

        let rows = [];
        if (sheetData.table?.rows) rows = sheetData.table.rows;
        else if (Array.isArray(sheetData)) rows = sheetData;
        else if (sheetData.values) rows = sheetData.values.map(row => ({ c: row.map(val => ({ v: val })) }));

        const inverters = [];
        rows.forEach((row, index) => {
            if (index === 0) return; // skip header
            let rowValues = [];
            if (row.c) rowValues = row.c.map(cell => cell?.v || '');
            else if (Array.isArray(row)) rowValues = row;

            const serialNo = String(rowValues[0] || '').trim();
            const inverterId = String(rowValues[1] || '').trim();
            const beneficiaryName = String(rowValues[2] || '').trim();
            const capacity = parseFloat(String(rowValues[3] || '').trim()) || 1;

            if (inverterId && beneficiaryName) {
                inverters.push({
                    serialNo: serialNo || `S${index}`,
                    inverterId,
                    beneficiaryName,
                    capacity
                });
            }
        });

        console.log(`Found ${inverters.length} inverters.`);
        if (inverters.length === 0) throw new Error("No inverters found in the sheet.");

        // 4. Define date range (Last 7 days, mimicking frontend UI)
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);

        const formatDateForAPI = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        };

        const formatDateForFrontend = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        };

        // API needs start time specifically set one day before for calculation
        const apiStart = new Date(start);
        apiStart.setDate(apiStart.getDate() - 1);

        const apiStartDate = formatDateForAPI(apiStart);
        const apiEndDate = formatDateForAPI(end);

        const dateRangeStartStr = formatDateForFrontend(start);
        const dateRangeEndStr = formatDateForFrontend(end);

        // 5. Fetch performance and energy data
        const performanceData = [];
        // Process in batches to avoid overwhelming the server and handle Vercel timeout limits
        // Max Vercel function timeout on hobby is 10s, max on Pro is 60s
        // 5 inverters per batch keeps connections manageable
        const batchSize = 5;

        for (let i = 0; i < inverters.length; i += batchSize) {
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(inverters.length / batchSize)}...`);
            const batch = inverters.slice(i, i + batchSize);

            const batchPromises = batch.map(async (inverter) => {
                try {
                    // A. Fetch PS Key
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

                    if (!deviceRes.ok) throw new Error(`Device fetch failed: ${deviceRes.status}`);
                    const deviceData = await deviceRes.json();
                    const point = deviceData.result_data?.device_point_list?.find(p => p?.device_point?.ps_key);
                    const psKey = point?.device_point?.ps_key;

                    if (!psKey) return null; // Can't fetch without psKey

                    // B. Get Energy Data using PS Key
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

                    if (!energyRes.ok) throw new Error(`Energy fetch failed: ${energyRes.status}`);
                    const energyData = await energyRes.json();
                    let totalKwh = 0;
                    let lifetimeGeneration = 0;

                    if (energyData.result_code === "1" && energyData.result_data) {
                        const psKeyData = Object.keys(energyData.result_data)[0];
                        if (psKeyData) {
                            const dataPoint = Object.keys(energyData.result_data[psKeyData])[0];
                            const dataArray = energyData.result_data[psKeyData][dataPoint];

                            if (dataArray && Array.isArray(dataArray)) {
                                // Same logic as component: sort by timestamp, diffing sequential results
                                const sortedData = [...dataArray].sort((a, b) => a.time_stamp.localeCompare(b.time_stamp));
                                let previousValue = 0;
                                const dailyData = [];

                                sortedData.forEach((item, idx) => {
                                    const valueKey = Object.keys(item).find(key => key !== 'time_stamp');
                                    if (valueKey) {
                                        const currentKwh = (parseFloat(item[valueKey]) || 0) / 1000;
                                        if (idx === 0) previousValue = currentKwh;
                                        else {
                                            dailyData.push({
                                                date: item.time_stamp,
                                                dailyKwh: Math.max(0, currentKwh - previousValue),
                                                cumulativeKwh: currentKwh
                                            });
                                            previousValue = currentKwh;
                                        }
                                    }
                                });

                                // Filter to the actual date bounds requested
                                const filteredDailyData = dailyData.filter(item => {
                                    try {
                                        const itemDate = item.date.slice(0, 8); // YYYYMMDD
                                        return itemDate >= dateRangeStartStr && itemDate <= dateRangeEndStr;
                                    } catch (e) { return false; }
                                });

                                totalKwh = filteredDailyData.reduce((sum, day) => sum + day.dailyKwh, 0);
                                if (dailyData.length > 0) {
                                    lifetimeGeneration = dailyData[dailyData.length - 1].cumulativeKwh;
                                }
                            }
                        }
                    }

                    // 8 total days since (end - start = 7) means 8 days inclusive
                    const daysInRange = 8;
                    const avgDailyKwh = totalKwh / daysInRange;
                    const specYield = inverter.capacity > 0 ? avgDailyKwh / inverter.capacity : 0;

                    return {
                        serialNo: inverter.serialNo,
                        inverterId: inverter.inverterId,
                        beneficiaryName: inverter.beneficiaryName,
                        capacity: inverter.capacity,
                        totalKwh: Number(totalKwh.toFixed(2)),
                        avgDailyKwh: Number(avgDailyKwh.toFixed(2)),
                        specYield: Number(specYield.toFixed(3)),
                        daysInRange,
                        lifetimeGeneration
                    };
                } catch (e) {
                    console.error(`Error processing ${inverter.inverterId}:`, e.message);
                    return null;
                }
            });

            const batchResults = await Promise.all(batchPromises);
            performanceData.push(...batchResults.filter(Boolean));
            // Give the socket/API a breather to avoid rate limits
            await new Promise(res => setTimeout(res, 500));
        }

        if (performanceData.length === 0) {
            throw new Error("No valid inverter data successfully collected to sync");
        }

        // 6. Push collected CSV data array into Google apps script formatting
        console.log(`Submitting ${performanceData.length} records to Google Sheets...`);
        const formattedStartDate = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
        const formattedEndDate = `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}/${end.getFullYear()}`;

        const submitRes = await fetch(GOOGLE_SCRIPT_URL, {
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
                data: JSON.stringify(performanceData)
            }).toString()
        });

        if (!submitRes.ok) throw new Error(`Submit failed with status ${submitRes.status}`);
        const submitResult = await submitRes.json();

        if (!submitResult.success) {
            throw new Error(submitResult.error || submitResult.message || "Sync failed on Google apps script");
        }

        console.log('Successfully completed weekly report sync!');
        return res.status(200).json({
            success: true,
            count: performanceData.length,
            details: submitResult,
            dateRange: `${formattedStartDate} - ${formattedEndDate}`
        });

    } catch (err) {
        console.error('Job failed:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
