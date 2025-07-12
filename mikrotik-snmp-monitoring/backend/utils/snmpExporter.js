/**
 * SNMP Exporter - Collects and exports SNMP metrics in a standardized format
 * Inspired by Prometheus SNMP exporter
 */

const snmp = require('net-snmp');
const { MIKROTIK_OIDS } = require('./snmpUtils');

// Default collection intervals (in milliseconds)
const DEFAULT_INTERVALS = {
  fast: 60 * 1000,       // 1 minute
  standard: 5 * 60 * 1000,   // 5 minutes
  slow: 15 * 60 * 1000    // 15 minutes
};

// Metric definitions with OIDs and processing functions
const METRICS = {
  // System metrics - collected every standard interval
  system: {
    interval: 'standard',
    metrics: [
      {
        name: 'sysDescr',
        oid: MIKROTIK_OIDS.sysDescr,
        type: 'string',
        help: 'System description'
      },
      {
        name: 'sysUpTime', 
        oid: MIKROTIK_OIDS.sysUpTime,
        type: 'gauge',
        help: 'System uptime in timeticks (1/100s)',
        process: (value) => value / 100 // Convert to seconds
      },
      {
        name: 'sysName',
        oid: MIKROTIK_OIDS.sysName,
        type: 'string',
        help: 'System name'
      },
      {
        name: 'sysLocation',
        oid: MIKROTIK_OIDS.sysLocation,
        type: 'string',
        help: 'System location'
      }
    ]
  },
  
  // Resource metrics - collected every fast interval
  resources: {
    interval: 'fast',
    metrics: [
      {
        name: 'cpuUsage',
        oid: MIKROTIK_OIDS.hrProcessorLoad,
        type: 'gauge',
        help: 'CPU usage percentage',
        process: (value) => parseInt(value)
      },
      {
        name: 'memorySize',
        oid: MIKROTIK_OIDS.hrMemorySize,
        type: 'gauge',
        help: 'Total memory size in KB',
        process: (value) => parseInt(value)
      }
    ]
  },
  
  // Storage metrics - collected every fast interval
  storage: {
    interval: 'fast',
    isTable: true,
    baseOid: '1.3.6.1.2.1.25.2.3.1',
    indexColumn: 1,
    columns: [
      { 
        name: 'storageDescr', 
        column: 3, 
        type: 'string', 
        help: 'Storage description' 
      },
      { 
        name: 'storageAllocationUnits', 
        column: 4, 
        type: 'gauge', 
        help: 'Storage allocation units' 
      },
      { 
        name: 'storageSize', 
        column: 5, 
        type: 'gauge', 
        help: 'Storage size in allocation units' 
      },
      { 
        name: 'storageUsed', 
        column: 6, 
        type: 'gauge', 
        help: 'Storage used in allocation units' 
      }
    ],
    calculate: (row) => {
      if (row.storageSize > 0) {
        row.storageUsagePercent = (row.storageUsed / row.storageSize) * 100;
      } else {
        row.storageUsagePercent = 0;
      }
      return row;
    },
    filter: (row) => {
      try {
        return row.storageDescr && 
          (typeof row.storageDescr === 'string') &&
          (row.storageDescr.includes('disk') || 
           row.storageDescr.includes('flash') || 
           row.storageDescr.includes('storage') || 
           row.storageDescr.includes('drive'));
      } catch (error) {
        console.error(`Error in storage filter: ${error.message}`);
        return false;
      }
    }
  },
  
  // Temperature metrics - collected every standard interval
  temperature: {
    interval: 'standard',
    metrics: [
      {
        name: 'boardTemperature',
        oid: MIKROTIK_OIDS.mtxrHlTemperature,
        type: 'gauge',
        help: 'Board temperature in Celsius',
        process: (value) => value ? value / 10 : null
      },
      {
        name: 'cpuTemperature',
        oid: MIKROTIK_OIDS.mtxrHlProcessorTemperature,
        type: 'gauge',
        help: 'CPU temperature in Celsius',
        process: (value) => value ? value / 10 : null
      }
    ]
  },
  
  // Interface metrics - collected every fast interval
  interfaces: {
    interval: 'fast',
    isTable: true,
    baseOid: '1.3.6.1.2.1.2.2.1',
    indexColumn: 1,
    columns: [
      { 
        name: 'ifDescr', 
        column: 2, 
        type: 'string', 
        help: 'Interface description' 
      },
      { 
        name: 'ifType', 
        column: 3, 
        type: 'gauge', 
        help: 'Interface type' 
      },
      { 
        name: 'ifMtu', 
        column: 4, 
        type: 'gauge', 
        help: 'Interface MTU' 
      },
      { 
        name: 'ifSpeed', 
        column: 5, 
        type: 'gauge', 
        help: 'Interface speed in bits per second' 
      },
      { 
        name: 'ifOperStatus', 
        column: 8, 
        type: 'gauge', 
        help: 'Interface operational status (1=up, 2=down)' 
      },
      { 
        name: 'ifInOctets', 
        column: 10, 
        type: 'counter', 
        help: 'Incoming bytes' 
      },
      { 
        name: 'ifOutOctets', 
        column: 16, 
        type: 'counter', 
        help: 'Outgoing bytes' 
      },
      { 
        name: 'ifInErrors', 
        column: 14, 
        type: 'counter', 
        help: 'Incoming errors' 
      },
      { 
        name: 'ifOutErrors', 
        column: 20, 
        type: 'counter', 
        help: 'Outgoing errors' 
      }
    ],
    filter: (row) => row.ifOperStatus === 1 // Only include active interfaces
  }
};

