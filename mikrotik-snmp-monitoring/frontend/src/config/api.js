/**
 * API Configuration for SNMP Monitoring System
 * Centralized configuration for API endpoints, timeouts, and retry settings
 */

// Base API configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  DEVICE_METRICS: 10000,      // 10 seconds
  DEVICE_STATUS: 5000,        // 5 seconds
  DEVICE_LIST: 30000,         // 30 seconds
  MONITORING_LOGS: 15000,     // 15 seconds
  NETWORK_INTERFACES: 20000,  // 20 seconds
};

// Retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BACKOFF_MULTIPLIER: 2000,   // Base delay in ms (2s, 4s, 8s)
  TIMEOUT: 30000,             // 30 seconds
};

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
  },
  
  // Devices
  DEVICES: {
    LIST: '/api/devices',
    DETAIL: (deviceId) => `/api/devices/${deviceId}`,
    CREATE: '/api/devices',
    UPDATE: (deviceId) => `/api/devices/${deviceId}`,
    DELETE: (deviceId) => `/api/devices/${deviceId}`,
    STATS: (deviceId) => `/api/devices/${deviceId}/stats`,
    TEST_CONNECTION: '/api/devices/test-connection',
    PING: (deviceId) => `/api/devices/${deviceId}/ping`,
  },
  
  // SNMP Exporter
  SNMP_EXPORTER: {
    METRICS: (deviceId) => `/api/snmp-exporter/metrics/${deviceId}`,
    STATUS: (deviceId) => `/api/snmp-exporter/status/${deviceId}`,
    ACTIVE: '/api/snmp-exporter/active',
    START: (deviceId) => `/api/snmp-exporter/start/${deviceId}`,
    STOP: (deviceId) => `/api/snmp-exporter/stop/${deviceId}`,
  },
  
  // Monitoring
  MONITORING: {
    DASHBOARD: '/api/monitoring/dashboard',
    LOGS: '/api/monitoring/logs',
    DEVICE_LOGS: (deviceId) => `/api/monitoring/device/${deviceId}/logs`,
    DEVICE_METRICS: (deviceId) => `/api/monitoring/device/${deviceId}/metrics`,
    DEVICE_MONITORING: (deviceId) => `/api/monitoring/device/${deviceId}`,
    DEVICE_REALTIME: (deviceId) => `/api/monitoring/device/${deviceId}/real-time-metrics`,
    TEST_DEVICE: (deviceId) => `/api/monitoring/test/${deviceId}`,
    REPORTS: '/api/monitoring/reports'
  },
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timeout. The server is taking too long to respond.',
  UNAUTHORIZED: 'You are not authorized to access this resource.',
  FORBIDDEN: 'Access denied. You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Internal server error. Please try again later.',
  DEVICE_UNREACHABLE: 'Device is unreachable. Please check device connectivity.',
  INVALID_CREDENTIALS: 'Invalid username or password.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  DEVICE_CREATED: 'Device created successfully',
  DEVICE_UPDATED: 'Device updated successfully',
  DEVICE_DELETED: 'Device deleted successfully',
  MONITORING_STARTED: 'Monitoring started successfully',
  MONITORING_STOPPED: 'Monitoring stopped successfully',
  DATA_EXPORTED: 'Data exported successfully',
};

// Default request configuration
export const DEFAULT_REQUEST_CONFIG = {
  timeout: RETRY_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  },
};

// Axios interceptor configuration
export const INTERCEPTOR_CONFIG = {
  REQUEST: {
    // Add auth token to requests
    addAuthToken: true,
    // Log requests in development
    logRequests: process.env.NODE_ENV === 'development',
  },
  RESPONSE: {
    // Handle common error responses
    handleErrors: true,
    // Log responses in development
    logResponses: process.env.NODE_ENV === 'development',
  },
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
};

// Chart and visualization settings
export const CHART_CONFIG = {
  COLORS: {
    PRIMARY: '#3B82F6',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    DANGER: '#EF4444',
    INFO: '#6366F1',
  },
  REFRESH_RATE: 5000, // 5 seconds for real-time charts
  MAX_DATA_POINTS: 100,
};

// Device status constants
export const DEVICE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  UNKNOWN: 'unknown',
  MONITORING: 'monitoring',
  ERROR: 'error',
};

// SNMP specific configuration
export const SNMP_CONFIG = {
  DEFAULT_PORT: 161,
  DEFAULT_COMMUNITY: 'public',
  DEFAULT_VERSION: '2c',
  TIMEOUT: 5000,
  RETRIES: 3,
};

export default {
  API_BASE_URL,
  REFRESH_INTERVALS,
  RETRY_CONFIG,
  ENDPOINTS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DEFAULT_REQUEST_CONFIG,
  INTERCEPTOR_CONFIG,
  PAGINATION,
  CHART_CONFIG,
  DEVICE_STATUS,
  SNMP_CONFIG,
};