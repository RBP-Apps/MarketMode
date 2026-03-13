export default async function handler(req, res) {
    console.log('Starting monthly report sync cron job...');

    // CHECK LAST DAY OF MONTH
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

const isLastDayOfMonth = tomorrow.getDate() === 1;

if (!isLastDayOfMonth) {
    console.log("Not last day of month. Skipping...");
    return res.status(200).json({
        success: false,
        message: "Not last day of month. Skipping monthly report."
    });
}

    const SOLAR_APPKEY = process.env.VITE_SOLAR_APP_KEY;
    const SOLAR_SECRET_KEY = process.env.VITE_SOLAR_SECRET_KEY;
    const SOLAR_SYS_CODE = process.env.VITE_SOLAR_SYS_CODE || '207';
    const USER_ACCOUNT = process.env.VITE_USER_ACCOUNT;
    const USER_PASSWORD = process.env.VITE_USER_PASSWORD;
    const GOOGLE_SCRIPT_URL = process.env.VITE_GOOGLE_SCRIPT_URL;
    const SHEET_NAME = "Inverter_id";

    const authHeader = req.headers.authorization;
    if (req.headers['user-agent'] !== 'vercel-cron' && process.env.CRON_SECRET) {
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    if (!SOLAR_APPKEY || !SOLAR_SECRET_KEY || !USER_ACCOUNT || !USER_PASSWORD || !GOOGLE_SCRIPT_URL) {
        return res.status(500).json({ error: 'Missing API credentials.' });
    }

    try {

        // LOGIN
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

        const loginResult = await loginRes.json();
        const token = loginResult.result_data?.token;

        if (!token) throw new Error("Login failed");

        // FETCH INVERTERS
        const sheetUrl = `${GOOGLE_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}&action=fetch`;
        const sheetRes = await fetch(sheetUrl);
        const sheetData = await sheetRes.json();

        let rows = sheetData.table?.rows || [];

        const inverters = rows.slice(1).map((row, index) => {
            const values = row.c.map(cell => cell?.v || '');

            return {
                serialNo: values[0] || `S${index}`,
                inverterId: values[1],
                beneficiaryName: values[2],
                capacity: parseFloat(values[3]) || 1
            };
        }).filter(i => i.inverterId);

        console.log(`Found ${inverters.length} inverters`);

        // MONTH DATE RANGE
        const end = new Date();
        const start = new Date(end.getFullYear(), end.getMonth(), 1);

        const formatDate = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}${m}${day}`;
        };

        const apiStart = new Date(start);
        apiStart.setDate(apiStart.getDate() - 1);

        const apiStartDate = formatDate(apiStart);
        const apiEndDate = formatDate(end);

        const dateRangeStartStr = formatDate(start);
        const dateRangeEndStr = formatDate(end);

        const performanceData = [];

        const batchSize = 5;

        for (let i = 0; i < inverters.length; i += batchSize) {

            const batch = inverters.slice(i, i + batchSize);

            const batchResults = await Promise.all(batch.map(async (inverter) => {

                try {

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

                    const deviceData = await deviceRes.json();

                    const point = deviceData.result_data?.device_point_list?.find(p => p?.device_point?.ps_key);
                    const psKey = point?.device_point?.ps_key;

                    if (!psKey) return null;

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
                            ps_key_list: [psKey],
                            query_type: '1',
                            start_time: apiStartDate,
                            sys_code: 207
                        })
                    });

                    const energyData = await energyRes.json();

                    let totalKwh = 0;

                    if (energyData.result_code === "1") {

                        const psKeyData = Object.keys(energyData.result_data)[0];
                        const dataPoint = Object.keys(energyData.result_data[psKeyData])[0];
                        const dataArray = energyData.result_data[psKeyData][dataPoint];

                        let prev = 0;

                        dataArray.forEach((item, idx) => {

                            const valueKey = Object.keys(item).find(k => k !== 'time_stamp');

                            const current = (parseFloat(item[valueKey]) || 0) / 1000;

                            if (idx === 0) prev = current;
                            else {
                                totalKwh += Math.max(0, current - prev);
                                prev = current;
                            }

                        });

                    }

                    const daysInRange =
                        Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

                    const avgDailyKwh = totalKwh / daysInRange;

                    const specYield =
                        inverter.capacity > 0 ? avgDailyKwh / inverter.capacity : 0;

                    return {
                        serialNo: inverter.serialNo,
                        inverterId: inverter.inverterId,
                        beneficiaryName: inverter.beneficiaryName,
                        capacity: inverter.capacity,
                        totalKwh: Number(totalKwh.toFixed(2)),
                        avgDailyKwh: Number(avgDailyKwh.toFixed(2)),
                        specYield: Number(specYield.toFixed(3)),
                        daysInRange
                    };

                } catch (e) {
                    console.error("Error:", inverter.inverterId);
                    return null;
                }

            }));

            performanceData.push(...batchResults.filter(Boolean));

            await new Promise(r => setTimeout(r, 500));

        }

        const formattedStartDate =
            `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;

        const formattedEndDate =
            `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}/${end.getFullYear()}`;

        const submitRes = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'syncCSVFormat',
                sheetName: 'Monthly_Performance_Logs',
                dateRangeStart: formattedStartDate,
                dateRangeEnd: formattedEndDate,
                data: JSON.stringify(performanceData)
            }).toString()
        });

        const submitResult = await submitRes.json();

        return res.status(200).json({
            success: true,
            count: performanceData.length
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            error: err.message
        });

    }

}