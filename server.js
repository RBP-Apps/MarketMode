const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const SOLAR_USER_ACCOUNT = process.env.REACT_APP_USER_ACCOUNT;
const SOLAR_USER_PASSWORD = process.env.REACT_APP_USER_PASSWORD;
const SOLAR_APP_KEY = process.env.SOLAR_APP_KEY;
const SOLAR_SECRET_KEY = process.env.SOLAR_SECRET_KEY;

const app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());

// Configuration
const SOLAR_CONFIG = {
  appkey: SOLAR_APP_KEY,
  secretKey: SOLAR_SECRET_KEY,
  sysCode: '207'
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.get("/proxy", async (req, res) => {
  try {
    const response = await axios.get("https://script.google.com/a/macros/botivate.in/s/AKfycbxjYYdBHyeK1n65Er6c76ymzKvBvZr8ixit2_OUTRA/dev"); 
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint
app.post('/api/solar/login', async (req, res) => {
  try {
    const { user_account, user_password } = req.body;

    console.log('Login request for:', user_account);

    const response = await axios.post(
      'https://gateway.isolarcloud.com.hk/openapi/login',
      {
        appkey: SOLAR_CONFIG.appkey,
        user_account: SOLAR_USER_ACCOUNT,
        user_password: SOLAR_USER_PASSWORD,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_CONFIG.secretKey,
          'sys_code': SOLAR_CONFIG.sysCode
        }
      }
    );

    console.log('Login successful');
    res.json(response.data);
    
  } catch (error) {
    console.error('Login error:', error.message);
    
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        details: error.response?.data
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
});

// Minute data endpoint (10-minute interval data)
app.post('/api/solar/minute-data', async (req, res) => {
  try {
    const { 
      token, 
      ps_key_list, 
      points, 
      start_time_stamp, 
      end_time_stamp,
      minute_interval = 10,
      is_get_data_acquisition_time = "1",
      lang = "_en_US"
    } = req.body;
    
    // Validate required fields
    if (!token || !ps_key_list || !points || !start_time_stamp || !end_time_stamp) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['token', 'ps_key_list', 'points', 'start_time_stamp', 'end_time_stamp']
      });
    }

    console.log('Fetching minute data:', {
      ps_key_list,
      points,
      start_time_stamp,
      end_time_stamp,
      minute_interval
    });

    const response = await axios.post(
      'https://gateway.isolarcloud.com.hk/openapi/getDevicePointMinuteDataList',
      {
        appkey: SOLAR_CONFIG.appkey,
        end_time_stamp: end_time_stamp,
        is_get_data_acquisition_time: is_get_data_acquisition_time,
        lang: lang,
        minute_interval: minute_interval,
        points: points,
        ps_key_list: Array.isArray(ps_key_list) ? ps_key_list : [ps_key_list],
        start_time_stamp: start_time_stamp,
        sys_code: 207,
        token: token
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_CONFIG.secretKey,
          'sys_code': '901',
          'token': token
        }
      }
    );

    console.log('Minute data fetched successfully');
    res.json(response.data);
    
  } catch (error) {
    console.error('Minute data error:', error.message);
    
    if (axios.isAxiosError(error)) {
      console.error('Error response:', error.response?.data);
      res.status(error.response?.status || 500).json({
        error: error.message,
        details: error.response?.data
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
});

// Real-time inverter data endpoint
app.post('/api/solar/inverter-data', async (req, res) => {
  try {
    const { token, sn_list } = req.body;
    
    if (!token || !sn_list) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['token', 'sn_list']
      });
    }

    console.log('Fetching real-time data');

    const response = await axios.post(
      'https://gateway.isolarcloud.com.hk/openapi/getPVInverterRealTimeData',
      {
        sn_list: Array.isArray(sn_list) ? sn_list : [sn_list],
        appkey: SOLAR_CONFIG.appkey,
        lang: '_en_US',
        sys_code: 207
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_CONFIG.secretKey,
          'sys_code': '901',
          'token': token
        }
      }
    );

    console.log('Real-time data fetched');
    res.json(response.data);
    
  } catch (error) {
    console.error('Real-time data error:', error.message);
    
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        details: error.response?.data
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
});

// Historical data endpoint - FIXED
app.post('/api/solar/historical-data', async (req, res) => {
  try {
    const { 
      token, 
      ps_key_list, 
      data_point, 
      start_time, 
      end_time, 
      data_type = "2",
      query_type = "1",
      order = "0"
    } = req.body;
    
    // Validate required fields
    if (!token || !ps_key_list || !data_point || !start_time || !end_time) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['token', 'ps_key_list', 'data_point', 'start_time', 'end_time']
      });
    }

    console.log('Fetching historical data for:', {
      ps_key_list,
      data_point,
      start_time,
      end_time
    });

    const response = await axios.post(
      'https://gateway.isolarcloud.com.hk/openapi/getDevicePointsDayMonthYearDataList',
      {
        appkey: SOLAR_CONFIG.appkey,
        data_point: data_point,
        data_type: data_type,
        end_time: end_time,
        lang: '_en_US',
        order: order,
        ps_key_list: Array.isArray(ps_key_list) ? ps_key_list : [ps_key_list],
        query_type: query_type,
        start_time: start_time,
        sys_code: 207,
        token: token
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': SOLAR_CONFIG.secretKey,
          'sys_code': '901',
          'token': token
        }
      }
    );

    console.log('Historical data fetched successfully');
    res.json(response.data);
    
  } catch (error) {
    console.error('Historical data error:', error.message);
    
    if (axios.isAxiosError(error)) {
      console.error('Error response:', error.response?.data);
      res.status(error.response?.status || 500).json({
        error: error.message,
        details: error.response?.data
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
});


app.listen(5000, () => console.log("Server running on port 5000"));
