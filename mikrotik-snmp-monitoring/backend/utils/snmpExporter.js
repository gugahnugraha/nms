/**
 * SNMP Exporter - Collects and exports SNMP metrics in a standardized format
 * Inspired by Prometheus SNMP exporter but adapted for MERN application
 * 
 * Enhanced implementation for integration with React frontend and MongoDB
 * 
 * Features:
 * - Basic SNMP operations (createSession, get, walk)
 * - MikroTik-specific data collection (system info, resources, interfaces, storage)
 * - Scheduled metrics collection with configurable intervals
 * - Real-time metrics for frontend dashboards
 * - Performance optimized for React integration
 */

const snmp = require('net-snmp');
const EventEmitter = require('events');
const { pingHost } = require('./pingUtils');

// Common SNMP OIDs for MikroTik devices
const MIKROTIK_OIDS = {
  // System Information
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  sysLocation: '1.3.6.1.2.1.1.6.0',
  
  // CPU Usage
  hrProcessorLoad: '1.3.6.1.2.1.25.3.3.1.2.1',
  
  // Memory Usage
  hrMemorySize: '1.3.6.1.2.1.25.2.2.0',
  hrStorageUsed: '1.3.6.1.2.1.25.2.3.1.6',
  hrStorageSize: '1.3.6.1.2.1.25.2.3.1.5',
  
  // Interface Statistics
  ifNumber: '1.3.6.1.2.1.2.1.0',
  ifDescr: '1.3.6.1.2.1.2.2.1.2',
  ifInOctets: '1.3.6.1.2.1.2.2.1.10',
  ifOutOctets: '1.3.6.1.2.1.2.2.1.16',
  ifInUcastPkts: '1.3.6.1.2.1.2.2.1.11',
  ifOutUcastPkts: '1.3.6.1.2.1.2.2.1.17',
  ifInErrors: '1.3.6.1.2.1.2.2.1.14',
  ifOutErrors: '1.3.6.1.2.1.2.2.1.20',
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
  
  // MikroTik Specific
  mtxrHlTemperature: '1.3.6.1.4.1.14988.1.1.3.10.0',
  mtxrHlVoltage: '1.3.6.1.4.1.14988.1.1.3.8.0',
  mtxrHlCurrent: '1.3.6.1.4.1.14988.1.1.3.9.0',
  mtxrHlProcessorTemperature: '1.3.6.1.4.1.14988.1.1.3.11.0'
};

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
    
    const session = snmp.createSession(device.ipAddress, device.snmpCommunity, options);
    
    // Test session connectivity immediately
    return new Promise((resolve, reject) => {
      session.get([MIKROTIK_OIDS.sysDescr], (error) => {
        if (error) {
          session.close();
          reject(new Error(`SNMP session test failed: ${error.message}`));
        } else {
          resolve(session);
        }
      });
    });
  } catch (error) {
    console.error(`Error creating SNMP session for ${device.name}: ${error.message}`);
    throw new Error(`Failed to initialize SNMP session: ${error.message}`);
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
          
          // Handle Buffer and BigInt types
          if (value instanceof Buffer) {
            value = value.toString();
          } else if (typeof value === 'bigint') {
            value = Number(value);
          }
          
          // Apply processing function if defined
          if (metric.process && typeof metric.process === 'function') {
            try {
              value = metric.process(value);
            } catch (err) {
              console.error(`Error processing ${metric.name}: ${err.message}`);
            }
          }
          
          result[metric.name] = value;
        }
      });
      
      resolve(result);
    });
  });
};

/**
 * Collect SNMP walk data (tables)
 * @param {Object} session - SNMP session
 * @param {String} baseOid - Base OID for table
 * @returns {Promise<Object>} - Collected table data
 */
