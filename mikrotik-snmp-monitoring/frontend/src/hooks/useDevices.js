import { useState, useEffect, useCallback, useRef } from 'react';
import deviceService from '../services/deviceService';

const useDevices = (params = {}) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchDevices = useCallback(async (newParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Gunakan limit 9999 untuk mendapatkan semua devices sekaligus
      const mergedParams = { ...paramsRef.current, ...newParams, limit: 9999 };
      const data = await deviceService.getDevices(mergedParams);
      
      console.log('Fetched devices:', data); // Untuk debug jumlah devices
      
      // Service now returns data directly, not wrapped in success
      setDevices(data.devices || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 9999,
        total: data.devices?.length || 0,
        pages: 1,
      });
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError(err.response?.data?.message || 'Failed to fetch devices');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array to prevent infinite loop

  const refetch = (newParams = {}) => {
    fetchDevices(newParams);
  };

  // Delete device function
  const deleteDevice = async (deviceId) => {
    try {
      await deviceService.deleteDevice(deviceId);
      // Refresh devices list after deletion
      fetchDevices();
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.message || 'Failed to delete device' 
      };
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return {
    devices,
    loading,
    error,
    pagination,
    refetch,
    deleteDevice,
  };
};

export default useDevices;
