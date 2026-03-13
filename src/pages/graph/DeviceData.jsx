import React, { useState, useEffect } from 'react';
import { useDeviceContext } from './DeviceContext'; // Add this import

const DeviceData = () => {
  // Get context functions
  const { setDeviceData, setPsKey } = useDeviceContext(); // Add this line

  // States for login
  const [loginData, setLoginData] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // States for device data
  const [deviceDataLocal, setDeviceDataLocal] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceError, setDeviceError] = useState(null);

  // Form states
  const [serialNumber, setSerialNumber] = useState('I2460100212');   // device S/N number (inverter serial number)
  const [autoFetch, setAutoFetch] = useState(true);

  // Perform login on component mount
  useEffect(() => {
    if (autoFetch) {
      handleLogin();
    }
  }, [autoFetch]);

  // Handle login
  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    setLoginData(null);
    setDeviceDataLocal(null); // Clear device data on new login

    try {
      const response = await fetch('http://localhost:3000/api/solar/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_account: 'sahoo@rbpindia.com',
          user_password: 'rbpindia@2025'
        })
      });

      const data = await response.json();

      if (!response.ok || data.result_code !== "1") {
        throw new Error(data.result_msg || 'Login failed');
      }

      setLoginData(data);
      console.log('Login successful, token:', data.result_data?.token?.substring(0, 30) + '...');

      // Automatically fetch device data if login successful
      if (data.result_data?.token && serialNumber) {
        setTimeout(() => handleFetchDeviceData(data.result_data.token), 500);
      }
    } catch (err) {
      setLoginError(err.message);
      console.error('Login error:', err);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle device data fetch
  const handleFetchDeviceData = async (token) => {
    const actualToken = token || (loginData?.result_data?.token);

    if (!actualToken) {
      setDeviceError('No token available. Please login first.');
      return;
    }

    if (!serialNumber.trim()) {
      setDeviceError('Please enter a serial number');
      return;
    }

    setDeviceLoading(true);
    setDeviceError(null);
    setDeviceDataLocal(null);

    try {
      const response = await fetch('http://localhost:3000/api/solar/inverter-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: actualToken,
          sn_list: [serialNumber.trim()]
        })
      });

      const data = await response.json();

      if (!response.ok || data.result_code !== "1") {
        throw new Error(data.result_msg || 'Failed to fetch device data');
      }

      setDeviceDataLocal(data);
      console.log('Device data fetched successfully');

      // Share device data with context
      if (data.result_data?.device_point_list?.[0]?.device_point) {
        const devicePoint = data.result_data.device_point_list[0].device_point;
        setDeviceData(devicePoint); // Share device data
        setPsKey(devicePoint.ps_key); // Share ps_key
        console.log('Shared ps_key:', devicePoint.ps_key);
      }

    } catch (err) {
      setDeviceError(err.message);
      console.error('Device data error:', err);
    } finally {
      setDeviceLoading(false);
    }
  };

  // Format the device data for display
  const formatDeviceData = (device) => {
    // Map parameter codes to human-readable names
    const paramNames = {
      p1: 'Total Power (W)',
      p2: 'Total Energy (Wh)',
      p4: 'PV1 Voltage (V)',
      p5: 'PV2 Voltage (V)',
      p6: 'PV1 Current (A)',
      p14: 'Grid Voltage (V)',
      p18: 'Grid Frequency (Hz)',
      p21: 'Output Current (A)',
      p24: 'Output Power (W)',
      p25: 'Temperature (°C)',
      p26: 'Operation Hours (h)',
      p27: 'Power Factor',
      p43: 'PV1 Power (W)',
      p87: 'Today Energy (Wh)',
      p88: 'Total Energy (Wh)'
    };

    return Object.entries(device)
      .filter(([key, value]) => key.startsWith('p') && value !== null && paramNames[key])
      .map(([key, value]) => ({
        name: paramNames[key] || key,
        value: value,
        unit: getUnit(key)
      }));
  };

  const getUnit = (param) => {
    const units = {
      p1: 'W', p2: 'Wh', p4: 'V', p5: 'V', p6: 'A',
      p14: 'V', p18: 'Hz', p21: 'A', p24: 'W',
      p25: '°C', p26: 'h', p27: '', p43: 'W',
      p87: 'Wh', p88: 'Wh'
    };
    return units[param] || '';
  };

  return (
    <div>
      <h1>Solar Inverter Monitoring</h1>

      {/* Login Section */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h2>Login Status</h2>
        <div style={{ marginBottom: '10px' }}>
          <label>
            <input
              type="checkbox"
              checked={autoFetch}
              onChange={(e) => setAutoFetch(e.target.checked)}
            />
            Auto-login on load
          </label>
        </div>

        <button
          onClick={handleLogin}
          disabled={loginLoading}
          style={{ marginRight: '10px' }}
        >
          {loginLoading ? 'Logging in...' : 'Login'}
        </button>

        {loginError && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            <strong>Login Error:</strong> {loginError}
          </div>
        )}

        {loginData && (
          <div style={{ marginTop: '10px' }}>
            <p><strong>Status:</strong> {loginData.result_msg}</p>
            <p><strong>User:</strong> {loginData.result_data?.user_name}</p>
            <p>
              <strong>Token:</strong>
              {loginData.result_data?.token
                ? `${loginData.result_data.token.substring(0, 30)}...`
                : 'No token'}
            </p>
          </div>
        )}
      </div>

      {/* Device Data Section */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h2>Device Data</h2>

        <div style={{ marginBottom: '10px' }}>
          <label>
            Serial Number:
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
              placeholder="Enter device serial number"
            />
          </label>
        </div>

        <button
          onClick={() => handleFetchDeviceData()}
          disabled={deviceLoading || !loginData?.result_data?.token}
          style={{ marginRight: '10px' }}
        >
          {deviceLoading ? 'Fetching...' : 'Fetch Device Data'}
        </button>

        {deviceError && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            <strong>Device Error:</strong> {deviceError}
          </div>
        )}
      </div>

      {/* Display Device Data */}
      {deviceDataLocal && deviceDataLocal.result_data?.device_point_list?.length > 0 && (
        <div style={{ padding: '10px', border: '1px solid #ccc' }}>
          <h2>Inverter Data</h2>
          <p><strong>Request ID:</strong> {deviceDataLocal.req_serial_num}</p>
          <p><strong>Status:</strong> {deviceDataLocal.result_msg}</p>

          {deviceDataLocal.result_data.device_point_list.map((item, index) => {
            const device = item.device_point;
            const formattedData = formatDeviceData(device);

            return (
              <div key={device.ps_key || index} style={{ marginTop: '20px' }}>
                <h3>Device: {device.device_name} ({device.device_sn})</h3>
                <p><strong>Device Time:</strong> {device.device_time}</p>
                <p><strong>Status:</strong> {device.dev_status === 1 ? 'Normal' : 'Fault'}</p>
                <p><strong>Communication SN:</strong> {device.communication_dev_sn}</p>
                <p><strong>PS Key:</strong> {device.ps_key}</p> {/* Added this line */}

                <h4>Real-time Parameters:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {formattedData.map((item, idx) => (
                    <div key={idx} style={{ padding: '5px', border: '1px solid #eee' }}>
                      <strong>{item.name}</strong><br />
                      {item.value} {item.unit}
                    </div>
                  ))}
                </div>

                {/* Raw Data View */}
                <details style={{ marginTop: '20px' }}>
                  <summary>View Raw Device Data</summary>
                  <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '10px',
                    overflow: 'auto',
                    maxHeight: '300px',
                    color: 'black'
                  }}>
                    {JSON.stringify(device, null, 2)}
                  </pre>
                </details>
              </div>
            );
          })}

          {/* Fail List */}
          {deviceDataLocal.result_data.fail_sn_list.length > 0 && (
            <div style={{ color: 'orange', marginTop: '10px' }}>
              <strong>Failed SNs:</strong> {deviceDataLocal.result_data.fail_sn_list.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Raw Response View */}
      {deviceDataLocal && (
        <details style={{ marginTop: '20px' }}>
          <summary>View Complete Raw Response</summary>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '10px',
            overflow: 'auto',
            maxHeight: '400px',
            color: 'black'
          }}>
            {JSON.stringify(deviceDataLocal, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default DeviceData;