/**
 * Creates an SNMP session for a device
 * @param {Object} device - The device configuration
 * @returns {Object} - SNMP session
 */
const createSession = (device) => {
  try {
    const options = {
      port: device.snmpPort || 161,
      retries: 1,
      timeout: device.snmpTimeout || 5000,
      version: device.snmpVersion === '1' ? snmp.Version1 : snmp.Version2c
    };
    
    return snmp.createSession(device.ipAddress, device.snmpCommunity, options);
  } catch (error) {
    console.error(`Error creating SNMP session for ${device.name}: ${error.message}`);
    throw error;
  }
};

/**
 * Collects scalar metrics from a device
 * @param {Object} session - SNMP session
 * @param {Array} metrics - Metrics configuration
 * @returns {Promise<Object>} - Collected metrics
 */
const collectScalarMetrics = async (session, metrics) => {
  return new Promise((resolve, reject) => {
    const oids = metrics.map(metric => metric.oid);
    
    session.get(oids, (error, varbinds) => {
      if (error) {
        reject(error);
        return;
      }
      
      const result = {};
      
      varbinds.forEach((vb, index) => {
        const metric = metrics[index];
        
        if (snmp.isVarbindError(vb)) {
          console.error(`Error collecting ${metric.name}: ${snmp.varbindError(vb)}`);
          result[metric.name] = null;
        } else {
          let value = vb.value;
          
          // Apply processing function if specified
          if (metric.process && typeof metric.process === 'function') {
            try {
              value = metric.process(value);
            } catch (e) {
              console.error(`Error processing ${metric.name}: ${e.message}`);
              value = null;
            }
          }
          
          // Handle non-serializable data types
          if (value instanceof Buffer) {
            value = value.toString('hex');
          } else if (typeof value === 'bigint') {
            value = Number(value);
          }
          
          result[metric.name] = value;
        }
      });
      
      resolve(result);
    });
  });
};

/**
 * Collects table metrics from a device
 * @param {Object} session - SNMP session
 * @param {Object} tableConfig - Table configuration
 * @returns {Promise<Array>} - Collected table rows
 */
