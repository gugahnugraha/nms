import api from './api';

const deviceService = {  // Get all devices
  getDevices: async (params = {}) => {
    const response = await api.get('/devices', { params });
    return response.data.data; // Extract data from nested structure
  },
  // Get single device
  getDevice: async (id) => {
    const response = await api.get(`/devices/${id}`);
    return response.data.data.device; // Extract device from nested structure
  },
  // Create new device
  createDevice: async (deviceData) => {
    const response = await api.post('/devices', deviceData);
    return response.data.data.device; // Extract device from nested structure
  },

  // Update device
  updateDevice: async (id, deviceData) => {
    const response = await api.put(`/devices/${id}`, deviceData);
    return response.data.data.device; // Extract device from nested structure
  },

  // Delete device
  deleteDevice: async (id) => {
    const response = await api.delete(`/devices/${id}`);
    return response.data;
  },
  // Get device statistics
  getDeviceStats: async (id) => {
    const response = await api.get(`/devices/${id}/stats`);
    return response.data;
  },
  // Test device connection
  testConnection: async (deviceData) => {
    const response = await api.post('/devices/test-connection', deviceData);
    return response.data; // Keep full response for test results
  },

  // Ping a device
  pingDevice: async (id) => {
    const response = await api.post(`/devices/${id}/ping`);
    return response.data;
  }
};

export default deviceService;
