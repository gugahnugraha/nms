import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Trash2, 
  RefreshCw,
  Settings,
  AlertCircle,
  ExternalLink,
  Signal,
  Edit,
  Server,
  Router,
  Network,
  Cpu,
  Laptop,
  Smartphone,
  Wifi
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useDevices from '../hooks/useDevices';
import deviceService from '../services/deviceService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import DeviceCard from '../components/common/DeviceCard';
import DeviceForm from '../components/devices/DeviceForm';
import ConfirmModal from '../components/common/ConfirmModal';

const Devices = () => {
  const { user } = useAuth();
  const { devices, loading, error, refetch, deleteDevice } = useDevices();
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deletingDevice, setDeletingDevice] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState('');
  const [pingDevice, setPingDevice] = useState(null);
  const [showPingResultModal, setShowPingResultModal] = useState(false);

  // Filter devices based on search and status
  useEffect(() => {
    let filtered = devices;

    if (searchTerm) {
      filtered = filtered.filter(device => 
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ipAddress.includes(searchTerm) ||
        device.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(device => device.status === statusFilter);
    }

    setFilteredDevices(filtered);
  }, [devices, searchTerm, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDeleteDevice = async (deviceId) => {
    try {
      await deleteDevice(deviceId);
      setDeletingDevice(null);
    } catch (error) {
      console.error('Failed to delete device:', error);
    }
  };
  const handleDeviceAction = (action, device) => {
    switch (action) {
      case 'view':
        // Will be handled by Link component
        break;
      case 'edit':
        setEditingDevice(device);
        break;
      case 'delete':
        setDeletingDevice(device);
        break;
      case 'ping':
        handlePingDevice(device);
        break;
      default:
        break;
    }
  };

  const handlePingDevice = async (device) => {
    setIsPinging(true);
    setPingDevice(device);
    setPingResult('Pinging device...');
    setShowPingResultModal(true);

    try {
      const result = await deviceService.pingDevice(device._id);
      if (result.success) {
        // Extract ping time from raw output if available
        let pingTime = '';
        const timeRegex = /time[<=](\d+\.?\d*)ms/i;
        const rawOutput = result.raw || '';
        const timeMatch = rawOutput.match(timeRegex);
        
        if (timeMatch && timeMatch[1]) {
          pingTime = ` with time ${timeMatch[1]} milliseconds`;
        }
        
        setPingResult(`Device ${device.name} is online${pingTime}!`);
        
        // Update device status if needed
        if (device.status !== 'online') {
          refetch();
        }
      } else {
        setPingResult(`Device ${device.name} is unreachable: ${result.message || 'No response'}`);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || `Failed to ping device ${device.name}`;
      setPingResult(`Error: ${errorMessage}`);
    } finally {
      setIsPinging(false);
    }
  };

  const getStatusCounts = () => {
    const counts = devices.reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {});
    return {
      total: devices.length,
      online: counts.online || 0,
      offline: counts.offline || 0,
      unknown: counts.unknown || 0
    };
  };

  // Calculate device type statistics
  const getDeviceTypeStats = () => {
    if (!devices || devices.length === 0) {
      return [];
    }
    
    // Group devices by type
    const typeCount = {};
    const totalDevices = devices.length;
    
    devices.forEach(device => {
      const type = device.deviceType || 'Unknown';
      if (!typeCount[type]) {
        typeCount[type] = 0;
      }
      typeCount[type]++;
    });
    
    // Convert to array for rendering
    return Object.keys(typeCount).map(type => {
      const count = typeCount[type];
      const percentage = Math.round((count / totalDevices) * 100);
      
      let color = 'gray';
      if (type === 'Router') color = 'blue';
      else if (type === 'Switch') color = 'green';
      else if (type === 'Access Point') color = 'yellow';
      else if (type === 'Server') color = 'indigo';
      
      return {
        type,
        count,
        percentage,
        color,
        icon: type === 'Router' ? <Router className="w-5 h-5" /> : 
              type === 'Switch' ? <Network className="w-5 h-5" /> : 
              type === 'Access Point' ? <Wifi className="w-5 h-5" /> :
              type === 'Server' ? <Server className="w-5 h-5" /> :
              <Server className="w-5 h-5" />
      };
    });
  };

  const statusCounts = getStatusCounts();

  if (loading && devices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">
            Manage your MikroTik network devices
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </button>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.total}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Online</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.online}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Offline</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.offline}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <div className="w-6 h-6 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unknown</p>
                <p className="text-2xl font-bold text-gray-600">{statusCounts.unknown}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Device Type Statistics */}
      <div className="card shadow-lg">
        <div className="card-header bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-medium text-gray-900">Device Types</h3>
            </div>
          </div>
        </div>
        <div className="card-body p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getDeviceTypeStats().map((stat) => (
              <div key={stat.type} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.type}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.count}</p>
                  </div>
                  <div className={`p-2 bg-${stat.color}-100 rounded-lg`}>
                    <div className={`w-5 h-5 text-${stat.color}-600`}>
                      {stat.icon}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-${stat.color}-500`} 
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{stat.percentage}% of total devices</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-64"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-32"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`btn btn-xs ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}`}
              >
                <div className="w-5 h-5 grid grid-cols-2 gap-1">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`btn btn-xs ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
              >
                <div className="w-5 h-5 flex flex-col space-y-1">
                  <div className="bg-current h-1 rounded-sm"></div>
                  <div className="bg-current h-1 rounded-sm"></div>
                  <div className="bg-current h-1 rounded-sm"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5 mr-2" />
          <div>
            <p className="font-medium">Error loading devices</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Devices List/Grid */}
      {filteredDevices.length === 0 ? (
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'No devices match your current filters'
              : 'Get started by adding your first MikroTik device'
            }
          </p>
          {user?.role === 'admin' && !searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6' 
          : 'space-y-4'}>
          {filteredDevices.map((device) => (
            viewMode === 'grid' ? (
              <DeviceCard
                key={device._id}
                device={device}
                onAction={handleDeviceAction}
                showActions={user?.role === 'admin'}
              />
            ) : (
              <DeviceListItem
                key={device._id}
                device={device}
                onAction={handleDeviceAction}
                showActions={user?.role === 'admin'}
              />
            )
          ))}
        </div>
      )}

      {/* Add/Edit Device Modal */}
      {(showAddModal || editingDevice) && (
        <DeviceForm
          device={editingDevice}
          onClose={() => {
            setShowAddModal(false);
            setEditingDevice(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingDevice(null);
            refetch();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingDevice && (
        <ConfirmModal
          title="Delete Device"
          message={`Are you sure you want to delete "${deletingDevice.name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmButtonClass="btn-danger"
          onConfirm={() => handleDeleteDevice(deletingDevice._id)}
          onCancel={() => setDeletingDevice(null)}
        />
      )}

      {/* Ping Result Modal */}
      {showPingResultModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Ping Result</h3>
              <button 
                onClick={() => setShowPingResultModal(false)}
                className="btn btn-xs btn-outline"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              {pingDevice && (
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{pingDevice.name}</p>
                    <p className="text-sm text-gray-500">{pingDevice.ipAddress}</p>
                  </div>
                </div>
              )}
              
              <div className={`p-3 rounded-md ${pingResult.includes('online') ? 'bg-green-50' : 'bg-red-50'}`}>
                {isPinging ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="small" />
                    <span>Pinging device...</span>
                  </div>
                ) : (
                  <div>
                    {pingResult.includes('online') ? (
                      <>
                        <p className="text-green-700 font-medium">
                          {pingResult.split('with time')[0]}
                        </p>
                        {pingResult.includes('with time') && (
                          <p className="text-green-700 mt-1">
                            <span className="font-medium">Response Time:</span> 
                            <span className="ml-1 px-2 py-1 bg-green-200 rounded text-green-800 font-mono">
                              {pingResult.split('with time')[1].replace('!', '')}
                            </span>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-red-700">
                        {pingResult}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowPingResultModal(false)}
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

// Device List Item Component for List View
const DeviceListItem = ({ device, onAction, showActions }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-md flex items-center justify-center">
              <Server className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 mb-0.5">
                <span className="inline-block bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs">
                  {device.deviceId || 'N/A'}
                </span>
                <Link 
                  to={`/devices/${device._id}`}
                  className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate"
                >
                  {device.name}
                </Link>
                <StatusBadge status={device.status} />
              </div>
              <p className="text-xs text-gray-500 truncate">{device.ipAddress}</p>
              {device.location && (
                <p className="text-xs text-gray-500 truncate">{device.location}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="text-right text-xs">
              <p className="font-medium text-gray-900">
                {device.lastSeen ? new Date(device.lastSeen).toLocaleDateString() : 'Never'}
              </p>
              <p className="text-gray-500">Last seen</p>
            </div>
            {showActions && (
              <div className="flex flex-wrap gap-1.5">
                <Link
                  to={`/devices/${device._id}`}
                  className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                  title="View device details"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  <span>Details</span>
                </Link>
                
                <button
                  onClick={() => onAction('ping', device)}
                  className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  title="Ping device"
                >
                  <Signal className="w-3 h-3" />
                  <span className="hidden xs:inline ml-1">Ping</span>
                </button>
                
                <button
                  onClick={() => onAction('edit', device)}
                  className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  title="Edit device"
                >
                  <Edit className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => onAction('delete', device)}
                  className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                  title="Delete device"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Devices;
