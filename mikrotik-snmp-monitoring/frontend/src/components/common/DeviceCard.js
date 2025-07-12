import React from 'react';
import { Link } from 'react-router-dom';
import { Server, Cpu, MemoryStick, Clock, ExternalLink, Edit, Trash2, Signal } from 'lucide-react';
import StatusBadge from './StatusBadge';

const DeviceCard = ({ device, onAction, showActions = true }) => {
  const formatUptime = (seconds) => {
    if (!seconds) return 'Unknown';
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const mins = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-md flex items-center justify-center">
              <Server className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 mb-0.5">
                <span className="inline-block bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs">
                  {device.deviceId || 'N/A'}
                </span>
                <h3 className="text-sm font-medium text-gray-900 truncate">{device.name}</h3>
              </div>
              <p className="text-xs text-gray-500 truncate">{device.ipAddress}</p>
            </div>
          </div>
          <StatusBadge status={device.status} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
          <div className="flex items-center text-gray-600">
            <Cpu className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            <span className="truncate">{device.deviceType || 'Router'}</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <Clock className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            <span>{formatLastSeen(device.lastSeen)}</span>
          </div>
          
          {device.model && (
            <div className="flex items-center text-gray-600">
              <MemoryStick className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="truncate">{device.model}</span>
            </div>
          )}
          
          {device.uptime && (
            <div className="flex items-center text-gray-600">
              <span className="mr-1.5">⏱️</span>
              <span>{formatUptime(device.uptime)}</span>
            </div>
          )}
        </div>
        
        {device.tags && device.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {device.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-100 p-3 bg-gray-50">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <Link
            to={`/devices/${device._id}`}
            className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-medium rounded bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            title="View device details"
          >
            <ExternalLink className="w-3 h-3 mr-1.5" />
            <span>Details</span>
          </Link>
          
          {showActions && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onAction && onAction('ping', device)}
                className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                title="Ping device"
              >
                <Signal className="w-3 h-3" />
                <span className="hidden xs:inline ml-1.5">Ping</span>
              </button>
              
              <button
                onClick={() => onAction && onAction('edit', device)}
                className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                title="Edit device"
              >
                <Edit className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => onAction && onAction('delete', device)}
                className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                title="Delete device"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceCard;
