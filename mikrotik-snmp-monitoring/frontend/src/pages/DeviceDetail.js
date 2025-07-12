/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Edit2, Trash2, ArrowLeft, Activity, Clock, MapPin, 
  Settings, RefreshCw, AlertCircle, TrendingUp, Network,
  Play, Square, XCircle, Database, HardDrive, Info
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Legend
} from 'recharts';

import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmModal from '../components/common/ConfirmModal';
import DeviceForm from '../components/devices/DeviceForm';
import deviceService from '../services/deviceService';
import monitoringService from '../services/monitoringService';
import snmpExporterService from '../services/snmpExporterService';

const DeviceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Device data states
  const [device, setDevice] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [collectorStatus, setCollectorStatus] = useState(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [collectorLoading, setCollectorLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRealTimeMetrics, setShowRealTimeMetrics] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState('');
  const [showPingResultModal, setShowPingResultModal] = useState(false);
  
  // New states for interface details
  const [selectedInterface, setSelectedInterface] = useState(null);
  const [showInterfaceDetails, setShowInterfaceDetails] = useState(false);
  const [interfaceTrafficHistory, setInterfaceTrafficHistory] = useState([]);
  const [trafficLoading, setTrafficLoading] = useState(false);

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }  ];

  const fetchDeviceData = async () => {
    try {
      setLoading(true);
      const deviceData = await deviceService.getDevice(id);
      setDevice(deviceData);
      setError(null);
    } catch (error) {
      setError(error.message);
      toast.error('Failed to load device data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch collector status from SNMP Exporter
  const fetchCollectorStatus = async () => {
    setCollectorLoading(true);
    try {
      const response = await snmpExporterService.getCollectorStatus(id);
      if (response.success) {
        setCollectorStatus(response.data);
      } else {
        setCollectorStatus(null);
      }
    } catch (err) {
      setCollectorStatus(null);
    } finally {
      setCollectorLoading(false);
    }
  };

  // Start SNMP collector for this device
  const handleStartCollector = async () => {
    setCollectorLoading(true);
    try {
      const response = await snmpExporterService.startCollector(id);
      if (response.success) {
        await fetchCollectorStatus();
      }
    } catch (err) {
      // handle error
    } finally {
      setCollectorLoading(false);
    }
  };

  // Stop SNMP collector for this device
  const handleStopCollector = async () => {
    setCollectorLoading(true);
    try {
      const response = await snmpExporterService.stopCollector(id);
      if (response.success) {
        await fetchCollectorStatus();
      }
    } catch (err) {
      // handle error
    } finally {
      setCollectorLoading(false);
    }
  };

  // Fetch latest metrics from SNMP Exporter
  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const response = await snmpExporterService.getLatestMetrics(id);
      if (response.success && response.data) {
        setMetrics([response.data]);
      } else {
        setMetrics([]);
      }
    } catch (err) {
      setMetrics([]);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Optionally, fetch real-time metrics if needed
  const fetchRealTimeMetrics = async () => {
    setMetricsLoading(true);
    try {
      // You can use monitoringService.getRealTimeMetrics(id) if needed
      // Or use snmpExporterService.getLatestMetrics(id) for latest
      const response = await snmpExporterService.getLatestMetrics(id);
      if (response.success && response.data) {
        setRealTimeMetrics(response.data);
      } else {
        setRealTimeMetrics(null);
      }
    } catch (err) {
      setRealTimeMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  };
  
  const fetchLogs = async () => {
    try {
      const response = await monitoringService.getDeviceLogs(id, { limit: 20 });
      setRecentLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  // Fetch interface performance metrics for a device
  const fetchInterfaceMetrics = async () => {
    try {
      const interfaces = await snmpExporterService.getInterfaceMetrics(id);
      setInterfaceTrafficHistory(interfaces);
    } catch (err) {
      setInterfaceTrafficHistory([]);
    }
  };

  useEffect(() => {
    fetchDeviceData();
  }, [id]); // Only depend on id, not fetchDeviceData

  useEffect(() => {
    if (device) {
      const loadMetrics = async () => {
        await fetchMetrics();
        
        // If no metrics were loaded, try real-time metrics
        if (!metrics || metrics.length === 0) {
          await fetchRealTimeMetrics();
        }

        // Get collector status
        fetchCollectorStatus();
      };
      
      loadMetrics();
    }
  }, [device, timeRange]); // Remove fetchMetrics dependency

  // Start with fetching logs
  useEffect(() => {
    fetchLogs();
  }, [id]);

  // Re-fetch logs every minute
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [id]);

  // Fetch collector status
  useEffect(() => {
    fetchCollectorStatus();
  }, [id, user]); // Re-fetch if user changes

  // Fetch metrics and real-time data on demand
  useEffect(() => {
    if (device) {
      const fetchData = async () => {
        await fetchMetrics();
        await fetchRealTimeMetrics();
      };

      fetchData();
    }
  }, [device, timeRange]); // Re-fetch if device or time range changes

  // Ping device
  const handlePing = async () => {
    setIsPinging(true);
    setPingResult('');
    try {
      const result = await deviceService.pingDevice(id);
      setPingResult(result.raw);
      toast.success(result.message);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ping request failed';
      const rawError = error.response?.data?.raw || 'No raw output available.';
      toast.error(errorMessage);
      setPingResult(rawError);
    } finally {
      setIsPinging(false);
      setShowPingResultModal(true);
    }
  };

  const handleDelete = async () => {
    try {
      await deviceService.deleteDevice(id);
      toast.success('Device deleted successfully');
      navigate('/devices');
    } catch (error) {
      toast.error('Failed to delete device');
    }
  };

  const formatMetricsData = (data) => {
    if (!Array.isArray(data)) {
      console.warn('formatMetricsData received non-array data:', data);
      return [];
    }
    
    return data.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp).toLocaleTimeString(),
      cpuUsage: item.cpuUsage !== undefined && item.cpuUsage !== null ? parseFloat(item.cpuUsage) : 0,
      memoryUsage: item.memoryUsage !== undefined && item.memoryUsage !== null ? parseFloat(item.memoryUsage) : 0,
      responseTime: item.responseTime !== undefined && item.responseTime !== null ? parseFloat(item.responseTime) : 0,
      diskUsage: item.diskUsage !== undefined && item.diskUsage !== null ? parseFloat(item.diskUsage) : 0
    }));
  };
  
  const getUptimePercentage = () => {
    if (!Array.isArray(recentLogs) || recentLogs.length === 0) return 0;
    
    const onlineLogs = recentLogs.filter(log => log.status === 'online').length;
    return Math.round((onlineLogs / recentLogs.length) * 100);
  };
  
  const getLastMetric = (metricName) => {
    if (!Array.isArray(metrics) || metrics.length === 0) {
      console.log(`No metrics data available for ${metricName}`);
      return 'N/A';
    }
    
    const lastMetric = metrics[metrics.length - 1];
    if (!lastMetric) {
      console.log(`Last metric is undefined for ${metricName}`);
      return 'N/A';
    }
    
    const value = lastMetric[metricName];
    console.log(`Last ${metricName} value:`, value);
    
    if (value === null || value === undefined) {
      console.log(`${metricName} is null or undefined`);
      // If we're in the middle of refreshing, show loading instead of N/A
      return metricsLoading ? '...' : 'N/A';
    }
    
    // For numeric values, parse and format
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      console.log(`${metricName} is not a number: ${value}`);
      return 'N/A';
    }
    
    return numValue.toFixed(1);
  };

  // Generate mock interface traffic history
  const generateMockTrafficHistory = (iface) => {
    if (!iface) return [];
    
    const now = new Date();
    const data = [];
    
    // Generate data for the last 24 hours (24 data points)
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now);
      time.setHours(time.getHours() - i);
      
      // Base values from current metrics with some randomness
      const baseInTraffic = iface.ifInOctets ? (iface.ifInOctets / 1024) : 100;
      const baseOutTraffic = iface.ifOutOctets ? (iface.ifOutOctets / 1024) : 50;
      
      // Add randomness for variation (between 0.5x and 1.5x of base value)
      const randomFactorIn = 0.5 + Math.random();
      const randomFactorOut = 0.5 + Math.random();
      
      data.push({
        time: time.toLocaleTimeString(),
        inTraffic: Math.round(baseInTraffic * randomFactorIn * 100) / 100,
        outTraffic: Math.round(baseOutTraffic * randomFactorOut * 100) / 100,
      });
    }
    
    return data;
  };
  
  // When an interface is selected, generate traffic history data
  useEffect(() => {
    if (selectedInterface) {
      setTrafficLoading(true);
      // In a real application, this would be an API call to get historical data
      // For now, we'll generate mock data
      const mockData = generateMockTrafficHistory(selectedInterface);
      setInterfaceTrafficHistory(mockData);
      setTrafficLoading(false);
    }
  }, [selectedInterface]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5 mr-2" />
          <div>
            <p className="font-medium">Error loading device</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/devices" className="btn btn-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Devices
          </Link>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Device not found</p>
          <Link to="/devices" className="btn btn-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Devices
          </Link>
        </div>
      </div>
    );
  }

  const chartData = formatMetricsData(metrics);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/devices" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="page-title">{device.name}</h1>
            <p className="page-subtitle">Device Details & Monitoring</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input text-sm"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                className="btn btn-secondary"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-danger"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Device Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Info Card */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Device Information</h3>
                <StatusBadge status={device.status} />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <Settings className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">IP Address</p>
                    <p className="font-medium">{device.ipAddress}</p>
                  </div>
                </div>

                {device.location && (
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{device.location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Last Seen</p>
                    <p className="font-medium">
                      {device.lastSeen 
                        ? new Date(device.lastSeen).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Uptime (24h)</p>
                    <p className="font-medium">{getUptimePercentage()}%</p>
                  </div>
                </div>

                {device.description && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Description</p>
                    <p className="text-sm">{device.description}</p>
                  </div>
                )}
              </div>

              {user?.role === 'admin' && (
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
                  <button
                    onClick={handlePing}
                    disabled={isPinging}
                    className="btn btn-secondary w-full"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    {isPinging ? 'Pinging...' : 'Ping Device'}
                  </button>
                  
                  {collectorStatus && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">SNMP Collector</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          collectorStatus.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {collectorStatus.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <button
                        onClick={collectorStatus.isActive ? handleStopCollector : handleStartCollector}
                        disabled={collectorLoading}
                        className={`btn w-full ${collectorStatus.isActive ? 'btn-danger' : 'btn-primary'}`}
                      >
                        {collectorLoading ? (
                          <LoadingSpinner size="small" className="mr-2" />
                        ) : collectorStatus.isActive ? (
                          <Square className="w-4 h-4 mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        {collectorStatus.isActive ? 'Stop Collector' : 'Start Collector'}
                      </button>
                      
                      <button
                        onClick={handleGetDetailedMetrics}
                        disabled={collectorLoading}
                        className="btn btn-secondary w-full"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        Get Detailed Metrics
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">CPU Usage</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {getLastMetric('cpuUsage')}%
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Memory Usage</p>
                    <p className="text-2xl font-bold text-green-600">
                      {getLastMetric('memoryUsage')}%
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Response Time</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {getLastMetric('responseTime')}ms
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU & Memory Usage Chart */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Usage</h3>
            {metricsLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="cpuUsage" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="CPU Usage (%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="memoryUsage" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Memory Usage (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data available for selected time range
              </div>
            )}
          </div>
        </div>

        {/* Disk Usage Chart */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Disk Usage</h3>
            {metricsLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : Array.isArray(metrics) && metrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="diskUsage" 
                    stroke="#F59E0B" 
                    fill="#F59E0B" 
                    strokeWidth={2}
                    name="Disk Usage (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data available for selected time range
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Network Interfaces Section */}
      <div className="card shadow-lg">
        <div className="card-header bg-gradient-to-r from-indigo-100 to-blue-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Network className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Network Interfaces</h3>
            </div>
            
            {realTimeMetrics && realTimeMetrics.metrics && realTimeMetrics.metrics.interfaces && realTimeMetrics.metrics.interfaces.length > 0 && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{realTimeMetrics.metrics.interfaces.length}</span> interfaces found
                </div>
                <select 
                  className="select select-sm select-bordered"
                  onChange={(e) => {
                    const selectedIndex = parseInt(e.target.value);
                    const selected = realTimeMetrics.metrics.interfaces.find(i => i.index === selectedIndex);
                    setSelectedInterface(selected || null);
                    setShowInterfaceDetails(!!selected);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select interface</option>
                  {realTimeMetrics.metrics.interfaces.map(iface => (
                    <option key={iface.index} value={iface.index}>
                      {iface.ifDescr || `Interface ${iface.index}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="card-body">
          {metricsLoading || !realTimeMetrics ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : realTimeMetrics && realTimeMetrics.metrics && realTimeMetrics.metrics.interfaces && realTimeMetrics.metrics.interfaces.length > 0 ? (
            <div className="space-y-6">
              {/* Interface Traffic Overview */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">Traffic Overview</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={realTimeMetrics.metrics.interfaces.map(iface => ({
                      name: iface.ifDescr || `Interface ${iface.index}`,
                      inTraffic: iface.ifInOctets ? Number((iface.ifInOctets / 1024).toFixed(2)) : 0,
                      outTraffic: iface.ifOutOctets ? Number((iface.ifOutOctets / 1024).toFixed(2)) : 0,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      interval={0}
                      tick={{fontSize: 12}}
                    />
                    <YAxis label={{ value: 'Traffic (KB)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${value} KB`, '']} />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="inTraffic" name="Incoming Traffic" fill="#4F46E5" />
                    <Bar dataKey="outTraffic" name="Outgoing Traffic" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Interface Status */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">Interface Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {realTimeMetrics.metrics.interfaces.map((iface, idx) => {
                    // Calculate percentage of bandwidth used (if speed is available)
                    const bandwidthPercentIn = iface.ifSpeed && iface.ifInOctets 
                      ? (iface.ifInOctets * 8 / (iface.ifSpeed / 100)) 
                      : null;
                    const bandwidthPercentOut = iface.ifSpeed && iface.ifOutOctets 
                      ? (iface.ifOutOctets * 8 / (iface.ifSpeed / 100)) 
                      : null;
                    
                    const isUp = iface.ifOperStatus === 1;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border ${isUp ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'} hover:shadow-md transition-all cursor-pointer`}
                        onClick={() => {
                          setSelectedInterface(iface);
                          setShowInterfaceDetails(true);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${isUp ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            <h4 className="font-medium text-gray-900 truncate" title={iface.ifDescr || `Interface ${iface.index}`}>
                              {iface.ifDescr || `Interface ${iface.index}`}
                            </h4>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${isUp ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                            {isUp ? 'Up' : 'Down'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Type:</span>
                            <span className="font-medium">{iface.ifType || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Speed:</span>
                            <span className="font-medium">
                              {iface.ifSpeed ? `${(iface.ifSpeed / 1000000).toFixed(0)} Mbps` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">In:</span>
                            <span className="font-medium">
                              {iface.ifInOctets ? `${(iface.ifInOctets / 1024).toFixed(2)} KB` : 'N/A'}
                              {bandwidthPercentIn ? ` (${bandwidthPercentIn.toFixed(2)}%)` : ''}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Out:</span>
                            <span className="font-medium">
                              {iface.ifOutOctets ? `${(iface.ifOutOctets / 1024).toFixed(2)} KB` : 'N/A'}
                              {bandwidthPercentOut ? ` (${bandwidthPercentOut.toFixed(2)}%)` : ''}
                            </span>
                          </div>
                        </div>
                        
                        {(iface.ifInErrors > 0 || iface.ifOutErrors > 0) && (
                          <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
                            <span className="font-medium">Errors: </span>
                            In: {iface.ifInErrors || 0}, Out: {iface.ifOutErrors || 0}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Network interface data is not available. Click "Get Detailed Metrics" in the device information panel to load interface statistics.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Resources Section */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <HardDrive className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">System Resources</h3>
          </div>
          
          {metricsLoading || !realTimeMetrics ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : realTimeMetrics && realTimeMetrics.metrics && realTimeMetrics.metrics.storage && realTimeMetrics.metrics.storage.length > 0 ? (
            <div className="space-y-6">
              {/* Storage Usage Graph */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">Storage Usage</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    layout="vertical"
                    data={realTimeMetrics.metrics.storage.map(storage => ({
                      name: storage.storageDescr || 'Unknown Storage',
                      used: storage.storageUsed || 0,
                      free: (storage.storageSize || 0) - (storage.storageUsed || 0),
                      total: storage.storageSize || 0
                    }))}
                    margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'Size', position: 'insideBottom', offset: -5 }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${(value/1024/1024).toFixed(2)} GB`, '']}
                      labelFormatter={(label) => `Storage: ${label}`}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="used" name="Used Space" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="free" name="Free Space" stackId="a" fill="#D1D5DB" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* System Information */}
              {realTimeMetrics.metrics.system && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-700 mb-3">System Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-md shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">System Name</div>
                      <div className="font-medium truncate" title={realTimeMetrics.metrics.system.sysName || 'N/A'}>
                        {realTimeMetrics.metrics.system.sysName || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-white rounded-md shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">System Location</div>
                      <div className="font-medium truncate" title={realTimeMetrics.metrics.system.sysLocation || 'N/A'}>
                        {realTimeMetrics.metrics.system.sysLocation || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-white rounded-md shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">System Uptime</div>
                      <div className="font-medium">
                        {realTimeMetrics.metrics.system.sysUpTime 
                          ? `${Math.floor(realTimeMetrics.metrics.system.sysUpTime / 86400)} days, ${Math.floor(realTimeMetrics.metrics.system.sysUpTime % 86400 / 3600)} hours` 
                          : 'N/A'}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-white rounded-md shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">System Description</div>
                      <div className="font-medium truncate" title={realTimeMetrics.metrics.system.sysDescr || 'N/A'}>
                        {realTimeMetrics.metrics.system.sysDescr || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    System resource data is not available. Click "Get Detailed Metrics" in the device information panel to load system information.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Logs</h3>
          {metricsLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : recentLogs.length > 0 ? (
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div key={log.id} className="p-4 bg-gray-50 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                    <StatusBadge status={log.status} />
                  </div>
                  <p className="text-gray-700">{log.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-6">
              No recent logs available
            </div>
          )}
        </div>
      </div>

      {/* Edit Device Modal */}
      {showEditModal && (
        <DeviceForm 
          device={device} 
          onClose={() => setShowEditModal(false)} 
          onSuccess={() => {
            setShowEditModal(false);
            fetchDeviceData();
          }}
        />
      )}

      {/* Delete Device Confirmation Modal */}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Device"
          message="Are you sure you want to delete this device? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Ping Result Modal */}
      {showPingResultModal && (
        <ConfirmModal
          title={"Ping Result"}
          message={(() => {
            const failed = pingResult.includes('unreachable') || pingResult.includes('timed out') || pingResult.includes('could not find host') || pingResult.toLowerCase().includes('fail');
            let msMatch = pingResult.match(/(\d+(?:\.\d+)?) ?ms/);
            if (!failed && msMatch) {
              return <div className="text-green-600 font-semibold">Ping Result: Sukses {parseFloat(msMatch[1]).toFixed(2)} milliseconds</div>;
            } else {
              return <div className="text-red-600 font-semibold">Ping Result: Gagal, device tidak dapat dijangkau.</div>;
            }
          })()}
          confirmText="Tutup"
          onConfirm={() => setShowPingResultModal(false)}
          onCancel={() => setShowPingResultModal(false)}
          hideCancelButton={true}
          overlayClosable={true}
        />
      )}

      {/* Detailed Metrics Modal */}
      {showRealTimeMetrics && realTimeMetrics && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowRealTimeMetrics(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Detailed SNMP Metrics</h2>
              <button
                onClick={() => setShowRealTimeMetrics(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Metrics */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card">
                    <div className="card-body">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">CPU Usage</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {realTimeMetrics.summary.cpuUsage !== null ? `${realTimeMetrics.summary.cpuUsage}%` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card">
                    <div className="card-body">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Memory Usage</p>
                          <p className="text-2xl font-bold text-green-600">
                            {realTimeMetrics.summary.memoryUsage !== null ? `${realTimeMetrics.summary.memoryUsage.toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card">
                    <div className="card-body">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Disk Usage</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {realTimeMetrics.summary.diskUsage !== null ? `${realTimeMetrics.summary.diskUsage.toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card">
                    <div className="card-body">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Temperature</p>
                          <p className="text-2xl font-bold text-red-600">
                            {realTimeMetrics.summary.temperature !== null ? `${realTimeMetrics.summary.temperature.toFixed(1)}°C` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Info */}
              {realTimeMetrics.metrics.system && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">System Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                      <div className="flex justify-between py-1 border-b border-gray-200">
                        <dt className="text-gray-600">System Description</dt>
                        <dd className="font-medium text-right">{realTimeMetrics.metrics.system.sysDescr || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200">
                        <dt className="text-gray-600">System Name</dt>
                        <dd className="font-medium text-right">{realTimeMetrics.metrics.system.sysName || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200">
                        <dt className="text-gray-600">System Location</dt>
                        <dd className="font-medium text-right">{realTimeMetrics.metrics.system.sysLocation || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200">
                        <dt className="text-gray-600">Uptime</dt>
                        <dd className="font-medium text-right">
                          {realTimeMetrics.metrics.system.sysUpTime 
                            ? `${Math.floor(realTimeMetrics.metrics.system.sysUpTime / 86400)} days, ${Math.floor(realTimeMetrics.metrics.system.sysUpTime % 86400 / 3600)} hours` 
                            : 'N/A'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}

              {/* Storage Information */}
              {realTimeMetrics.metrics.storage && realTimeMetrics.metrics.storage.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Storage Information</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Usage %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {realTimeMetrics.metrics.storage.map((storage, i) => (
                          <tr key={i}>
                            <td className="py-2 px-3 text-sm">{storage.storageDescr || 'Unknown'}</td>
                            <td className="py-2 px-3 text-sm text-right">
                              {storage.storageSize ? storage.storageSize.toLocaleString() : 'N/A'}
                            </td>
                            <td className="py-2 px-3 text-sm text-right">
                              {storage.storageUsed ? storage.storageUsed.toLocaleString() : 'N/A'}
                            </td>
                            <td className="py-2 px-3 text-sm text-right">
                              {storage.storageUsagePercent !== undefined 
                                ? `${storage.storageUsagePercent.toFixed(1)}%` 
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Interface Statistics */}
              {realTimeMetrics.metrics.interfaces && realTimeMetrics.metrics.interfaces.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Interface Statistics</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interface</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Speed</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bytes In</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bytes Out</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {realTimeMetrics.metrics.interfaces.map((iface, i) => (
                          <tr key={i}>
                            <td className="py-2 px-3 text-sm">{iface.ifDescr || `Interface ${iface.index}`}</td>
                            <td className="py-2 px-3 text-sm text-right">
                              {iface.ifSpeed 
                                ? `${(iface.ifSpeed / 1000000).toFixed(0)} Mbps` 
                                : 'N/A'}
                            </td>
                            <td className="py-2 px-3 text-sm text-right">
                              {iface.ifInOctets 
                                ? `${iface.ifInErrors || 0} / ${iface.ifOutErrors || 0}` 
                                : '0 / 0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowRealTimeMetrics(false)}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interface Details Modal */}
      {showInterfaceDetails && selectedInterface && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowInterfaceDetails(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-100 to-blue-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Network className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedInterface.ifDescr || `Interface ${selectedInterface.index}`}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedInterface.ifType} - {selectedInterface.ifOperStatus === 1 ? 'Up' : 'Down'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInterfaceDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Interface Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Interface Information</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">Interface Index:</dt>
                        <dd className="font-medium">{selectedInterface.index}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">Type:</dt>
                        <dd className="font-medium">{selectedInterface.ifType || 'Unknown'}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">Speed:</dt>
                        <dd className="font-medium">
                          {selectedInterface.ifSpeed 
                            ? `${(selectedInterface.ifSpeed / 1000000).toFixed(0)} Mbps` 
                            : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">MAC Address:</dt>
                        <dd className="font-medium">{selectedInterface.ifPhysAddress || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">MTU:</dt>
                        <dd className="font-medium">{selectedInterface.ifMtu || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">Admin Status:</dt>
                        <dd className="font-medium">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            selectedInterface.ifAdminStatus === 1 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedInterface.ifAdminStatus === 1 ? 'Up' : 'Down'}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="card shadow-sm">
                  <div className="card-body">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Statistics</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">Incoming Traffic:</dt>
                        <dd className="font-medium">
                          {selectedInterface.ifInOctets 
                            ? `${(selectedInterface.ifInOctets / 1024).toFixed(2)} KB` 
                            : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">Outgoing Traffic:</dt>
                        <dd className="font-medium">
                          {selectedInterface.ifOutOctets 
                            ? `${(selectedInterface.ifOutOctets / 1024).toFixed(2)} KB` 
                            : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">In Packets:</dt>
                        <dd className="font-medium">{selectedInterface.ifInUcastPkts || 0}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">Out Packets:</dt>
                        <dd className="font-medium">{selectedInterface.ifOutUcastPkts || 0}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">In Errors:</dt>
                        <dd className={`font-medium ${selectedInterface.ifInErrors > 0 ? 'text-red-600' : ''}`}>
                          {selectedInterface.ifInErrors || 0}
                        </dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <dt className="text-gray-500">Out Errors:</dt>
                        <dd className={`font-medium ${selectedInterface.ifOutErrors > 0 ? 'text-red-600' : ''}`}>
                          {selectedInterface.ifOutErrors || 0}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Bandwidth Utilization */}
              <div className="card shadow-sm">
                <div className="card-body">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bandwidth Utilization</h3>
                  {selectedInterface.ifSpeed ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Incoming Bandwidth</p>
                          <div className="relative pt-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-semibold inline-block text-blue-600">
                                  {selectedInterface.ifInOctets && selectedInterface.ifSpeed 
                                    ? ((selectedInterface.ifInOctets * 8 / selectedInterface.ifSpeed) * 100).toFixed(2)
                                    : '0'}%
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-semibold inline-block text-blue-600">
                                  {selectedInterface.ifInOctets 
                                    ? `${((selectedInterface.ifInOctets * 8) / 1000000).toFixed(2)} Mbps` 
                                    : '0 Mbps'}
                                </span>
                              </div>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                              <div 
                                style={{ width: `${((selectedInterface.ifInOctets * 8 / selectedInterface.ifSpeed) * 100).toFixed(2)}%` }} 
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600">
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Outgoing Bandwidth</p>
                          <div className="relative pt-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-semibold inline-block text-green-600">
                                  {selectedInterface.ifOutOctets && selectedInterface.ifSpeed 
                                    ? ((selectedInterface.ifOutOctets * 8 / selectedInterface.ifSpeed) * 100).toFixed(2)
                                    : '0'}%
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-semibold inline-block text-green-600">
                                  {selectedInterface.ifOutOctets 
                                    ? `${((selectedInterface.ifOutOctets * 8) / 1000000).toFixed(2)} Mbps` 
                                    : '0 Mbps'}
                                </span>
                              </div>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-200">
                              <div 
                                style={{ width: `${((selectedInterface.ifOutOctets * 8 / selectedInterface.ifSpeed) * 100).toFixed(2)}%` }} 
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-600">
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-md font-medium text-gray-700 mb-3">Current Traffic Visualization</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart
                            data={[
                              {
                                name: 'Current',
                                inTraffic: selectedInterface.ifInOctets ? ((selectedInterface.ifInOctets * 8) / 1000000) : 0,
                                outTraffic: selectedInterface.ifOutOctets ? ((selectedInterface.ifOutOctets * 8) / 1000000) : 0,
                                capacity: selectedInterface.ifSpeed ? (selectedInterface.ifSpeed / 1000000) : 0
                              }
                            ]}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis label={{ value: 'Mbps', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value) => [`${value.toFixed(2)} Mbps`, '']} />
                            <Legend />
                            <Area 
                              type="monotone" 
                              dataKey="inTraffic" 
                              name="Incoming Traffic" 
                              stroke="#4F46E5" 
                              fill="#4F46E5" 
                              fillOpacity={0.3} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="outTraffic" 
                              name="Outgoing Traffic" 
                              stroke="#10B981" 
                              fill="#10B981" 
                              fillOpacity={0.3} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="capacity" 
                              name="Link Capacity" 
                              stroke="#6B7280" 
                              fill="#6B7280" 
                              fillOpacity={0.1} 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Info className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            Interface speed information is not available. Cannot calculate bandwidth utilization.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Traffic History */}
              <div className="card shadow-sm">
                <div className="card-body">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic History (24 Hours)</h3>
                  {trafficLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <LoadingSpinner />
                    </div>
                  ) : interfaceTrafficHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={interfaceTrafficHistory}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis label={{ value: 'Traffic (KB)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => [`${value} KB`, '']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="inTraffic" 
                          name="Incoming Traffic" 
                          stroke="#4F46E5" 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="outTraffic" 
                          name="Outgoing Traffic" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-gray-500 py-6">
                      No historical traffic data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowInterfaceDetails(false)}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceDetail;
