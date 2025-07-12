import { useState, useEffect } from 'react';
import monitoringService from '../services/monitoringService';

const useMonitoring = (autoRefresh = false, refreshInterval = 30000) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await monitoringService.getDashboard();
      
      if (response.success) {
        setDashboardData(response.data);
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

  return {
    dashboardData,
    loading,
    error,
    lastUpdated,
    refetch,
    testDevice,
    getDeviceMonitoring,
  };
};

export default useMonitoring;
