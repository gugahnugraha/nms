import PropTypes from 'prop-types';

/**
 * Common PropTypes definitions for the SNMP Monitoring System
 * This file centralizes type definitions to ensure consistency across components
 */

// Device related PropTypes
export const DevicePropTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string.isRequired,
  ip_address: PropTypes.string.isRequired,
  snmp_community: PropTypes.string,
  snmp_version: PropTypes.oneOf(['1', '2c', '3']),
  snmp_port: PropTypes.number,
  location: PropTypes.string,
  description: PropTypes.string,
  status: PropTypes.oneOf(['online', 'offline', 'unknown']),
  last_seen: PropTypes.string,
  created_at: PropTypes.string,
  updated_at: PropTypes.string,
};

export const DeviceShape = PropTypes.shape(DevicePropTypes);

// Metrics related PropTypes
export const SystemMetricsPropTypes = {
  sysName: PropTypes.string,
  sysDescr: PropTypes.string,
  sysContact: PropTypes.string,
  sysLocation: PropTypes.string,
  sysUpTime: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  sysObjectID: PropTypes.string,
};

export const InterfaceMetricsPropTypes = {
  ifIndex: PropTypes.number,
  ifDescr: PropTypes.string,
  ifType: PropTypes.number,
  ifMtu: PropTypes.number,
  ifSpeed: PropTypes.number,
  ifPhysAddress: PropTypes.string,
  ifAdminStatus: PropTypes.number,
  ifOperStatus: PropTypes.number,
  ifLastChange: PropTypes.number,
  ifInOctets: PropTypes.number,
  ifInUcastPkts: PropTypes.number,
  ifInNUcastPkts: PropTypes.number,
  ifInDiscards: PropTypes.number,
  ifInErrors: PropTypes.number,
  ifInUnknownProtos: PropTypes.number,
  ifOutOctets: PropTypes.number,
  ifOutUcastPkts: PropTypes.number,
  ifOutNUcastPkts: PropTypes.number,
  ifOutDiscards: PropTypes.number,
  ifOutErrors: PropTypes.number,
};

export const StorageMetricsPropTypes = {
  storageIndex: PropTypes.number,
  storageType: PropTypes.string,
  storageDescr: PropTypes.string,
  storageAllocationUnits: PropTypes.number,
  storageSize: PropTypes.number,
  storageUsed: PropTypes.number,
  storageAllocationFailures: PropTypes.number,
};

export const MetricsPropTypes = {
  system: PropTypes.shape(SystemMetricsPropTypes),
  interfaces: PropTypes.arrayOf(PropTypes.shape(InterfaceMetricsPropTypes)),
  storage: PropTypes.arrayOf(PropTypes.shape(StorageMetricsPropTypes)),
};

export const MetricsShape = PropTypes.shape(MetricsPropTypes);

// API Response PropTypes
export const ApiResponsePropTypes = {
  success: PropTypes.bool.isRequired,
  message: PropTypes.string,
  data: PropTypes.any,
  error: PropTypes.string,
  timestamp: PropTypes.string,
};

export const ApiResponseShape = PropTypes.shape(ApiResponsePropTypes);

// Pagination PropTypes
export const PaginationPropTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  hasPrevPage: PropTypes.bool.isRequired,
};

export const PaginationShape = PropTypes.shape(PaginationPropTypes);

// Chart Data PropTypes
export const ChartDataPointPropTypes = {
  timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  value: PropTypes.number.isRequired,
  label: PropTypes.string,
};

export const ChartDataShape = PropTypes.arrayOf(PropTypes.shape(ChartDataPointPropTypes));

// Form PropTypes
export const FormFieldPropTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['text', 'email', 'password', 'number', 'select', 'textarea']).isRequired,
  value: PropTypes.any,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
  })),
  validation: PropTypes.shape({
    required: PropTypes.bool,
    minLength: PropTypes.number,
    maxLength: PropTypes.number,
    pattern: PropTypes.instanceOf(RegExp),
    custom: PropTypes.func,
  }),
};

export const FormFieldShape = PropTypes.shape(FormFieldPropTypes);

// Status PropTypes
export const StatusPropTypes = {
  status: PropTypes.oneOf(['success', 'error', 'warning', 'info', 'loading']).isRequired,
  message: PropTypes.string,
  details: PropTypes.string,
  timestamp: PropTypes.string,
};

export const StatusShape = PropTypes.shape(StatusPropTypes);

// User PropTypes
export const UserPropTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  username: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  role: PropTypes.oneOf(['admin', 'user', 'viewer']).isRequired,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  avatar: PropTypes.string,
  isActive: PropTypes.bool,
  lastLogin: PropTypes.string,
  createdAt: PropTypes.string,
  updatedAt: PropTypes.string,
};

export const UserShape = PropTypes.shape(UserPropTypes);

// Common component PropTypes
export const CommonComponentPropTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
  children: PropTypes.node,
  id: PropTypes.string,
  testId: PropTypes.string,
  ariaLabel: PropTypes.string,
  ariaDescribedBy: PropTypes.string,
  role: PropTypes.string,
  tabIndex: PropTypes.number,
};

// Event handler PropTypes
export const EventHandlerPropTypes = {
  onClick: PropTypes.func,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  onKeyDown: PropTypes.func,
  onKeyUp: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
};

// Loading and Error PropTypes
export const LoadingPropTypes = {
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  retry: PropTypes.func,
};

// Theme PropTypes
export const ThemePropTypes = {
  theme: PropTypes.oneOf(['light', 'dark', 'auto']),
  primaryColor: PropTypes.string,
  secondaryColor: PropTypes.string,
};

// Size PropTypes
export const SizePropTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
};

// Variant PropTypes
export const VariantPropTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'error', 'info']),
};

export default {
  DevicePropTypes,
  DeviceShape,
  SystemMetricsPropTypes,
  InterfaceMetricsPropTypes,
  StorageMetricsPropTypes,
  MetricsPropTypes,
  MetricsShape,
  ApiResponsePropTypes,
  ApiResponseShape,
  PaginationPropTypes,
  PaginationShape,
  ChartDataPointPropTypes,
  ChartDataShape,
  FormFieldPropTypes,
  FormFieldShape,
  StatusPropTypes,
  StatusShape,
  UserPropTypes,
  UserShape,
  CommonComponentPropTypes,
  EventHandlerPropTypes,
  LoadingPropTypes,
  ThemePropTypes,
  SizePropTypes,
  VariantPropTypes,
};