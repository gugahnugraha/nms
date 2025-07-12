import api from './api';

const monitoringService = {
  // Get dashboard data
  getDashboard: async () => {
    const response = await api.get('/monitoring/dashboard');
    return response.data;
  },

  // Test device connectivity
  testDevice: async (deviceId) => {
    const response = await api.post(`/monitoring/test/${deviceId}`);
    return response.data;
  },

  // Get device monitoring data
  getDeviceMonitoring: async (deviceId) => {
    const response = await api.get(`/monitoring/device/${deviceId}`);
    return response.data;
  },

  // Get monitoring logs
  getMonitoringLogs: async (params = {}) => {
    const response = await api.get('/monitoring/logs', { params });
    return response.data;
  },
  // Get monitoring reports
  getReports: async (params = {}) => {
    const response = await api.get('/monitoring/reports', { params });
    return response.data;
  },

  // Get device metrics for charts
  getDeviceMetrics: async (deviceId, timeRange = '24h') => {
    const response = await api.get(`/monitoring/device/${deviceId}/metrics`, {
      params: { timeRange }
    });
    return response.data;
  },

  // Get real-time device metrics
  getRealTimeMetrics: async (deviceId) => {
    const response = await api.get(`/monitoring/device/${deviceId}/real-time-metrics`);
    return response.data;
  },

  // Get device logs
  getDeviceLogs: async (deviceId, params = {}) => {
    const response = await api.get(`/monitoring/device/${deviceId}/logs`, { params });
    return response.data;
  }
};

export default monitoringService;
