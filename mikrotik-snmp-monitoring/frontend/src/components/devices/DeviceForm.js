import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import deviceService from '../../services/deviceService';
import LoadingSpinner from '../common/LoadingSpinner';

const DeviceForm = ({ device, onClose, onSuccess, onSave }) => {
  const [formData, setFormData] = useState({
    deviceId: '',
    name: '',
    ipAddress: '',
    snmpCommunity: 'pemkab',
    snmpPort: 161,
    snmpVersion: '2c',
    deviceType: 'router',
    location: '',
    description: '',
    pingInterval: 300,
    snmpInterval: 600,
    isActive: true
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (device) {
      setFormData({
        deviceId: device.deviceId || '',
        name: device.name || '',
        ipAddress: device.ipAddress || '',
        snmpCommunity: device.snmpCommunity || 'public',
        snmpPort: device.snmpPort || 161,
        snmpVersion: device.snmpVersion || '2c',
        deviceType: device.deviceType || 'router',
        location: device.location || '',
        description: device.description || '',
        pingInterval: device.pingInterval || 300,
        snmpInterval: device.snmpInterval || 600,
        isActive: device.isActive !== false
      });
    }
  }, [device]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.deviceId.trim()) {
      newErrors.deviceId = 'Device ID is required';
    } else if (!/^\d{2}$/.test(formData.deviceId)) {
      newErrors.deviceId = 'Device ID must be exactly 2 digits';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Device name is required';
    }

    if (!formData.ipAddress.trim()) {
      newErrors.ipAddress = 'IP address is required';
    } else if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(formData.ipAddress)) {
      newErrors.ipAddress = 'Please enter a valid IP address';
    }

    if (!formData.snmpCommunity.trim()) {
      newErrors.snmpCommunity = 'SNMP community is required';
    }

    if (!formData.snmpPort || formData.snmpPort < 1 || formData.snmpPort > 65535) {
      newErrors.snmpPort = 'SNMP port must be between 1 and 65535';
    }

    if (!formData.pingInterval || formData.pingInterval < 30) {
      newErrors.pingInterval = 'Ping interval must be at least 30 seconds';
    }

    if (!formData.snmpInterval || formData.snmpInterval < 60) {
      newErrors.snmpInterval = 'SNMP interval must be at least 60 seconds';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const deviceData = {
        deviceId: formData.deviceId.trim(),
        name: formData.name.trim(),
        ipAddress: formData.ipAddress.trim(),
        snmpCommunity: formData.snmpCommunity.trim(),
        snmpPort: parseInt(formData.snmpPort),
        snmpVersion: formData.snmpVersion,
        deviceType: formData.deviceType,
        location: formData.location.trim(),
        description: formData.description.trim(),
        pingInterval: parseInt(formData.pingInterval),
        snmpInterval: parseInt(formData.snmpInterval),
        isActive: formData.isActive
      };

      if (device) {
        await deviceService.updateDevice(device._id, deviceData);
        if (typeof onSuccess === 'function') {
          onSuccess();
        } else if (typeof onClose === 'function') {
          onClose();
        }
      } else {
        await deviceService.createDevice(deviceData);
        if (typeof onSuccess === 'function') {
          onSuccess();
        } else if (typeof onClose === 'function') {
          onClose();
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save device';
      setErrors(prev => ({
        ...prev,
        formError: errorMessage
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      onClick={(e) => {
        // Only close if clicking directly on the overlay, not its children
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col transform transition-all duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              {device ? 
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
                :
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              }
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {device ? 'Edit Device' : 'Add New Device'}
              </h2>
              <p className="text-sm text-white text-opacity-80">
                {device ? 'Modify device configuration' : 'Configure a new network device'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 bg-white bg-opacity-20 rounded-full p-2 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">#</span>
                  </div>
                  <input
                    type="text"
                    name="deviceId"
                    value={formData.deviceId}
                    onChange={handleChange}
                    className={`pl-7 pr-3 py-2 border ${errors.deviceId ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm w-full`}
                    placeholder="01"
                    maxLength="2"
                  />
                </div>
                {errors.deviceId && (
                  <p className="text-sm text-red-600 mt-1">{errors.deviceId}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Unique 2-digit identifier for this device</p>
              </div>
              
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`px-3 py-2 border ${errors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm w-full`}
                  placeholder="e.g., Main Router"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="deviceType"
                    value={formData.deviceType}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm w-full appearance-none pr-10 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="router">Router</option>
                    <option value="switch">Switch</option>
                    <option value="access-point">Access Point</option>
                    <option value="server">Server</option>
                    <option value="pc">PC</option>
                    <option value="bridge">Bridge</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ipAddress"
                  value={formData.ipAddress}
                  onChange={handleChange}
                  className={`px-3 py-2 border ${errors.ipAddress ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm w-full`}
                  placeholder="192.168.1.1"
                />
                {errors.ipAddress && (
                  <p className="text-sm text-red-600 mt-1">{errors.ipAddress}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm w-full focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Server Room"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="flex items-center h-10 mt-1">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm w-full focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description about this device..."
              />
            </div>
          </div>

          {/* SNMP Configuration */}
          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">SNMP Configuration</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SNMP Community <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="snmpCommunity"
                    value={formData.snmpCommunity}
                    onChange={handleChange}
                    className={`pl-10 pr-3 py-2 border ${errors.snmpCommunity ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'} rounded-md shadow-sm w-full`}
                    placeholder="public"
                  />
                </div>
                {errors.snmpCommunity && (
                  <p className="text-sm text-red-600 mt-1">{errors.snmpCommunity}</p>
                )}
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SNMP Port <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="snmpPort"
                  value={formData.snmpPort}
                  onChange={handleChange}
                  className={`px-3 py-2 border ${errors.snmpPort ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'} rounded-md shadow-sm w-full`}
                  min="1"
                  max="65535"
                />
                {errors.snmpPort && (
                  <p className="text-sm text-red-600 mt-1">{errors.snmpPort}</p>
                )}
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SNMP Version
                </label>
                <div className="relative">
                  <select
                    name="snmpVersion"
                    value={formData.snmpVersion}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm w-full appearance-none pr-10 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="1">v1</option>
                    <option value="2c">v2c</option>
                    <option value="3">v3</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monitoring Configuration */}
          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm mt-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Monitoring Configuration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ping Interval (seconds) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="pingInterval"
                    value={formData.pingInterval}
                    onChange={handleChange}
                    className={`px-3 py-2 border ${errors.pingInterval ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'} rounded-md shadow-sm w-full`}
                    min="30"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">sec</span>
                  </div>
                </div>
                {errors.pingInterval && (
                  <p className="text-sm text-red-600 mt-1">{errors.pingInterval}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  <span className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded text-xs font-medium">Min: 30 seconds</span>
                  <span className="ml-2">How often to check if the device is online</span>
                </p>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SNMP Polling Interval (seconds) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="snmpInterval"
                    value={formData.snmpInterval}
                    onChange={handleChange}
                    className={`px-3 py-2 border ${errors.snmpInterval ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'} rounded-md shadow-sm w-full`}
                    min="60"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">sec</span>
                  </div>
                </div>
                {errors.snmpInterval && (
                  <p className="text-sm text-red-600 mt-1">{errors.snmpInterval}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  <span className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded text-xs font-medium">Min: 60 seconds</span>
                  <span className="ml-2">How often to collect SNMP metrics</span>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col space-y-4 pt-6 border-t border-gray-200 mt-6">
            {errors.formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <span>{errors.formError}</span>
              </div>
            )}
            
            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="small" className="mr-2" />
                    <span>{device ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    <span>{device ? 'Update Device' : 'Create Device'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default DeviceForm;
