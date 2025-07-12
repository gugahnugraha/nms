import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const StatusBadge = ({ status, size = 'default', showIcon = true }) => {
  const statusConfig = {
    online: {
      label: 'Online',
      icon: Wifi,
      className: 'bg-green-100 text-green-800'
    },
    offline: {
      label: 'Offline',
      icon: WifiOff,
      className: 'bg-red-100 text-red-800'
    },
    unknown: {
      label: 'Unknown',
      icon: AlertCircle,
      className: 'bg-gray-100 text-gray-800'
    }
  };

  const sizeClasses = {
    small: 'text-xs px-1.5 py-0.5',
    default: 'text-xs px-2 py-0.5',
    large: 'text-sm px-2.5 py-1'
  };

  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;

  return (
    <span className={clsx(
      'inline-flex items-center rounded-full font-medium',
      config.className,
      sizeClasses[size]
    )}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </span>
  );
};

export default StatusBadge;
