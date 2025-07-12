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
  Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import useDevices from '../hooks/useDevices';
import monitoringService from '../services/monitoringService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';

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

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page]);

  const fetchLogs = async () => {
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
    }
  };

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

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (timestamp) => {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffMs = now - logTime;
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const exportLogs = async () => {
    try {
      const params = {
        ...filters,
        limit: 10000, // Large limit for export
        format: 'csv'
      };
      
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
    </div>
  );
};

export default Monitoring;