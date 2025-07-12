import { useState, useEffect } from 'react';
import monitoringService from '../services/monitoringService';
import snmpExporterService from '../services/snmpExporterService';

const useMonitoring = (autoRefresh = false, refreshInterval = 30000) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [realTimeData, setRealTimeData] = useState({});

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await monitoringService.getDashboard();
      
      if (response.success) {
        // Get the basic dashboard data
        const basicData = response.data;
        
        // If we have devices with active collectors, fetch their real-time metrics
        if (basicData.devices && basicData.devices.length > 0) {
          const activeDevices = basicData.devices.filter(device => device.status === 'online' && device.autoCollect);
          
          // Fetch real-time data for active devices
          if (activeDevices.length > 0) {
            try {
              const realtimePromises = activeDevices.map(device => 
                snmpExporterService.getLatestMetrics(device._id)
                  .then(result => ({ deviceId: device._id, data: result.data }))
                  .catch(() => ({ deviceId: device._id, data: null }))
              );
              
              const realtimeResults = await Promise.all(realtimePromises);
              
              // Create a map of device IDs to their real-time data
              const newRealTimeData = {};
              realtimeResults.forEach(result => {
                if (result.data) {
                  newRealTimeData[result.deviceId] = result.data;
                }
              });
              
              setRealTimeData(newRealTimeData);
              
              // Enhance device data with real-time metrics
              basicData.devices = basicData.devices.map(device => {
                const deviceRealTimeData = newRealTimeData[device._id];
                if (deviceRealTimeData) {
                  return {
                    ...device,
                    realTimeMetrics: deviceRealTimeData,
                    cpuUsage: deviceRealTimeData.summary?.cpuUsage,
                    memoryUsage: deviceRealTimeData.summary?.memoryUsage,
                    temperature: deviceRealTimeData.summary?.temperature,
                    uptime: deviceRealTimeData.summary?.uptime
                  };
                }
                return device;
              });
            } catch (error) {
              console.error('Error fetching real-time data:', error);
            }
          }
        }
        
        setDashboardData(basicData);
        setLastUpdated(new Date());
      } else {
        setError(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const testDevice = async (deviceId) => {
    try {
      const response = await monitoringService.testDevice(deviceId);
      return response;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to test device');
    }
  };

  const getDeviceMonitoring = async (deviceId) => {
    try {
      const response = await monitoringService.getDeviceMonitoring(deviceId);
      return response;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to get device monitoring');
    }
  };

  const refetch = () => {
    fetchDashboard();
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Helper method to get real-time metrics for a specific device
  const getDeviceRealTimeMetrics = async (deviceId) => {
    try {
      const response = await snmpExporterService.getLatestMetrics(deviceId);
      if (response.success && response.data) {
        // Update real-time data state for this device
        setRealTimeData(prev => ({
          ...prev,
          [deviceId]: response.data
        }));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get real-time metrics');
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to get real-time metrics');
    }
  };

  return {
    dashboardData,
    loading,
    error,
    lastUpdated,
    refetch,
    testDevice,
    getDeviceMonitoring,
    realTimeData,
    getDeviceRealTimeMetrics
  };
};

export default useMonitoring;