const collectTableMetrics = async (session, tableConfig) => {
  return new Promise((resolve, reject) => {
    const baseOid = tableConfig.baseOid;
    const tableData = [];
    const rowsByIndex = {};
    
    // Walk the table
    session.subtree(baseOid, (varbinds) => {
      for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) {
          console.error(`Error in table walk: ${snmp.varbindError(vb)}`);
          continue;
        }
        
        // Parse OID to get the column and index
        const oidParts = vb.oid.split('.');
        const column = parseInt(oidParts[oidParts.length - 2]);
        const index = oidParts[oidParts.length - 1];
        
        // Initialize row if it doesn't exist
        if (!rowsByIndex[index]) {
          rowsByIndex[index] = { index };
        }
        
        // Find the corresponding column definition
        const columnDef = tableConfig.columns.find(col => col.column === column);
        if (columnDef) {
          let value = vb.value;
          
          // Apply processing function if specified
          if (columnDef.process && typeof columnDef.process === 'function') {
            try {
              value = columnDef.process(value);
            } catch (e) {
              console.error(`Error processing ${columnDef.name} for index ${index}: ${e.message}`);
              value = null;
            }
          }
          
          // Handle non-serializable data types
          if (value instanceof Buffer) {
            value = value.toString('hex');
          } else if (typeof value === 'bigint') {
            value = Number(value);
          }
          
          rowsByIndex[index][columnDef.name] = value;
        }
      }
    }, (error) => {
      if (error) {
        reject(error);
        return;
      }
      
      // Convert object to array and apply filters and calculations
      for (const index in rowsByIndex) {
        const row = rowsByIndex[index];
        
        // Apply calculations
        if (tableConfig.calculate && typeof tableConfig.calculate === 'function') {
          try {
            tableConfig.calculate(row);
          } catch (e) {
            console.error(`Error calculating values for index ${index}: ${e.message}`);
          }
        }
        
        // Apply filter if specified
        try {
          if (!tableConfig.filter || tableConfig.filter(row)) {
            tableData.push(row);
          }
        } catch (error) {
          console.error(`Error applying filter for row ${index}: ${error.message}`);
          // Include the row anyway in case of filter error
          tableData.push(row);
        }
      }

      // Sort table data by index to ensure consistent order
      tableData.sort((a, b) => a.index - b.index);
      
      resolve(tableData);
    });
  });
};

/**
 * Collects all metrics from a device
 * @param {Object} device - Device configuration
 * @param {Array} metricGroups - Metric groups to collect
 * @returns {Promise<Object>} - Collected metrics
 */
const collectMetrics = async (device, metricGroups = Object.keys(METRICS)) => {
  console.log(`Collecting metrics for device ${device.name} (${device.ipAddress})`);
  const session = createSession(device);
  const result = {
    deviceId: device._id,
    deviceName: device.name,
    ipAddress: device.ipAddress,
    timestamp: new Date(),
    metrics: {},
    summary: {
      cpuUsage: null,
      memoryUsage: null,
      diskUsage: null,
      temperature: null,
      uptime: null,
      status: 'ok',
      errors: []
    }
  };
  
  try {
    // Process each metric group
    for (const groupName of metricGroups) {
      const group = METRICS[groupName];
      
      if (!group) {
        console.warn(`Unknown metric group: ${groupName}`);
        continue;
      }
      
      console.log(`Collecting ${groupName} metrics for ${device.name}`);
      
      if (group.isTable) {
        // Table metrics
        try {
          const tableData = await collectTableMetrics(session, group);
          result.metrics[groupName] = tableData;
        } catch (error) {
          console.error(`Error collecting ${groupName} table metrics: ${error.message}`);
          result.metrics[groupName] = [];
          result.summary.errors.push(`Failed to collect ${groupName} metrics: ${error.message}`);
          result.summary.status = 'partial';
        }
      } else {
        // Scalar metrics
        try {
          const scalarData = await collectScalarMetrics(session, group.metrics);
          result.metrics[groupName] = scalarData;
        } catch (error) {
          console.error(`Error collecting ${groupName} scalar metrics: ${error.message}`);
          result.metrics[groupName] = {};
          result.summary.errors.push(`Failed to collect ${groupName} metrics: ${error.message}`);
          result.summary.status = 'partial';
        }
      }
    }
    
    // Process the results to create a simplified view
    // Update summary values based on collected metrics
    result.summary.cpuUsage = result.metrics.resources?.cpuUsage ?? null;
    result.summary.temperature = result.metrics.temperature?.boardTemperature ?? 
                                result.metrics.temperature?.cpuTemperature ?? null;
    result.summary.uptime = result.metrics.system?.sysUpTime ?? null;
    
    // Calculate memory usage if we have both memorySize and storage table
    if (result.metrics.resources && result.metrics.resources.memorySize) {
      try {
        // First check if storage metrics exist
        if (!result.metrics.storage || !Array.isArray(result.metrics.storage) || result.metrics.storage.length === 0) {
          console.log(`No storage metrics found for device ${device.name}`);
        } else {
          // Safely find memory storage
          const memoryStorage = result.metrics.storage.find(storage => {
            // Extra safety checks
            if (!storage) return false;
            if (!storage.storageDescr) return false;
            if (typeof storage.storageDescr !== 'string') {
              console.log(`Non-string storageDescr found: ${typeof storage.storageDescr}`);
              return false;
            }
            
            const lowerDesc = storage.storageDescr.toLowerCase();
            return lowerDesc.includes('memory') || lowerDesc.includes('ram');
          });
          
          if (memoryStorage && typeof memoryStorage.storageUsagePercent === 'number') {
            result.summary.memoryUsage = memoryStorage.storageUsagePercent;
          } else {
            console.log(`No valid memory storage found for device ${device.name}`);
          }
        }
      } catch (error) {
        console.error(`Error calculating memory usage: ${error.message}`);
        result.summary.errors.push(`Failed to calculate memory usage: ${error.message}`);
      }
    }
    
    // Find disk storage
    try {
      // First check if storage metrics exist
      if (!result.metrics.storage || !Array.isArray(result.metrics.storage) || result.metrics.storage.length === 0) {
        console.log(`No storage metrics found for device ${device.name}`);
      } else {
        // Safely find disk storage
        const diskStorage = result.metrics.storage.find(storage => {
          // Extra safety checks
          if (!storage) return false;
          if (!storage.storageDescr) return false;
          if (typeof storage.storageDescr !== 'string') {
            console.log(`Non-string storageDescr found: ${typeof storage.storageDescr}`);
            return false;
          }
          
          const lowerDesc = storage.storageDescr.toLowerCase();
          return lowerDesc.includes('disk') || 
                 lowerDesc.includes('flash') ||
                 lowerDesc.includes('drive');
        });
        
        if (diskStorage && typeof diskStorage.storageUsagePercent === 'number') {
          result.summary.diskUsage = diskStorage.storageUsagePercent;
        } else {
          console.log(`No valid disk storage found for device ${device.name}`);
        }
      }
    } catch (error) {
      console.error(`Error calculating disk usage: ${error.message}`);
      result.summary.errors.push(`Failed to calculate disk usage: ${error.message}`);
    }
    
    return result;
  } finally {
    session.close();
  }
};

