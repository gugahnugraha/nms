import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import useMonitoring from '../hooks/useMonitoring';

// Create the context
const NotificationContext = createContext();

// Create a provider component
export const NotificationProvider = ({ children }) => {
  const [deviceStates, setDeviceStates] = useState({});
  const [initialized, setInitialized] = useState(false);
  const { dashboardData } = useMonitoring(true, 15000); // Poll every 15 seconds

  // Track device state changes
  useEffect(() => {
    if (!dashboardData?.devices) return;

    // First time initialization
    if (!initialized && dashboardData.devices.length > 0) {
      const initialStates = {};
      dashboardData.devices.forEach(device => {
        initialStates[device._id] = device.status;
      });
      setDeviceStates(initialStates);
      setInitialized(true);
      return;
    }

    // Check for state changes after initialization
    if (initialized) {
      dashboardData.devices.forEach(device => {
        const prevStatus = deviceStates[device._id];
        
        // If this is a new device or status has changed
        if (prevStatus && prevStatus !== device.status) {
          // Status changed, show toast notification
          if (device.status === 'offline') {
            toast.error(
              `🚨 Device ${device.name} is now offline!`, 
              { 
                duration: 5000,
                icon: '🚨',
                id: `device-down-${device._id}`
              }
            );
          } else if (device.status === 'online' && prevStatus === 'offline') {
            toast.success(
              `✅ Device ${device.name} is back online!`,
              { 
                duration: 5000,
                icon: '✅',
                id: `device-up-${device._id}`
              }
            );
          }
        }
        
        // Update the state
        setDeviceStates(prev => ({
          ...prev,
          [device._id]: device.status
        }));
      });
    }
  }, [dashboardData, initialized, deviceStates]);

  // Count current alerts (offline devices)
  const getAlertCount = () => {
    if (!dashboardData?.devices) return 0;
    return dashboardData.devices.filter(device => device.status === 'offline').length;
  };

  return (
    <NotificationContext.Provider
      value={{
        alertCount: getAlertCount(),
        deviceStates
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Create a hook to use the notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
