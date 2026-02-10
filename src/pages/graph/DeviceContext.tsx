import React, { createContext, useState, useContext, useEffect } from 'react';

const DeviceContext = createContext();

export const useDeviceContext = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDeviceContext must be used within DeviceProvider');
  }
  return context;
};

export const DeviceProvider = ({ children }) => {
  const [psKey, setPsKey] = useState(() => {
    // Initialize from localStorage if available
    const savedPsKey = localStorage.getItem('psKey');
    return savedPsKey || '';
  });

  const [selectedDevice, setSelectedDevice] = useState(() => {
    const savedDevice = localStorage.getItem('selectedDevice');
    return savedDevice ? JSON.parse(savedDevice) : null;
  });

  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('solarToken');
    return savedToken || '';
  });

  // Save psKey to localStorage when it changes
  useEffect(() => {
    if (psKey) {
      localStorage.setItem('psKey', psKey);
    }
  }, [psKey]);

  // Save selectedDevice to localStorage when it changes
  useEffect(() => {
    if (selectedDevice) {
      localStorage.setItem('selectedDevice', JSON.stringify(selectedDevice));
    }
  }, [selectedDevice]);

  // Save token to localStorage when it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('solarToken', token);
    } else {
      localStorage.removeItem('solarToken');
    }
  }, [token]);

  // Clear all device data
  const clearDeviceData = () => {
    setPsKey('');
    setSelectedDevice(null);
    localStorage.removeItem('psKey');
    localStorage.removeItem('selectedDevice');
  };

  // Update device data with PS Key
  const updateDeviceData = (devicePoint) => {
    if (devicePoint) {
      const newPsKey = devicePoint.ps_key;
      setPsKey(newPsKey);
      setSelectedDevice(devicePoint);
    }
  };

  // Clear token
  const clearToken = () => {
    setToken('');
    localStorage.removeItem('solarToken');
  };

  const value = {
    psKey,
    setPsKey,
    selectedDevice,
    setSelectedDevice,
    token,
    setToken,
    clearDeviceData,
    clearToken,
    updateDeviceData
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
};