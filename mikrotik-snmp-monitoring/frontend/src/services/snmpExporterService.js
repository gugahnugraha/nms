
import api from './api';

const snmpExporterService = {
  // Start SNMP collector for a device
  startCollector: async (deviceId, options = {}) => {
    const response = await api.post(`/snmp-exporter/start/${deviceId}`, options);
    return response.data;
  },

  // Stop SNMP collector for a device
  stopCollector: async (deviceId) => {
    const response = await api.post(`/snmp-exporter/stop/${deviceId}`);
    return response.data;
  },

  // Get collector status for a device
  getCollectorStatus: async (deviceId) => {
    const response = await api.get(`/snmp-exporter/status/${deviceId}`);
    return response.data;
  },

  // Get latest metrics for a device
  getLatestMetrics: async (deviceId) => {
    const response = await api.get(`/snmp-exporter/metrics/${deviceId}`);
    // Normalisasi key agar frontend konsisten dan fallback ke 0 jika null/undefined
    const data = response.data?.data || response.data;
    const cpuUsage = data.cpuUsage ?? data.cpu ?? data.cpu_load ?? data.cpu_util ?? 0;
    const memoryUsage = data.memoryUsage ?? data.memory ?? data.mem ?? data.memory_util ?? 0;
    const responseTime = data.responseTime ?? data.latency ?? data.ping ?? 0;
    return {
      success: response.data?.success ?? true,
      data: {
        cpuUsage,
        memoryUsage,
        responseTime,
        ...data
      }
    };
  },

  // Get list of active collectors (admin only)
  getActiveCollectors: async () => {
    const response = await api.get('/snmp-exporter/active');
    return response.data;
  },

  // Get interface metrics for a device
  getInterfaceMetrics: async (deviceId) => {
    const response = await api.get(`/snmp-exporter/metrics/${deviceId}`);
    // Asumsikan response.data.data.interfaces berisi array interface metrics
    return response.data.data?.interfaces || [];
  }
};

export default snmpExporterService;
