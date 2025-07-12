import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Server, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Wifi,
  RefreshCw,
  Gauge,
  Zap,
  ServerCog,
  FileBarChart,
  Bell,
  TrendingDown,
  Check,
  AlertTriangle,
  ThumbsUp,
  AlertOctagon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import useMonitoring from '../hooks/useMonitoring';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Legend,
  Cell
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const { dashboardData, loading, error, lastUpdated, refetch } = useMonitoring(true, 30000);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('response');
  const [showUptimeModal, setShowUptimeModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      // If you have toast notifications in your project
      // toast.success('Dashboard data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      // If you have toast notifications in your project
      // toast.error('Failed to refresh dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleTimeString();
  };

  const formatLastSeen = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const lastSeen = new Date(date);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
  };

  const handleMetricChange = (metric) => {
    setSelectedMetric(metric);
  };

  // Generate mock data for demonstration (in real app, this would come from the API)
  const generateMockChartData = () => {
    const data = [];
    const now = new Date();
    const labels = [];
    
    // Generate labels for the last 24 hours
    for (let i = 24; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    
    // Generate data points
    for (let i = 0; i < 25; i++) {
      data.push({
        time: labels[i],
        online: Math.floor(Math.random() * 10) + 10, // Random value between 10-20
        offline: Math.floor(Math.random() * 5), // Random value between 0-5
        responseTime: Math.floor(Math.random() * 50) + 20 // Random value between 20-70
      });
    }
    
    return data;
  };

  const generateDevicePerformanceData = () => {
    const mockDevices = devices || [];
    
    // Filter only router devices
    const routerDevices = mockDevices.filter(device => device.deviceType === 'router');
    
    return routerDevices.map(device => {
      // Check if the device has real monitoring data in the logs
      const deviceStats = dashboardData?.uptimeStats?.find(stat => stat._id === device._id);
      
      // Use real data if available, otherwise fallback to generated data
      const uptime = deviceStats?.uptime || 
                    (typeof device.uptime === 'number' ? device.uptime : Math.floor(Math.random() * 20) + 80);
      
      const responseTime = deviceStats?.avgResponseTime || Math.floor(Math.random() * 200) + 10;
      
      // Get the latest device log if available
      const latestLog = recentLogs?.find(log => log.device?._id === device._id);
      
      return {
        name: device.name,
        responseTime: responseTime,
        uptime: uptime,
        downtime: 100 - uptime,
        traffic: Math.floor(Math.random() * 500) + 100,
        cpuUsage: latestLog?.cpuUsage || Math.floor(Math.random() * 60) + 20,
        memoryUsage: latestLog?.memoryUsage || Math.floor(Math.random() * 70) + 15,
        diskUsage: latestLog?.diskUsage || Math.floor(Math.random() * 50) + 30
      };
    });
  };

  if (loading && !dashboardData) {
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
            <p className="font-medium">Error loading dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.statusCounts || { online: 0, offline: 0, unknown: 0 };
  const totalDevices = dashboardData?.totalDevices || 0;
  const devices = dashboardData?.devices || [];
  const recentLogs = dashboardData?.recentLogs || [];
  
  // Mock data for charts
  const networkStatusData = generateMockChartData();
  const devicePerformanceData = generateDevicePerformanceData();
  // Add calculated downtime for each device
  devicePerformanceData.forEach(device => {
    device.downtime = 100 - device.uptime;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header with time range selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.firstName}! Here's what's happening with your network.
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
          <div className="w-full md:w-auto">
            <select
              value={timeRange}
              onChange={handleTimeRangeChange}
              className="select select-sm select-bordered w-full md:w-auto"
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500 whitespace-nowrap">
            Last updated: {formatTime(lastUpdated)}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary btn-sm w-full md:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-md">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-indigo-100 rounded-lg">
                <Server className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{totalDevices}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 shadow-md">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Online</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-green-600">{stats.online}</p>
                  {totalDevices > 0 && (
                    <p className="ml-2 text-sm text-gray-500">
                      ({Math.round((stats.online / totalDevices) * 100)}%)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 shadow-md">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-red-100 rounded-lg">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Offline</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-red-600">{stats.offline}</p>
                  {totalDevices > 0 && (
                    <p className="ml-2 text-sm text-gray-500">
                      ({Math.round((stats.offline / totalDevices) * 100)}%)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-md">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unknown</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-yellow-600">{stats.unknown}</p>
                  {totalDevices > 0 && (
                    <p className="ml-2 text-sm text-gray-500">
                      ({Math.round((stats.unknown / totalDevices) * 100)}%)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Network Health Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card shadow-lg col-span-1">
          <div className="card-header bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
          </div>
          <div className="card-body p-4">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/devices/add" className="btn btn-outline flex flex-col items-center justify-center p-4 h-auto">
                <ServerCog className="h-6 w-6 mb-2" />
                <span>Add Device</span>
              </Link>
              <button 
                onClick={handleRefresh} 
                className="btn btn-outline flex flex-col items-center justify-center p-4 h-auto"
              >
                <Gauge className="h-6 w-6 mb-2" />
                <span>Refresh Network</span>
              </button>
              <Link to="/reports" className="btn btn-outline flex flex-col items-center justify-center p-4 h-auto">
                <FileBarChart className="h-6 w-6 mb-2" />
                <span>Reports</span>
              </Link>
              <Link to="/settings" className="btn btn-outline flex flex-col items-center justify-center p-4 h-auto">
                <Bell className="h-6 w-6 mb-2" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="card shadow-lg col-span-1 lg:col-span-2">
          <div className="card-header bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-medium text-gray-900">Network Health Summary</h3>
            </div>
          </div>
          <div className="card-body p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 mb-2">Avg. Response Time</div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-gray-900">
                    {dashboardData?.avgResponseTime ? `${Math.round(dashboardData.avgResponseTime)} ms` : 
                     dashboardData?.uptimeStats && dashboardData.uptimeStats.length > 0 ? 
                     `${Math.round(dashboardData.uptimeStats.reduce((sum, stat) => sum + (stat.avgResponseTime || 0), 0) / 
                     dashboardData.uptimeStats.length)} ms` : 'N/A'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {(dashboardData?.avgResponseTime || 
                    (dashboardData?.uptimeStats && dashboardData.uptimeStats.length > 0 && 
                    dashboardData.uptimeStats.reduce((sum, stat) => sum + (stat.avgResponseTime || 0), 0) / 
                    dashboardData.uptimeStats.length)) < 100 ? 
                    <span className="text-green-600 flex items-center">
                      <TrendingDown className="w-3 h-3 mr-1" /> Good performance
                    </span> : 
                    <span className="text-yellow-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Needs attention
                    </span>
                  }
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 mb-2">Network Stability</div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-gray-900">
                    {totalDevices && stats.online ? 
                      `${Math.round((stats.online / totalDevices) * 100)}%` : 
                      dashboardData?.uptimeStats && dashboardData.uptimeStats.length > 0 ?
                      `${Math.round(dashboardData.uptimeStats.reduce((sum, stat) => sum + (stat.uptime || 0), 0) / 
                      dashboardData.uptimeStats.length)}%` : 'N/A'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {(totalDevices && stats.online && ((stats.online / totalDevices) * 100) > 90) || 
                   (dashboardData?.uptimeStats && dashboardData.uptimeStats.length > 0 && 
                   (dashboardData.uptimeStats.reduce((sum, stat) => sum + (stat.uptime || 0), 0) / 
                   dashboardData.uptimeStats.length) > 90) ? 
                    <span className="text-green-600 flex items-center">
                      <Check className="w-3 h-3 mr-1" /> Stable
                    </span> : 
                    <span className="text-red-600 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Unstable
                    </span>
                  }
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 mb-2">Critical Alerts</div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-gray-900">
                    {dashboardData?.criticalAlerts || 
                     (recentLogs && recentLogs.filter(log => log.status === 'offline' && new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length) || '0'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {(!dashboardData?.criticalAlerts && 
                    (!recentLogs || recentLogs.filter(log => log.status === 'offline' && new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length === 0)) ? 
                    <span className="text-green-600 flex items-center">
                      <ThumbsUp className="w-3 h-3 mr-1" /> All clear
                    </span> : 
                    <span className="text-red-600 flex items-center">
                      <AlertOctagon className="w-3 h-3 mr-1" /> Needs attention
                    </span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Status Chart */}
      <div className="card shadow-lg">
        <div className="card-header bg-gradient-to-r from-indigo-100 to-blue-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-medium text-gray-900">Network Status Overview</h3>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => handleMetricChange('status')}
                className={`btn btn-xs ${selectedMetric === 'status' ? 'btn-primary' : 'btn-outline'}`}
              >
                Status
              </button>
              <button 
                onClick={() => handleMetricChange('response')}
                className={`btn btn-xs ${selectedMetric === 'response' ? 'btn-primary' : 'btn-outline'}`}
              >
                Response Time
              </button>
            </div>
          </div>
        </div>
        <div className="card-body p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {selectedMetric === 'status' ? (
                <AreaChart
                  data={networkStatusData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'online') return [value, 'Online Devices'];
                      if (name === 'offline') return [value, 'Offline Devices'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="online" name="Online" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="offline" name="Offline" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                </AreaChart>
              ) : (
                <LineChart
                  data={networkStatusData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [`${value} ms`, 'Avg. Response Time']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime" 
                    name="Avg. Response Time" 
                    stroke="#4F46E5" 
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Performance */}
        <div className="card shadow-lg">
          <div className="card-header bg-gradient-to-r from-blue-100 to-cyan-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gauge className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Router Performance</h3>
              </div>
              <button 
                onClick={() => setShowPerformanceModal(true)} 
                className="btn btn-xs btn-outline"
                title="View all devices"
              >
                <span className="flex items-center">
                  <Server className="h-3 w-3 mr-1" />
                  View All
                </span>
              </button>
            </div>
          </div>
          <div 
            className="card-body p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowPerformanceModal(true)}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={devicePerformanceData.slice(0, 5)}
                  layout="vertical"
                  margin={{
                    top: 10,
                    right: 30,
                    left: 70,
                    bottom: 5,
                  }}
                  fontSize={11}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'responseTime') return [`${value} ms`, 'Response Time'];
                    if (name === 'uptime') return [`${value}%`, 'Uptime'];
                    return [value, name];
                  }} />
                  <Legend />
                  <Bar dataKey="responseTime" name="Response Time" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Network Uptime */}
        <div className="card shadow-lg">
          <div className="card-header bg-gradient-to-r from-green-100 to-emerald-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">Network Uptime</h3>
              </div>
              <button 
                onClick={() => setShowUptimeModal(true)} 
                className="btn btn-xs btn-outline"
                title="View all devices"
              >
                <span className="flex items-center">
                  <Server className="h-3 w-3 mr-1" />
                  View All
                </span>
              </button>
            </div>
          </div>
          <div 
            className="card-body p-4 cursor-pointer hover:bg-gray-50 transition-colors" 
            onClick={() => setShowUptimeModal(true)}
          >
            <div className="h-64">
              {/* Kombinasi chart uptime dengan informasi rata-rata */}
              <div className="h-full">
                {/* Bar chart untuk uptime per device, tanpa average persentase */}
                <div className="h-full">
                  <div className="flex justify-end mb-1">
                    <div className="flex items-center text-xs text-gray-500">
                      <div className="flex items-center">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-sm mr-1"></span> 
                        <span className="mr-2">Up</span>
                        <span className="inline-block w-2 h-2 bg-red-400 rounded-sm mr-1"></span> 
                        <span>Down</span>
                      </div>
                    </div>
                  </div>
                
                  {devicePerformanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={devicePerformanceData.slice(0, 5)}
                        layout="vertical"
                        margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis 
                          type="number" 
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={100} 
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'uptime') return [`${value.toFixed(1)}%`, 'Uptime'];
                          if (name === 'downtime') return [`${value.toFixed(1)}%`, 'Downtime'];
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar 
                        dataKey="uptime" 
                        name="Uptime" 
                        stackId="a" 
                        fill="#10B981"
                        barSize={18}
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar 
                        dataKey="downtime" 
                        name="Downtime" 
                        stackId="a" 
                        fill="#F87171"
                        barSize={18}
                        radius={[0, 4, 4, 0]}
                      >
                        {devicePerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#F87171" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <AlertCircle className="mx-auto h-10 w-10 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada router</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Belum ada perangkat tipe router yang ditambahkan.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Devices Overview */}
        <div className="card shadow-lg">
          <div className="card-header bg-gradient-to-r from-purple-100 to-indigo-100 p-4">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-medium text-gray-900">Devices Overview</h3>
            </div>
          </div>
          <div className="card-body p-4">
            {devices.length === 0 ? (
              <div className="text-center py-8">
                <Server className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No devices</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first device.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {devices.slice(0, 5).map((device) => (
                  <div key={device._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        device.status === 'online' ? 'bg-green-100' : 
                        device.status === 'offline' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        <Wifi className={`w-5 h-5 ${
                          device.status === 'online' ? 'text-green-600' : 
                          device.status === 'offline' ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{device.name}</p>
                        <p className="text-xs text-gray-500">{device.ipAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <StatusBadge status={device.status} size="small" />
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatLastSeen(device.lastSeen)}
                      </span>
                    </div>
                  </div>
                ))}
                {devices.length > 5 && (
                  <div className="text-center pt-2">
                    <p className="text-sm text-gray-500">
                      And {devices.length - 5} more devices...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card shadow-lg">
          <div className="card-header bg-gradient-to-r from-orange-100 to-amber-100 p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
          </div>
          <div className="card-body p-4">
            {recentLogs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Activity will appear here once monitoring starts.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentLogs.slice(0, 5).map((log) => (
                  <div key={log._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        log.status === 'online' ? 'bg-green-500' :
                        log.status === 'offline' ? 'bg-red-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {log.device?.name || 'Unknown Device'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.device?.ipAddress}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={log.status} size="small" />
                      <p className="text-xs text-gray-500 mt-1">
                        {formatLastSeen(log.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Device Performance */}
      {showPerformanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Gauge className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium">Device Performance - Routers Only</h3>
              </div>
              <button 
                onClick={() => setShowPerformanceModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase tracking-wide">Device Performance Analysis</h4>
                  </div>
                  <button 
                    onClick={handleRefresh}
                    className="btn btn-sm btn-secondary"
                    disabled={refreshing}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </button>
                </div>
              </div>

              <div className="h-[500px]">
                {devicePerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={devicePerformanceData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <YAxis 
                        type="category" 
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        width={110}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, '']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '6px',
                          borderColor: '#e2e8f0',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 10 }} />
                      <Bar dataKey="cpuUsage" name="CPU" fill="#ef4444" barSize={20} />
                      <Bar dataKey="memoryUsage" name="Memory" fill="#8b5cf6" barSize={20} />
                      <Bar dataKey="diskUsage" name="Disk" fill="#10b981" barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="text-gray-500 mt-2">No performance data available</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Try adding router devices to view performance metrics
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;