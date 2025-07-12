import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Activity, 
  Filter, 
  Search, 
  RefreshCw, 
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Server,
  Zap,
  Upload,
  Terminal,
  Wifi,
  BarChart2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import useDevices from '../hooks/useDevices';
import monitoringService from '../services/monitoringService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, LineChart, Line, BarChart, Bar } from 'recharts';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

const Monitoring = () => {
  const { user } = useAuth();
  const { devices } = useDevices();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    device: searchParams.get('device') || '',
    status: searchParams.get('status') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    search: searchParams.get('search') || ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [selectedMetrics, setSelectedMetrics] = useState(['cpuLoad', 'memoryUsage', 'diskUsage']);

  // Memoize fetch function to prevent dependency changes
  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.device && { device: filters.device }),
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search })
      };

      const response = await monitoringService.getMonitoringLogs(params);
      setLogs(response.logs || response.data?.logs || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || response.total || 0,
        pages: response.pagination?.pages || Math.ceil((response.total || 0) / prev.limit)
      }));
    } catch (error) {
      toast.error('Failed to fetch monitoring logs');
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
    toast.success('Monitoring data refreshed');
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Update URL params
    const newSearchParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newSearchParams.set(k, v);
    });
    setSearchParams(newSearchParams);
  };

  const handleClearFilters = () => {
    setFilters({
      device: '',
      status: '',
      startDate: '',
      endDate: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'offline':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Format duration since timestamp
  const formatDuration = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) return `${diffDays}d ago`;
      if (diffHours > 0) return `${diffHours}h ago`;
      if (diffMins > 0) return `${diffMins}m ago`;
      return 'Just now';
    } catch (e) {
      return 'Unknown';
    }
  };

  // Format bandwidth for display
  const formatBandwidth = (value) => {
    if (!value && value !== 0) return 'N/A';
    if (value < 1024) return `${value.toFixed(2)} KB/s`;
    if (value < 1048576) return `${(value / 1024).toFixed(2)} MB/s`;
    return `${(value / 1048576).toFixed(2)} GB/s`;
  };

  // Get color based on bandwidth usage
  const getBandwidthColor = (value, max = 1000) => {
    if (!value && value !== 0) return 'text-gray-500';
    const percentage = (value / max) * 100;
    if (percentage > 90) return 'text-red-600';
    if (percentage > 70) return 'text-yellow-600';
    if (percentage > 50) return 'text-blue-600';
    return 'text-green-600';
  };

  // Format uptime display
  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const exportLogs = async () => {
    try {
      // This would typically call an export endpoint
      toast.info('Export functionality will be implemented');
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Monitoring</h1>
          <p className="page-subtitle">
            Real-time device monitoring and activity logs
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportLogs}
            className="btn btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Monitoring Dashboard */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Devices Card */}
          <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
              </div>
              <div className="p-3 rounded-full bg-primary-50">
                <Server className="w-6 h-6 text-primary-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center">
                <span className="h-3 w-3 rounded-full bg-green-500 mr-1.5"></span>
                <span className="text-gray-600">Online: {devices.filter(d => d.status === 'online').length}</span>
              </div>
              <div className="flex items-center">
                <span className="h-3 w-3 rounded-full bg-red-500 mr-1.5"></span>
                <span className="text-gray-600">Offline: {devices.filter(d => d.status === 'offline').length}</span>
              </div>
            </div>
          </div>

          {/* Network Traffic Card */}
          <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Network Traffic</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatBandwidth(logs.reduce((sum, log) => sum + (log.bandwidth || 0), 0))}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-50">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <Download className="w-4 h-4 text-green-500 mr-1.5" />
                <span className="text-sm text-gray-600">
                  {formatBandwidth(logs.reduce((sum, log) => sum + (log.downloadBandwidth || 0), 0))}
                </span>
              </div>
              <div className="flex items-center">
                <Upload className="w-4 h-4 text-blue-500 mr-1.5" />
                <span className="text-sm text-gray-600">
                  {formatBandwidth(logs.reduce((sum, log) => sum + (log.uploadBandwidth || 0), 0))}
                </span>
              </div>
            </div>
          </div>

          {/* System Health Card */}
          <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">System Health</p>
                <p className="text-2xl font-bold text-gray-900">
                  {logs.some(log => log.cpuUsage > 90 || log.memoryUsage > 90) ? 'Warning' : 'Good'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-50">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500">Avg CPU</p>
                <p className={`text-sm font-medium ${getBandwidthColor(logs.reduce((sum, log) => sum + (log.cpuUsage || 0), 0) / (logs.length || 1), 100)}`}>
                  {(logs.reduce((sum, log) => sum + (log.cpuUsage || 0), 0) / (logs.length || 1)).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Memory</p>
                <p className={`text-sm font-medium ${getBandwidthColor(logs.reduce((sum, log) => sum + (log.memoryUsage || 0), 0) / (logs.length || 1), 100)}`}>
                  {(logs.reduce((sum, log) => sum + (log.memoryUsage || 0), 0) / (logs.length || 1)).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Uptime Card */}
          <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Uptime</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatUptime(logs.reduce((sum, log) => sum + (log.uptime || 0), 0) / (logs.length || 1))}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <Clock className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Availability</span>
                <span className="text-xs font-medium text-gray-700">
                  {((devices.filter(d => d.status === 'online').length / (devices.length || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div 
                  className="bg-green-500 h-1.5 rounded-full" 
                  style={{ width: `${(devices.filter(d => d.status === 'online').length / (devices.length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Device Filter */}
            <select
              value={filters.device}
              onChange={(e) => handleFilterChange('device', e.target.value)}
              className="input"
            >
              <option value="">All Devices</option>
              {devices.map(device => (
                <option key={device._id} value={device._id}>
                  {device.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input"
            >
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="unknown">Unknown</option>
            </select>

            {/* Start Date */}
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="input"
              placeholder="Start Date"
            />

            {/* End Date */}
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="input"
              placeholder="End Date"
            />
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {Object.values(filters).some(v => v) && (
                <span>
                  Filtered results • {pagination.total} total logs
                </span>
              )}
            </div>
            {Object.values(filters).some(v => v) && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Traffic Overview */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title">Traffic Overview</h2>
          <div className="flex items-center space-x-3">
            <select 
              value={filters.timeRange || '24h'} 
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
              className="select select-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
        <div className="card-body">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={logs.slice(0, 20).map(log => ({
                  time: formatTimestamp(log.timestamp),
                  download: log.downloadBandwidth || 0,
                  upload: log.uploadBandwidth || 0,
                  total: (log.downloadBandwidth || 0) + (log.uploadBandwidth || 0)
                }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatBandwidth(value).split(' ')[0]}
                />
                <Tooltip 
                  formatter={(value) => [formatBandwidth(value), '']}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '6px',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                />
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value) => <span style={{ color: '#6B7280', fontSize: 12 }}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>} 
                />
                <Area 
                  type="monotone" 
                  dataKey="download" 
                  name="Download" 
                  stroke="#10B981" 
                  fillOpacity={1} 
                  fill="url(#colorDownload)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="upload" 
                  name="Upload" 
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorUpload)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Active Device Status */}
      {devices.filter(d => d.status === 'online').length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="card-title">Active Device Status</h2>
            <button 
              onClick={fetchLogs}
              className="btn btn-sm btn-outline flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Memory</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traffic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {devices.filter(d => d.status === 'online').slice(0, 5).map(device => {
                    // Find the most recent log for this device
                    const deviceLog = logs.find(log => log.deviceId === device._id) || {};
                    return (
                      <tr key={device._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-9 w-9 bg-gray-100 rounded-full flex items-center justify-center">
                              <Server className="h-5 w-5 text-gray-500" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{device.name}</p>
                              <p className="text-xs text-gray-500">{device.ipAddress}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`text-sm font-medium ${getBandwidthColor(deviceLog.cpuUsage || 0, 100)}`}>
                              {deviceLog.cpuUsage ? `${deviceLog.cpuUsage}%` : 'N/A'}
                            </span>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className={`h-1.5 rounded-full ${deviceLog.cpuUsage > 90 ? 'bg-red-500' : deviceLog.cpuUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${deviceLog.cpuUsage || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`text-sm font-medium ${getBandwidthColor(deviceLog.memoryUsage || 0, 100)}`}>
                              {deviceLog.memoryUsage ? `${deviceLog.memoryUsage}%` : 'N/A'}
                            </span>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className={`h-1.5 rounded-full ${deviceLog.memoryUsage > 90 ? 'bg-red-500' : deviceLog.memoryUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${deviceLog.memoryUsage || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="grid grid-cols-2 gap-1">
                            <div className="flex items-center">
                              <Download className="w-4 h-4 text-green-500 mr-1" />
                              <span className="text-xs text-gray-600">
                                {formatBandwidth(deviceLog.downloadBandwidth || 0)}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Upload className="w-4 h-4 text-blue-500 mr-1" />
                              <span className="text-xs text-gray-600">
                                {formatBandwidth(deviceLog.uploadBandwidth || 0)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {formatUptime(deviceLog.uptime || 0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Logs */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Activity Logs</h3>
            <div className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages} • {pagination.total} total logs
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
              <p className="text-gray-500">
                {Object.values(filters).some(v => v) 
                  ? 'No logs match your current filters'
                  : 'No monitoring logs available yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div 
                  key={log._id || index} 
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(log.status)}
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-gray-900">
                          {log.device?.name || 'Unknown Device'}
                        </span>
                        <StatusBadge status={log.status} />
                        {log.responseTime && (
                          <span className="text-sm text-gray-500">
                            {log.responseTime}ms
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-500">
                          {log.device?.ipAddress || 'Unknown IP'}
                        </span>
                        {log.error && (
                          <span className="text-sm text-red-600">
                            Error: {log.error}
                          </span>
                        )}
                      </div>
                      
                      {(log.cpuUsage || log.memoryUsage) && (
                        <div className="flex items-center space-x-4 mt-1">
                          {log.cpuUsage && (
                            <span className="text-sm text-gray-500">
                              CPU: {log.cpuUsage}%
                            </span>
                          )}
                          {log.memoryUsage && (
                            <span className="text-sm text-gray-500">
                              Memory: {log.memoryUsage}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDuration(log.timestamp)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </div>
                    
                    {log.device && (
                      <Link 
                        to={`/devices/${log.device._id || log.device}`}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const page = i + Math.max(1, pagination.page - 2);
                    if (page > pagination.pages) return null;
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 text-sm rounded ${
                          page === pagination.page
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resource Usage Chart */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title">Resource Usage Trends</h2>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="cpuCheck" 
                checked={selectedMetrics.includes('cpuLoad')}
                onChange={() => {
                  if (selectedMetrics.includes('cpuLoad')) {
                    setSelectedMetrics(selectedMetrics.filter(m => m !== 'cpuLoad'));
                  } else {
                    setSelectedMetrics([...selectedMetrics, 'cpuLoad']);
                  }
                }}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="cpuCheck" className="text-sm text-gray-600">CPU</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="memCheck" 
                checked={selectedMetrics.includes('memoryUsage')}
                onChange={() => {
                  if (selectedMetrics.includes('memoryUsage')) {
                    setSelectedMetrics(selectedMetrics.filter(m => m !== 'memoryUsage'));
                  } else {
                    setSelectedMetrics([...selectedMetrics, 'memoryUsage']);
                  }
                }}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="memCheck" className="text-sm text-gray-600">Memory</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="diskCheck" 
                checked={selectedMetrics.includes('diskUsage')}
                onChange={() => {
                  if (selectedMetrics.includes('diskUsage')) {
                    setSelectedMetrics(selectedMetrics.filter(m => m !== 'diskUsage'));
                  } else {
                    setSelectedMetrics([...selectedMetrics, 'diskUsage']);
                  }
                }}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="diskCheck" className="text-sm text-gray-600">Disk</label>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={logs.slice(0, 20).map(log => ({
                  time: formatTimestamp(log.timestamp),
                  cpuLoad: log.cpuUsage || 0,
                  memoryUsage: log.memoryUsage || 0,
                  diskUsage: log.diskUsage || 0
                }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, '']}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '6px',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                />
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value) => <span style={{ color: '#6B7280', fontSize: 12 }}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>} 
                />
                {selectedMetrics.includes('cpuLoad') && (
                  <Line 
                    type="monotone" 
                    dataKey="cpuLoad" 
                    name="CPU Usage" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                )}
                {selectedMetrics.includes('memoryUsage') && (
                  <Line 
                    type="monotone" 
                    dataKey="memoryUsage" 
                    name="Memory Usage" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                )}
                {selectedMetrics.includes('diskUsage') && (
                  <Line 
                    type="monotone" 
                    dataKey="diskUsage" 
                    name="Disk Usage" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;