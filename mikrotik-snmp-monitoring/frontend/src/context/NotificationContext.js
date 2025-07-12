import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import useMonitoring from '../hooks/useMonitoring';

// Create the context
const NotificationContext = createContext();

// Create a provider component
export const NotificationProvider = ({ children }) => {
  const deviceStatesRef = useRef({});
  const [deviceStates, setDeviceStates] = useState({});
  const { dashboardData } = useMonitoring(true, 15000); // Poll every 15 seconds

  // Use a single effect to track device states and show notifications
  useEffect(() => {
    if (!dashboardData?.devices || dashboardData.devices.length === 0) return;

    const newStates = {};
    dashboardData.devices.forEach(device => {
      // Get the previous status from the ref to avoid dependency issues
      const prevStatus = deviceStatesRef.current[device._id];
      
      // If we have a previous status and it's different, show notification
      if (prevStatus && prevStatus !== device.status) {
        // Show toast notification for status change
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
      
      // Store current status in new state object
      newStates[device._id] = device.status;
    });
    
    // Update ref for next comparison
    deviceStatesRef.current = newStates;
    // Update state for context consumers
    setDeviceStates(newStates);
  }, [dashboardData]);

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
