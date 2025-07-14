import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook for fetching device metrics with retry logic and error handling
 * @param {string} deviceId - The device ID to fetch metrics for
 * @param {number} refreshInterval - Refresh interval in milliseconds (default: 10000)
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {object} - { data, loading, error, refetch, retryCount }
 */
export const useDeviceMetrics = (deviceId, refreshInterval = 10000, maxRetries = 3) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const logError = useCallback((error, context = {}) => {
    console.error('Device Metrics Error:', {
      deviceId,
      error: error.message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ...context
    });
  }, [deviceId]);

  const fetchMetrics = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
        setError(null);
      }

      const response = await axios.get(`/api/monitoring/device/${deviceId}/metrics`, {
        params: { timeRange: '24h' },
        timeout: 30000, // 30 second timeout
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      setData(response.data);
      setRetryCount(0); // Reset on success
      
      return response.data;
    } catch (err) {
      logError(err, { retryCount, isRetry });
      
      if (retryCount < maxRetries && !isRetry) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = 2000 * Math.pow(2, retryCount);
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchMetrics(true);
        }, delay);
      } else {
        const errorMessage = err.response?.status === 404 
          ? 'Device not found or metrics endpoint unavailable'
          : err.response?.status === 403
          ? 'Access denied to device metrics'
          : err.response?.status >= 500
          ? 'Server error while fetching metrics'
          : err.code === 'ECONNABORTED'
          ? 'Request timeout - device may be unreachable'
          : 'Failed to load device metrics';
          
        setError(errorMessage);
      }
      
      throw err;
    } finally {
      if (!isRetry) {
        setLoading(false);
      }
    }
  }, [deviceId, retryCount, maxRetries, logError]);

  const refetch = useCallback(() => {
    setRetryCount(0);
    return fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!deviceId) {
      setError('Device ID is required');
      setLoading(false);
      return;
    }

    fetchMetrics();
    
    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [deviceId, refreshInterval, fetchMetrics]);

  return {
    data,
    loading,
    error,
    refetch,
    retryCount,
    isRetrying: retryCount > 0 && retryCount < maxRetries
  };
};

/**
 * Hook for processing device metrics data
 * @param {object} rawData - Raw metrics data from API
 * @returns {object} - Processed and structured metrics data
 */
export const useProcessedMetrics = (rawData) => {
  return {
    system: rawData?.metrics?.system || {},
    interfaces: rawData?.metrics?.interfaces || [],
    storage: rawData?.metrics?.storage || [],
    hasData: !!(rawData?.metrics && Object.keys(rawData.metrics).length > 0),
    timestamp: rawData?.timestamp || new Date().toISOString()
  };
};

/**
 * Hook for device status monitoring
 * @param {string} deviceId - Device ID
 * @param {number} refreshInterval - Refresh interval (default: 5000ms)
 * @returns {object} - Device status data
 */
export const useDeviceStatus = (deviceId, refreshInterval = 5000) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!deviceId) return;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/snmp-exporter/status/${deviceId}`);
        setStatus(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch device status');
        console.error('Device Status Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);
    
    return () => clearInterval(interval);
  }, [deviceId, refreshInterval]);

  return { status, loading, error };
};

export default useDeviceMetrics;