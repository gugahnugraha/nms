import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  Activity, 
  Clock,
  Server,
  AlertTriangle,
  RefreshCw,
  Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import useDevices from '../hooks/useDevices';
import monitoringService from '../services/monitoringService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Reports = () => {
  const { user } = useAuth();
  const { devices } = useDevices();
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    period: '7d',
    startDate: '',
    endDate: '',
    devices: []
  });
  const [summary, setSummary] = useState({
    totalDevices: 0,
    avgUptime: 0,
    totalDowntime: 0,
    incidents: 0
  });

  const periodOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {
        period: filters.period,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.devices.length > 0 && { devices: filters.devices.join(',') })
      };

      const response = await monitoringService.getReports(params);
      setReports(response.reports || response.data?.reports || []);
      
      // Calculate summary statistics
      if (response.reports?.length > 0) {
        const totalDevices = new Set(response.reports.map(r => r._id.device)).size;
        const avgUptime = response.reports.reduce((acc, r) => acc + (r.uptime || 0), 0) / response.reports.length;
        const totalDowntime = response.reports.reduce((acc, r) => acc + (r.downtime || 0), 0);
        const incidents = response.reports.reduce((acc, r) => acc + (r.incidents || 0), 0);
        
        setSummary({
          totalDevices,
          avgUptime: Math.round(avgUptime * 100) / 100,
          totalDowntime: Math.round(totalDowntime),
          incidents
        });
      }
    } catch (error) {
      toast.error('Failed to fetch reports');
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
    toast.success('Reports refreshed');
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportReport = async () => {
    try {
      toast.info('Export functionality will be implemented');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  // Prepare chart data
  const uptimeData = reports.map(report => ({
    device: report.deviceInfo?.name || 'Unknown',
    uptime: Math.round((report.uptime || 0) * 100) / 100,
    downtime: Math.round((100 - (report.uptime || 0)) * 100) / 100
  })).slice(0, 10); // Limit to top 10 devices

  const timelineData = reports.reduce((acc, report) => {
    const date = new Date(report._id.year, report._id.month - 1, report._id.day).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.uptime = (existing.uptime + (report.uptime || 0)) / 2;
      existing.incidents += report.incidents || 0;
    } else {
      acc.push({
        date,
        uptime: Math.round((report.uptime || 0) * 100) / 100,
        incidents: report.incidents || 0
      });
    }
    
    return acc;
  }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

  const statusDistribution = [
    { name: 'Online', value: summary.avgUptime, color: '#10B981' },
    { name: 'Offline', value: 100 - summary.avgUptime, color: '#EF4444' }
  ];

  const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">
            Historical monitoring reports and analytics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportReport}
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

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Period
              </label>
              <select
                value={filters.period}
                onChange={(e) => handleFilterChange('period', e.target.value)}
                className="input"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {filters.period === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="input"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devices
              </label>
              <select
                multiple
                value={filters.devices}
                onChange={(e) => handleFilterChange('devices', Array.from(e.target.selectedOptions, option => option.value))}
                className="input"
                size="1"
              >
                <option value="">All Devices</option>
                {devices.map(device => (
                  <option key={device._id} value={device._id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Devices</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalDevices}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Server className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Uptime</p>
                    <p className="text-2xl font-bold text-green-600">{summary.avgUptime}%</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Downtime</p>
                    <p className="text-2xl font-bold text-red-600">{summary.totalDowntime}h</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Clock className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Incidents</p>
                    <p className="text-2xl font-bold text-orange-600">{summary.incidents}</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Uptime Trend */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Uptime Trend</h3>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="uptime" 
                        stroke="#10B981" 
                        fill="#10B981" 
                        fillOpacity={0.3}
                        name="Uptime (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No data available for selected period
                  </div>
                )}
              </div>
            </div>

            {/* Status Distribution */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Device Uptime Comparison */}
            <div className="card lg:col-span-2">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Uptime Comparison</h3>
                {uptimeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={uptimeData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="device" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="uptime" fill="#10B981" name="Uptime (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-500">
                    No device data available for selected period
                  </div>
                )}
              </div>
            </div>

            {/* Incidents Over Time */}
            <div className="card lg:col-span-2">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Incidents Over Time</h3>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="incidents" 
                        stroke="#EF4444" 
                        strokeWidth={2}
                        name="Incidents"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No incident data available for selected period
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Report Table */}
          {reports.length > 0 && (
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Report</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Device
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uptime
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Response
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Incidents
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reports.slice(0, 20).map((report, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {report.deviceInfo?.name || 'Unknown Device'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(report._id.year, report._id.month - 1, report._id.day).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              (report.uptime || 0) > 95 
                                ? 'bg-green-100 text-green-800' 
                                : (report.uptime || 0) > 80 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {Math.round((report.uptime || 0) * 100) / 100}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {Math.round(report.avgResponseTime || 0)}ms
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.incidents || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;