/**
 * Starts collecting metrics from a device at specified intervals
 * @param {Object} device - Device configuration
 * @param {Function} callback - Function to call with collected metrics
 * @returns {Object} - Control object with start/stop methods
 */
const startCollector = (device, callback) => {
  // Define variables at the beginning
  const timers = {};
  const collectors = {};
  
  // Define functions for start and stop
  const start = () => {
    console.log(`Starting metric collection for device ${device.name}`);
    
    for (const intervalType in collectors) {
      if (collectors[intervalType].length === 0) continue;
      
      const interval = DEFAULT_INTERVALS[intervalType];
      const groups = collectors[intervalType];
      
      console.log(`Setting up ${intervalType} collector (${interval}ms) for ${device.name}: ${groups.join(', ')}`);
      
      // Function to safely collect metrics and handle errors
      const safeCollect = async () => {
        try {
          const result = await collectMetrics(device, groups);
          console.log(`Collection completed for ${device.name} (${intervalType})`);
          
          // Check if there were errors
          if (result.summary.errors.length > 0) {
            console.warn(`Collection completed with ${result.summary.errors.length} errors for ${device.name}`);
          }
          
          callback(null, result);
        } catch (error) {
          console.error(`Error in collection for ${device.name} (${intervalType}): ${error.message}`);
          callback(error);
        }
      };
      
      // Immediately collect metrics when started
      safeCollect();
      
      // Schedule periodic collection
      timers[intervalType] = setInterval(safeCollect, interval);
    }
  };
  
  const stop = () => {
    console.log(`Stopping metric collection for device ${device.name}`);
    
    for (const intervalType in timers) {
      if (timers[intervalType]) {
        clearInterval(timers[intervalType]);
        timers[intervalType] = null;
      }
    }
  };
  
  // Create collectors for each interval type
  for (const intervalType in DEFAULT_INTERVALS) {
    collectors[intervalType] = [];
    
    // Group metrics by interval
    for (const [groupName, group] of Object.entries(METRICS)) {
      if (group.interval === intervalType) {
        collectors[intervalType].push(groupName);
      }
    }
  }
  
  // Return the collector object with start and stop methods
  const collectorObj = {
    start,
    stop
  };
  
  return collectorObj;
};

module.exports = {
  METRICS,
  DEFAULT_INTERVALS,
  collectMetrics,
  startCollector
};
