import React from 'react';

/**
 * Displays a badge indicating the data source status (real-time, historical, or error)
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isRealTime Whether the data source is real-time or not
 * @param {boolean} props.hasError Whether there's an error with the data source
 * @param {string} props.size The size of the badge (small, normal)
 * @param {string} props.className Additional CSS classes
 * @param {string} props.title Custom tooltip title (optional)
 * @returns {JSX.Element} A badge component
 */
const DataSourceBadge = ({ 
  isRealTime = false, 
  hasError = false, 
  size = 'normal', 
  className = '',
  title = ''
}) => {
  const sizeClasses = {
    small: 'px-1.5 py-0.5 text-xs',
    normal: 'px-2 py-0.5 text-xs',
  };
  
  const dotClasses = {
    small: 'w-1.5 h-1.5 mr-1',
    normal: 'w-2 h-2 mr-1',
  };
  
  // Error state takes precedence
  if (hasError) {
    return (
      <span 
        className={`inline-flex items-center ${sizeClasses[size]} rounded font-medium bg-red-100 text-red-800 ${className}`}
        title={title || "SNMP data collection error"}
        aria-label="SNMP data collection error"
      >
        <div className={`${dotClasses[size]} rounded-full bg-red-500`} aria-hidden="true"></div>
        SNMP Error
      </span>
    );
  }
  
  // Then real-time state
  if (isRealTime) {
    return (
      <span 
        className={`inline-flex items-center ${sizeClasses[size]} rounded font-medium bg-green-100 text-green-800 ${className}`}
        title={title || "Real-time SNMP data"}
        aria-label="Real-time SNMP data"
      >
        <div className={`${dotClasses[size]} rounded-full bg-green-500`} aria-hidden="true"></div>
        Real-time SNMP
      </span>
    );
  }
  
  // Default to historical
  return (
    <span 
      className={`inline-flex items-center ${sizeClasses[size]} rounded font-medium bg-gray-100 text-gray-800 ${className}`}
      title={title || "Historical log data"}
      aria-label="Historical log data"
    >
      <div className={`${dotClasses[size]} rounded-full bg-gray-500`} aria-hidden="true"></div>
      Historical log
    </span>
  );
};

export default DataSourceBadge;
