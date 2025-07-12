import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const StatusBadge = ({ status, size = 'default', showIcon = true }) => {
  const statusConfig = {
    online: {
      label: 'Online',
      icon: Wifi,
      className: 'badge-success'
    },
    offline: {
      label: 'Offline',
      icon: WifiOff,
      className: 'badge-danger'
    },
    unknown: {
      label: 'Unknown',
      icon: AlertCircle,
      className: 'badge-info'
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
      'badge',
      config.className,
      sizeClasses[size]
    )}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </span>
  );
};

export default StatusBadge;