const collectTableData = async (session, baseOid) => {
  return new Promise((resolve, reject) => {
    const results = {};
    
    session.subtree(baseOid, (varbinds) => {
      for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) {
          console.error(`Error in table walk: ${snmp.varbindError(vb)}`);
          continue;
        }
        
        let value = vb.value;
        
        // Handle Buffer and BigInt types
        if (value instanceof Buffer) {
          value = value.toString();
        } else if (typeof value === 'bigint') {
          value = Number(value);
        }
        
        results[vb.oid] = value;
      }
    }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

/**
 * Process a collected SNMP table into rows
 * @param {Object} tableData - Raw table data from collectTableData
 * @param {Object} tableConfig - Table configuration
 * @returns {Array} - Processed table rows
 */
const processTableData = (tableData, tableConfig) => {
  const { baseOid, indexColumn, columns } = tableConfig;
  const indices = new Set();
  const baseRegex = new RegExp(`^${baseOid.replace(/\./g, '\\.')}\\.${indexColumn}\\.([0-9]+)$`);
  
  // Extract all indices from the data
  for (const oid in tableData) {
    const match = oid.match(baseRegex);
    if (match) {
      indices.add(match[1]);
    }
  }
  
  // Process each row
  const rows = [];
  for (const index of indices) {
    const row = { index: parseInt(index) };
    
    for (const column of columns) {
      const oid = `${baseOid}.${column.column}.${index}`;
      if (oid in tableData) {
        row[column.name] = tableData[oid];
      }
    }
    
    // Apply calculation function if defined
    if (tableConfig.calculate && typeof tableConfig.calculate === 'function') {
      try {
        tableConfig.calculate(row);
      } catch (err) {
        console.error(`Error calculating row ${index}: ${err.message}`);
      }
    }
    
    // Apply filter function if defined
    if (!tableConfig.filter || 
        (tableConfig.filter && typeof tableConfig.filter === 'function' && tableConfig.filter(row))) {
      rows.push(row);
    }
  }
  
  return rows;
};

/**
 * Collect metrics from a device
 * @param {Object} device - Device object
 * @param {Array} metricGroups - Groups of metrics to collect
 * @returns {Promise<Object>} - Collected metrics
 */
const collectMetrics = async (device, session, metricGroups = Object.keys(METRICS)) => {
  console.log(`Collecting metrics for device ${device.name} (${device.ipAddress})`);
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
      errors: [],
      unsupportedMetrics: [],
      unsupportedOids: []
    },
    responseTime: 0
  };
  
  const startTime = Date.now();
  
  try {
    const errors = [];
    const unsupportedMetrics = [];
    const metricResults = {};
    const startTime = Date.now();

    // Process each metric group
    for (const groupName of metricGroups) {
      const group = METRICS[groupName];
      
      if (!group) {
        console.warn(`Unknown metric group: ${groupName}`);
        continue;
      }
      
      try {
        if (group.isTable) {
          // Collect table data
          const tableData = await collectTableData(session, group.baseOid);
          const rows = processTableData(tableData, group);
          result.metrics[groupName] = rows;
          
          // Update summary data based on the group
          if (groupName === 'storage' && rows.length > 0) {
            // Use the first storage with highest usage for summary
            const diskUsage = Math.max(...rows.map(row => row.storageUsagePercent || 0));
            result.summary.diskUsage = Math.round(diskUsage);
          }
        } else {
          // Collect scalar metrics
          const metrics = await collectScalarMetrics(session, group.metrics);
          result.metrics[groupName] = metrics;
          
          // Update summary data based on the group
          if (groupName === 'system') {
            result.summary.uptime = metrics.sysUpTime || null;
            if (!metrics.sysUpTime) {
              result.summary.unsupportedMetrics.push('uptime');
            }
          } else if (groupName === 'resources') {
            // CPU Usage with fallback
            if (metrics.cpuUsage !== undefined && metrics.cpuUsage !== null) {
              result.summary.cpuUsage = parseInt(metrics.cpuUsage);
            } else {
              result.summary.cpuUsage = null;
              result.summary.unsupportedMetrics.push('cpuUsage');
            }

            // Memory Usage with multiple fallback mechanisms
            let memoryUsage = null;
            let memorySource = '';

            // Try storage-based memory usage first
            if (result.metrics.storage && result.metrics.storage.length > 0) {
              const memStorage = result.metrics.storage.find(s =>
                (s.description || s.storageDescr || '').toLowerCase().includes('memory')
              );
              if (memStorage && (memStorage.storageUsagePercent !== undefined || memStorage.usedPercent !== undefined)) {
                memoryUsage = Math.round(memStorage.storageUsagePercent || memStorage.usedPercent);
                memorySource = 'storage';
              }
            }

            // Fallback to OID-based calculation
            if (memoryUsage === null && metrics.memorySize > 0 && metrics.memoryUsed !== undefined) {
              memoryUsage = Math.round((metrics.memoryUsed / metrics.memorySize) * 100);
              memorySource = 'oid';
            }

            // If both methods fail, mark as unsupported
            if (memoryUsage === null) {
              result.summary.unsupportedMetrics.push('memoryUsage');
            }

            result.summary.memoryUsage = memoryUsage;
            console.log(`[SNMP DEBUG] Device ${device.name}: memoryUsage=${memoryUsage}% (source: ${memorySource}), cpuUsage=${result.summary.cpuUsage}%`);
          } else if (groupName === 'temperature') {
            // Temperature with fallback mechanisms
            if (metrics.boardTemperature !== undefined && metrics.boardTemperature !== null) {
              result.summary.temperature = metrics.boardTemperature;
            } else if (metrics.cpuTemperature !== undefined && metrics.cpuTemperature !== null) {
              result.summary.temperature = metrics.cpuTemperature;
            } else {
              result.summary.temperature = null;
              result.summary.unsupportedMetrics.push('temperature');
            }
          }
        }
      } catch (groupError) {
        console.error(`Error collecting ${groupName} metrics: ${groupError.message}`);
        result.summary.errors.push(`${groupName}: ${groupError.message}`);
      }
    }
    
    // Session cleanup
    session.close();
    
    // Set response time
    result.responseTime = Date.now() - startTime;
    
    // If we have errors but got some data, mark as degraded
    if (result.summary.errors.length > 0) {
      result.summary.status = 'degraded';
    }
    
    console.log('[SNMP DEBUG] Final metrics result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    // Make sure to close the session
    try {
      session.close();
    } catch (e) {
      console.error(`Error closing session: ${e.message}`);
    }
    
    console.error(`Failed to collect metrics for ${device.name}: ${error.message}`);
    throw error;
  }
};

/**
 * Get system information from device
 * @param {Object} device - Device object with SNMP configuration
 * @returns {Promise<Object>} - System information object
 */
const getSystemInfo = async (device) => {
  let session;
  try {
    session = await createSnmpSession(device);
    const result = await collectMetrics(device, session, ['system']);
    return result.metrics.system;
  } catch (error) {
    console.error(`Failed to get system info for ${device.name}:`, error.message);
    throw error;
  } finally {
    if (session) {
      session.close();
    }
  }
};

/**
 * Get resource usage information from device
 * @param {Object} device - Device object with SNMP configuration
 * @returns {Promise<Object>} - Resource usage information object
 */
const getResourceUsage = async (device) => {
  try {
    const session = await createSnmpSession(device);
    try {
      // Get CPU usage
      const cpuResult = await getSnmpData(device, [MIKROTIK_OIDS.hrProcessorLoad], session);
      const cpuUsage = cpuResult[MIKROTIK_OIDS.hrProcessorLoad] || 0;
      
      // Get memory info
      const memorySize = await getSnmpData(device, [MIKROTIK_OIDS.hrMemorySize], session);
      const totalMemory = memorySize[MIKROTIK_OIDS.hrMemorySize] || 0;
      
      // Typically index 1 is physical memory on MikroTik
      const memoryUsed = await getSnmpData(device, [
        `${MIKROTIK_OIDS.hrStorageUsed}.1`,
        `${MIKROTIK_OIDS.hrStorageSize}.1`
      ], session);
      
      const usedMem = memoryUsed[`${MIKROTIK_OIDS.hrStorageUsed}.1`] || 0;
      const totalMem = memoryUsed[`${MIKROTIK_OIDS.hrStorageSize}.1`] || totalMemory;
      
      const memoryUsage = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;
      
      // Get disk usage - typically index 2 on MikroTik
      const diskUsage = await getSnmpData(device, [
        `${MIKROTIK_OIDS.hrStorageUsed}.2`,
        `${MIKROTIK_OIDS.hrStorageSize}.2`
      ], session);
    
    const usedDisk = diskUsage[`${MIKROTIK_OIDS.hrStorageUsed}.2`] || 0;
      const totalDisk = diskUsage[`${MIKROTIK_OIDS.hrStorageSize}.2`] || 1;
      
      const diskUsagePercent = totalDisk > 0 ? Math.round((usedDisk / totalDisk) * 100) : 0;
      
      return {
        cpuUsage: parseInt(cpuUsage),
        memoryUsage: memoryUsage,
        diskUsage: diskUsagePercent,
        totalMemory: totalMem,
        usedMemory: usedMem,
        totalDisk: totalDisk,
        usedDisk: usedDisk
      };
    } finally {
      if (session) {
        session.close();
      }
    }
  } catch (error) {
    console.error(`Failed to get resource usage for ${device.name}:`, error.message);
    throw error;
  }
};

/**
 * Get temperature information from device
 * @param {Object} device - Device object with SNMP configuration
 * @returns {Promise<Object>} - Temperature information object
 */
const getTemperature = async (device) => {
  try {
    const session = await createSnmpSession(device);
    try {
      const result = await getSnmpData(device, [
        MIKROTIK_OIDS.mtxrHlTemperature,
        MIKROTIK_OIDS.mtxrHlProcessorTemperature
      ], session);
    
    let boardTemp = result[MIKROTIK_OIDS.mtxrHlTemperature];
      let cpuTemp = result[MIKROTIK_OIDS.mtxrHlProcessorTemperature];
      
      // Convert to degrees (MikroTik uses tenths of degrees)
      if (boardTemp) boardTemp = boardTemp / 10;
      if (cpuTemp) cpuTemp = cpuTemp / 10;
      
      return {
        boardTemperature: boardTemp,
        cpuTemperature: cpuTemp
      };
    } finally {
      if (session) {
        session.close();
      }
    }
  } catch (error) {
    console.error(`Failed to get temperature for ${device.name}:`, error.message);
    throw error;
  }
};

/**
 * Get network interfaces information
 * @param {Object} device - Device object with SNMP configuration
 * @returns {Promise<Array>} - Array of interface objects
 */
const getNetworkInterfaces = async (device) => {
  try {
    const session = await createSnmpSession(device);
    try {
      // Get interface count
      const ifNumberResult = await getSnmpData(device, [MIKROTIK_OIDS.ifNumber], session);
      const ifNumber = parseInt(ifNumberResult[MIKROTIK_OIDS.ifNumber] || 0);
    
    const interfaces = [];
      
      // Collect data for each interface
      for (let i = 1; i <= ifNumber; i++) {
        const ifOids = [
          `${MIKROTIK_OIDS.ifDescr}.${i}`,
          `${MIKROTIK_OIDS.ifOperStatus}.${i}`,
          `${MIKROTIK_OIDS.ifInOctets}.${i}`,
          `${MIKROTIK_OIDS.ifOutOctets}.${i}`,
          `${MIKROTIK_OIDS.ifInErrors}.${i}`,
          `${MIKROTIK_OIDS.ifOutErrors}.${i}`
        ];
        
        try {
          const ifData = await getSnmpData(device, ifOids, session);
          
          interfaces.push({
            index: i,
            ifDescr: ifData[`${MIKROTIK_OIDS.ifDescr}.${i}`] || `Interface ${i}`,
            ifOperStatus: parseInt(ifData[`${MIKROTIK_OIDS.ifOperStatus}.${i}`] || 0),
            ifInOctets: parseInt(ifData[`${MIKROTIK_OIDS.ifInOctets}.${i}`] || 0),
            ifOutOctets: parseInt(ifData[`${MIKROTIK_OIDS.ifOutOctets}.${i}`] || 0),
            ifInErrors: parseInt(ifData[`${MIKROTIK_OIDS.ifInErrors}.${i}`] || 0),
            ifOutErrors: parseInt(ifData[`${MIKROTIK_OIDS.ifOutErrors}.${i}`] || 0),
            status: parseInt(ifData[`${MIKROTIK_OIDS.ifOperStatus}.${i}`]) === 1 ? 'up' : 'down'
          });
        } catch (err) {
          console.error(`Error getting data for interface ${i}:`, err.message);
        }
      }
      
      return interfaces;
    } finally {
      if (session) {
        session.close();
      }
    }
  } catch (error) {
    console.error('Error getting network interfaces:', error.message);
    throw error;
  }
};

/**
 * Get storage information
 * @param {Object} device - Device object with SNMP configuration
 * @returns {Promise<Array>} - Array of storage objects
 */
const getStorageInfo = async (device) => {
  try {
    // Get storage index
    const storageOids = [];
    for (let i = 1; i <= 10; i++) {  // Assume max 10 storage entries
      storageOids.push(`1.3.6.1.2.1.25.2.3.1.3.${i}`); // hrStorageDescr
    }
    
    const session = await createSnmpSession(device);
    try {
      const storageDescrResults = await getSnmpData(device, storageOids, session);
    const storageIndices = Object.keys(storageDescrResults).map(oid => {
        const parts = oid.split('.');
        return parseInt(parts[parts.length - 1]);
      });
      
      const storage = [];
      
      for (const index of storageIndices) {
        const detailOids = [
          `1.3.6.1.2.1.25.2.3.1.3.${index}`, // hrStorageDescr
          `1.3.6.1.2.1.25.2.3.1.4.${index}`, // hrStorageAllocationUnits
          `1.3.6.1.2.1.25.2.3.1.5.${index}`, // hrStorageSize
          `1.3.6.1.2.1.25.2.3.1.6.${index}`  // hrStorageUsed
        ];
        
        try {
          const storageData = await getSnmpData(device, detailOids, session);
          
          const descr = storageData[`1.3.6.1.2.1.25.2.3.1.3.${index}`];
          const allocationUnits = parseInt(storageData[`1.3.6.1.2.1.25.2.3.1.4.${index}`] || 0);
          const size = parseInt(storageData[`1.3.6.1.2.1.25.2.3.1.5.${index}`] || 0);
          const used = parseInt(storageData[`1.3.6.1.2.1.25.2.3.1.6.${index}`] || 0);
          
          // Skip non-physical storage
          if (descr && (descr.includes('Physical') || descr.includes('Fixed') || descr.includes('RAM'))) {
            const totalBytes = size * allocationUnits;
            const usedBytes = used * allocationUnits;
            const freeBytes = totalBytes - usedBytes;
            const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
            
            storage.push({
              index,
              description: descr,
              sizeBytes: totalBytes,
              usedBytes,
              freeBytes,
              usedPercent,
              allocationUnits
            });
          }
        } catch (err) {
          console.error(`Error getting data for storage ${index}:`, err.message);
        }
      }
      
      return storage;
    } finally {
      if (session) {
        session.close();
      }
    }
  } catch (error) {
    console.error('Error getting storage info:', error.message);
    throw error;
  }
};

/**
 * Get interface statistics
 * @param {Object} device - Device object with SNMP configuration
 * @param {Number} ifIndex - Interface index
 * @returns {Promise<Object>} - Interface statistics
 */
const getInterfaceStats = async (device, ifIndex) => {
  const oids = [
    `${MIKROTIK_OIDS.ifDescr}.${ifIndex}`,
    `${MIKROTIK_OIDS.ifInOctets}.${ifIndex}`,
    `${MIKROTIK_OIDS.ifOutOctets}.${ifIndex}`,
    `${MIKROTIK_OIDS.ifInUcastPkts}.${ifIndex}`,
    `${MIKROTIK_OIDS.ifOutUcastPkts}.${ifIndex}`,
    `${MIKROTIK_OIDS.ifInErrors}.${ifIndex}`,
    `${MIKROTIK_OIDS.ifOutErrors}.${ifIndex}`,
    `${MIKROTIK_OIDS.ifOperStatus}.${ifIndex}`
  ];
  
  try {
    const result = await getSnmpData(device, oids);
    
    return {
      description: result[`${MIKROTIK_OIDS.ifDescr}.${ifIndex}`] || `Interface ${ifIndex}`,
      inOctets: parseInt(result[`${MIKROTIK_OIDS.ifInOctets}.${ifIndex}`] || 0),
      outOctets: parseInt(result[`${MIKROTIK_OIDS.ifOutOctets}.${ifIndex}`] || 0),
      inPackets: parseInt(result[`${MIKROTIK_OIDS.ifInUcastPkts}.${ifIndex}`] || 0),
      outPackets: parseInt(result[`${MIKROTIK_OIDS.ifOutUcastPkts}.${ifIndex}`] || 0),
      inErrors: parseInt(result[`${MIKROTIK_OIDS.ifInErrors}.${ifIndex}`] || 0),
      outErrors: parseInt(result[`${MIKROTIK_OIDS.ifOutErrors}.${ifIndex}`] || 0),
      operStatus: parseInt(result[`${MIKROTIK_OIDS.ifOperStatus}.${ifIndex}`] || 0),
      status: parseInt(result[`${MIKROTIK_OIDS.ifOperStatus}.${ifIndex}`]) === 1 ? 'up' : 'down'
    };
  } catch (error) {
    console.error(`Failed to get stats for interface ${ifIndex}:`, error.message);
    throw error;
  }
};

/**
 * Get SNMP data from device using provided OIDs
 * @param {Object} device - Device object with SNMP configuration
 * @param {Array} oids - Array of OIDs to get
 * @returns {Promise<Object>} - Object with OID keys and values
 */
const getSnmpData = async (device, oids, session) => {
  return new Promise((resolve, reject) => {
    if (!session) {
      return reject(new Error('SNMP session is required for getting data'));
    }
    
    session.get(oids, (error, varbinds) => {
      session.close();
      
      if (error) {
        console.error(`SNMP Error for ${device.name}: ${error.message}`);
        return reject(error);
      }
      
      const result = {};
      
      for (let i = 0; i < varbinds.length; i++) {
        if (snmp.isVarbindError(varbinds[i])) {
          console.error(`SNMP Error for OID ${oids[i]}: ${snmp.varbindError(varbinds[i])}`);
        } else {
          let value = varbinds[i].value;
          
          // Handle non-serializable data types
          if (value instanceof Buffer) {
            value = value.toString();
          } else if (typeof value === 'bigint') {
            value = Number(value);
          }
          
          result[oids[i]] = value;
        }
      }
      
      resolve(result);
    });
  });
};

/**
 * Create an SNMP session
 * @param {Object} config - SNMP configuration
 * @returns {Object} - SNMP session
 */
const createSnmpSession = async (config) => {
  try {
    const options = {
      port: config.snmpPort || 161,
      retries: 1,
      timeout: config.snmpTimeout || 5000,
      version: snmp.Version2c
    };

    if (config.snmpVersion === '1') {
      options.version = snmp.Version1;
    } else if (config.snmpVersion === '3') {
      options.version = snmp.Version3;
    }

    const community = config.snmpCommunity || 'public';
    const session = snmp.createSession(config.ipAddress, community, options);

    // Test session connectivity immediately
    return new Promise((resolve, reject) => {
      session.get([MIKROTIK_OIDS.sysDescr], (error, varbinds) => {
        if (error) {
          session.close();
          reject(new Error(`SNMP session test failed: ${error.message}`));
        } else if (snmp.isVarbindError(varbinds[0])) {
          session.close();
          reject(new Error(`SNMP authentication failed: Invalid community string or access denied`));
        } else {
          resolve(session);
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to initialize SNMP session: ${error.message}`);
  }
};

/**
 * Test SNMP connectivity to a device
 * @param {Object} device - Device object with SNMP configuration
 * @returns {Promise<Object>} - Test results
 */
const testSnmpConnectivity = async (device) => {
  let session;
  try {
    const startTime = Date.now();
    session = await createSnmpSession(device);
    await getSnmpData(device, [MIKROTIK_OIDS.sysDescr], session);
    const responseTime = Date.now() - startTime;
    
    return {
      success: true, 
      responseTime,
      message: 'SNMP connectivity successful'
    };
  } catch (error) {
    return {
      success: false,
      responseTime: null,
      message: error.message
    };
  } finally {
    if (session) {
      session.close();
    }
  }
};

/**
 * Collector class for managing SNMP metrics collection with events
 * This enhanced collector provides event-based updates for real-time metrics
 */
class SnmpCollector extends EventEmitter {
  constructor(device, options = {}) {
    super();
    this.device = device;
    this.isRunning = false;
    this.intervals = {
      fast: options.fastInterval || DEFAULT_INTERVALS.fast,
      standard: options.standardInterval || DEFAULT_INTERVALS.standard,
      slow: options.slowInterval || DEFAULT_INTERVALS.slow
    };
    this.timers = {};
    this.lastMetrics = null;
    this.consecutiveErrors = 0;
    this.maxErrors = options.maxErrors || 5;
    this.stats = {
      totalCollections: 0,
      successfulCollections: 0,
      failedCollections: 0,
      lastCollectionTime: null,
      lastSuccessTime: null,
      lastError: null,
      uptime: 0,
      startTime: null
    };
  }

  /**
   * Start the collector
   */
  start() {
    if (this.isRunning) {
      return false;
    }

    this.isRunning = true;
    this.stats.startTime = Date.now();
    this.emit('start', { deviceId: this.device._id, deviceName: this.device.name });
    
    // Start collection immediately
    this._collect();
    
    // Schedule collections based on intervals
    this.timers.fast = setInterval(() => {
      this._collectByInterval('fast');
    }, this.intervals.fast);
    
    this.timers.standard = setInterval(() => {
      this._collectByInterval('standard');
    }, this.intervals.standard);
    
    this.timers.slow = setInterval(() => {
      this._collectByInterval('slow');
    }, this.intervals.slow);
    
    // Update uptime every minute
    this.timers.uptime = setInterval(() => {
      this.stats.uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    }, 60000);
    
    return true;
  }

  /**
   * Stop the collector
   */
  stop() {
    if (!this.isRunning) {
      return false;
    }

    this.isRunning = false;
    
    // Clear all intervals
    Object.values(this.timers).forEach(timer => {
      clearInterval(timer);
    });
    
    this.timers = {};
    this.emit('stop', { 
      deviceId: this.device._id, 
      deviceName: this.device.name,
      stats: this.stats
    });
    
    return true;
  }

  /**
   * Get the current status of the collector
   */
  getStatus() {
    return {
      deviceId: this.device._id,
      deviceName: this.device.name,
      isRunning: this.isRunning,
      stats: this.stats,
      lastMetrics: this.lastMetrics ? {
        timestamp: this.lastMetrics.timestamp,
        summary: this.lastMetrics.summary
      } : null
    };
  }

  /**
   * Collect metrics immediately (one-time)
   */
  async collectNow() {
    return this._collect();
  }
  
  /**
   * Private method to collect metrics by interval type
   */
  _collectByInterval(intervalType) {
    if (!this.isRunning) return;
    
    Object.entries(METRICS).forEach(([metricGroup, config]) => {
      if (config.interval === intervalType) {
        this._collectMetricGroup(metricGroup);
      }
    });
  }
  
  /**
   * Private method to collect a specific metric group
   */
  async _collectMetricGroup(metricGroup) {
    if (!this.isRunning) return;
    
    try {
      // Implement specific collection logic for different metric groups
      // This is a placeholder for the actual implementation
      console.log(`Collecting ${metricGroup} metrics for ${this.device.name}`);
      
      // Update last metrics with the new data for this group
      if (!this.lastMetrics) {
        this.lastMetrics = {
          timestamp: new Date(),
          metrics: {},
          summary: {}
        };
      }
      
      // Emit the collected metrics for this group
      this.emit('metrics', {
        deviceId: this.device._id,
        deviceName: this.device.name,
        metricGroup,
        timestamp: new Date(),
        // Add the actual metrics here
      });
      
    } catch (error) {
      console.error(`Error collecting ${metricGroup} metrics for ${this.device.name}:`, error);
      this.emit('error', {
        deviceId: this.device._id,
        deviceName: this.device.name,
        metricGroup,
        error: error.message
      });
    }
  }

  /**
   * Private method to collect all metrics
   */
  async _collect() {
    if (!this.isRunning) return null;

    this.stats.totalCollections++;
    this.stats.lastCollectionTime = new Date();

    try {
      // First check device connectivity
      console.log(`Checking if device ${this.device.name} (${this.device.ipAddress}) is reachable...`);
      const isReachable = await pingHost(this.device.ipAddress);
      
      if (!isReachable.success) {
        console.warn(`Device ${this.device.name} is not reachable: ${isReachable.error}`);
        throw new Error(`Device ${this.device.name} is not reachable: ${isReachable.error}`);
      }
      
      console.log(`Device ${this.device.name} is reachable (response time: ${isReachable.responseTime}ms)`);

      let session;
      try {
        session = await createSnmpSession(this.device);
        const metrics = await collectMetrics(this.device, session);
        this.lastMetrics = metrics;
        this.stats.successfulCollections++;
        this.stats.lastSuccessTime = new Date();
        this.consecutiveErrors = 0;
      } catch (error) {
        if (session) {
          session.close();
        }
        throw error;
      }

      // Defensive: ensure metrics is always an object with summary
      let safeMetrics = metrics;
      if (!safeMetrics || typeof safeMetrics !== 'object') {
        safeMetrics = { summary: { status: 'error', errors: ['No metrics collected'] }, metrics: {} };
      } else if (!safeMetrics.summary) {
        safeMetrics.summary = { status: 'error', errors: ['No summary in metrics'] };
      }

      // Handle unsupported metrics
      if (safeMetrics.summary.unsupportedMetrics && safeMetrics.summary.unsupportedMetrics.length > 0) {
        console.warn(`Device ${this.device.name} has unsupported metrics: ${safeMetrics.summary.unsupportedMetrics.join(', ')}`);
        this.emit('warning', {
          deviceId: this.device._id,
          deviceName: this.device.name,
          type: 'unsupported_metrics',
          metrics: safeMetrics.summary.unsupportedMetrics
        });
      }

      this.emit('metrics', {
        deviceId: this.device._id,
        deviceName: this.device.name,
        timestamp: new Date(),
        metrics: safeMetrics
      });

      return safeMetrics;
    } catch (error) {
      this.stats.failedCollections++;
      this.stats.lastError = {
        timestamp: new Date(),
        message: error.message,
        type: error.code || 'unknown'
      };
      this.consecutiveErrors++;

      // Categorize errors
      let errorType = 'unknown';
      if (error.message.includes('not reachable')) {
        errorType = 'connectivity';
      } else if (error.message.includes('Authentication failed')) {
        errorType = 'authentication';
      } else if (error.message.includes('Timeout')) {
        errorType = 'timeout';
      } else if (error.message.includes('NoSuchObject') || error.message.includes('NoSuchInstance')) {
        errorType = 'unsupported_oid';
      }

      // Emit error event with categorized error
      this.emit('error', {
        deviceId: this.device._id,
        deviceName: this.device.name,
        error: error.message,
        errorType,
        timestamp: new Date(),
        consecutiveErrors: this.consecutiveErrors
      });

      // Auto-stop collector after too many consecutive errors
      if (this.consecutiveErrors >= this.maxErrors) {
        console.error(`Too many consecutive errors (${this.consecutiveErrors}) for ${this.device.name}, stopping collector`);
        this.stop();
        
        this.emit('auto-stop', {
          deviceId: this.device._id,
          deviceName: this.device.name,
          reason: `Too many consecutive errors: ${this.consecutiveErrors}`,
          lastError: error.message,
          errorType
        });
      }

      return { summary: { status: 'error', errors: [error.message], errorType }, metrics: {} };
    }
  }
}

/**
 * Create and start a collector for a device
 * @param {Object} device - Device object
 * @param {Function} callback - Callback function for metrics/errors
 * @param {Object} options - Collector options
 * @returns {SnmpCollector} - Collector instance
 */
const startCollector = (device, callback, options = {}) => {
  const collector = new SnmpCollector(device, options);
  
  if (callback) {
    collector.on('metrics', (data) => {
      callback(null, data.metrics);
    });
    
    collector.on('error', (data) => {
      callback(new Error(data.error));
    });
  }
  
  return collector;
};

module.exports = {
  MIKROTIK_OIDS,
  METRICS,
  DEFAULT_INTERVALS,
  createSnmpSession,
  getSnmpData,
  getSystemInfo,
  getResourceUsage,
  getInterfaceStats,
  getTemperature,
  getNetworkInterfaces,
  getStorageInfo,
  testSnmpConnectivity,
  collectMetrics,
  startCollector,
  SnmpCollector
};
