import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const DeviceAlerts = ({ devices }) => {
  // Filter to only show offline devices
  const offlineDevices = devices.filter(device => device.status === 'offline');
  
  if (offlineDevices.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-red-50 border-l-4 border-red-500 rounded-md p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {offlineDevices.length === 1 
              ? '1 device is currently offline' 
              : `${offlineDevices.length} devices are currently offline`}
          </h3>
          <div className="mt-2 space-y-1">
            {offlineDevices.slice(0, 3).map(device => (
              <div key={device._id} className="flex items-center justify-between text-sm text-red-700">
                <div className="font-medium">{device.name}</div>
                <Link to={`/devices/${device._id}`} className="inline-flex items-center text-red-700 hover:text-red-900">
                  <span className="text-xs">View</span>
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </div>
            ))}
            
            {offlineDevices.length > 3 && (
              <div className="text-xs text-red-700 italic">
                And {offlineDevices.length - 3} more devices...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceAlerts;
