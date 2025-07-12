const snmp = require('net-snmp');

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

/**
 * Create SNMP session
 * @param {Object} config - SNMP configuration
 * @returns {Object} SNMP session
 */
const createSnmpSession = (config) => {
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
    // Add SNMPv3 specific options if needed
  }

  return snmp.createSession(config.ipAddress, config.snmpCommunity, options);
};

/**
 * Get SNMP data from device
 * @param {Object} device - Device configuration
 * @param {Array} oids - Array of OIDs to query
 * @returns {Promise} Promise that resolves to SNMP data
 */
const getSnmpData = async (device, oids = []) => {
  return new Promise((resolve, reject) => {
    const session = createSnmpSession(device);
    
    // Default OIDs if none provided
    const defaultOids = [
      MIKROTIK_OIDS.sysDescr,
      MIKROTIK_OIDS.sysUpTime,
      MIKROTIK_OIDS.sysName,
      MIKROTIK_OIDS.hrProcessorLoad,
      MIKROTIK_OIDS.mtxrHlTemperature
    ];
    
    const oidsToQuery = oids.length > 0 ? oids : defaultOids;
    
    session.get(oidsToQuery, (error, varbinds) => {
      session.close();
      
      if (error) {
        reject(error);
      } else {
        const data = {};
        
        varbinds.forEach((vb, index) => {
          if (snmp.isVarbindError(vb)) {
            console.error(`OID ${oidsToQuery[index]} error:`, snmp.varbindError(vb));
          } else {
            data[oidsToQuery[index]] = vb.value;
          }
        });
        
        resolve(data);
      }
    });
  });
};

/**
 * Get system information via SNMP
 * @param {Object} device - Device configuration
 * @returns {Promise} Promise that resolves to system info
 */
const getSystemInfo = async (device) => {
  try {
    const oids = [
      MIKROTIK_OIDS.sysDescr,
      MIKROTIK_OIDS.sysUpTime,
      MIKROTIK_OIDS.sysName,
      MIKROTIK_OIDS.sysLocation
    ];
    
    const data = await getSnmpData(device, oids);
    
    return {
      description: data[MIKROTIK_OIDS.sysDescr] || '',
      uptime: data[MIKROTIK_OIDS.sysUpTime] || 0,
      name: data[MIKROTIK_OIDS.sysName] || '',
      location: data[MIKROTIK_OIDS.sysLocation] || ''
    };
  } catch (error) {
    throw new Error(`Failed to get system info: ${error.message}`);
  }
};

/**
 * Get CPU and memory usage via SNMP
 * @param {Object} device - Device configuration
 * @returns {Promise} Promise that resolves to resource usage
 */
const getResourceUsage = async (device) => {
  try {
    console.log(`Getting resource usage for device: ${device.name} (${device.ipAddress})`);
    
    const oids = [
      MIKROTIK_OIDS.hrProcessorLoad,
      MIKROTIK_OIDS.hrMemorySize,
      MIKROTIK_OIDS.hrStorageUsed,
      MIKROTIK_OIDS.hrStorageSize
    ];
    
    const data = await getSnmpData(device, oids);
    console.log('Resource usage SNMP data:', data);
    
    // Calculate memory usage as a percentage
    const cpuUsage = parseInt(data[MIKROTIK_OIDS.hrProcessorLoad] || 0);
    const memorySize = parseInt(data[MIKROTIK_OIDS.hrMemorySize] || 0);
    const memoryUsed = parseInt(data[MIKROTIK_OIDS.hrStorageUsed] || 0);
    const memoryTotal = parseInt(data[MIKROTIK_OIDS.hrStorageSize] || 0);
    
    console.log('CPU Usage:', cpuUsage);
    console.log('Memory Size:', memorySize);
    console.log('Memory Used:', memoryUsed);
    console.log('Memory Total:', memoryTotal);
    
    let memoryUsagePercent = 0;
    if (memoryTotal > 0) {
      memoryUsagePercent = (memoryUsed / memoryTotal) * 100;
    }
    
    // Calculate disk usage - query for all storage types
    let diskUsagePercent = 0;
    try {
      // Get the hrStorage table entries with a walk operation
      const session = createSnmpSession(device);
      
      const storageTable = await new Promise((resolve, reject) => {
        const storageOids = [];
        
        // Walk the hrStorageTable
        session.subtree('1.3.6.1.2.1.25.2.3.1', (varbinds) => {
          for (const vb of varbinds) {
            if (snmp.isVarbindError(vb)) {
              console.error('Error in storage OID:', snmp.varbindError(vb));
            } else {
              storageOids.push({
                oid: vb.oid,
                value: vb.value
              });
            }
          }
        }, (error) => {
          session.close();
          if (error) {
            reject(error);
          } else {
            resolve(storageOids);
          }
        });
      });
      
      // Find disk storage entries
      // Group by storage index
      const storageEntries = {};
      for (const entry of storageTable) {
        const oidParts = entry.oid.split('.');
        const tableColumn = oidParts[oidParts.length - 2];
        const index = oidParts[oidParts.length - 1];
        
        if (!storageEntries[index]) {
          storageEntries[index] = {};
        }
        
        // hrStorageDescr = 3, hrStorageSize = 5, hrStorageUsed = 6
        if (tableColumn === '3') { // Description
          storageEntries[index].description = entry.value.toString();
        } else if (tableColumn === '5') { // Size
          storageEntries[index].size = parseInt(entry.value);
        } else if (tableColumn === '6') { // Used
          storageEntries[index].used = parseInt(entry.value);
        }
      }
      
      // Find the first disk storage entry
      for (const index in storageEntries) {
        const entry = storageEntries[index];
        if (entry.description && 
            (entry.description.includes('disk') || 
             entry.description.includes('flash') || 
             entry.description.includes('storage') ||
             entry.description.includes('drive'))) {
          
          console.log(`Found disk storage: ${entry.description}`);
          console.log(`Size: ${entry.size}, Used: ${entry.used}`);
          
          if (entry.size > 0) {
            diskUsagePercent = (entry.used / entry.size) * 100;
            console.log(`Disk usage percentage: ${diskUsagePercent.toFixed(1)}%`);
            break;
          }
        }
      }
    } catch (diskError) {
      console.error(`Failed to get disk usage for device ${device.name}:`, diskError);
    }
    
    const result = {
      cpuUsage: cpuUsage,
      memorySize: memorySize,
      memoryUsage: parseFloat(memoryUsagePercent.toFixed(1)),
      diskUsage: parseFloat(diskUsagePercent.toFixed(1))
    };
    
    console.log('Final resource usage data:', result);
    return result;
  } catch (error) {
    console.error(`Failed to get resource usage for device:`, error);
    return {
      cpuUsage: 0,
      memorySize: 0,
      memoryUsage: 0,
      diskUsage: 0
    };
  }
};

/**
 * Get interface statistics via SNMP
 * @param {Object} device - Device configuration
 * @returns {Promise} Promise that resolves to interface stats
 */
const getInterfaceStats = async (device) => {
  try {
    // First get number of interfaces
    const ifNumberData = await getSnmpData(device, [MIKROTIK_OIDS.ifNumber]);
    const interfaceCount = ifNumberData[MIKROTIK_OIDS.ifNumber] || 0;
    
    if (interfaceCount === 0) {
      return [];
    }
    
    // Get interface descriptions and stats
    const interfaces = [];
    
    for (let i = 1; i <= Math.min(interfaceCount, 10); i++) { // Limit to 10 interfaces
      const oids = [
        `${MIKROTIK_OIDS.ifDescr}.${i}`,
        `${MIKROTIK_OIDS.ifInOctets}.${i}`,
        `${MIKROTIK_OIDS.ifOutOctets}.${i}`,
        `${MIKROTIK_OIDS.ifInUcastPkts}.${i}`,
        `${MIKROTIK_OIDS.ifOutUcastPkts}.${i}`,
        `${MIKROTIK_OIDS.ifInErrors}.${i}`,
        `${MIKROTIK_OIDS.ifOutErrors}.${i}`,
        `${MIKROTIK_OIDS.ifOperStatus}.${i}`
      ];
      
      try {
        const data = await getSnmpData(device, oids);
        
        interfaces.push({
          index: i,
          name: data[`${MIKROTIK_OIDS.ifDescr}.${i}`] || `Interface ${i}`,
          bytesIn: data[`${MIKROTIK_OIDS.ifInOctets}.${i}`] || 0,
          bytesOut: data[`${MIKROTIK_OIDS.ifOutOctets}.${i}`] || 0,
          packetsIn: data[`${MIKROTIK_OIDS.ifInUcastPkts}.${i}`] || 0,
          packetsOut: data[`${MIKROTIK_OIDS.ifOutUcastPkts}.${i}`] || 0,
          errorsIn: data[`${MIKROTIK_OIDS.ifInErrors}.${i}`] || 0,
          errorsOut: data[`${MIKROTIK_OIDS.ifOutErrors}.${i}`] || 0,
          status: data[`${MIKROTIK_OIDS.ifOperStatus}.${i}`] || 0
        });
      } catch (err) {
        console.error(`Error getting interface ${i} stats:`, err.message);
      }
    }
    
    return interfaces;
  } catch (error) {
    throw new Error(`Failed to get interface stats: ${error.message}`);
  }
};

/**
 * Get temperature via SNMP (MikroTik specific)
 * @param {Object} device - Device configuration
 * @returns {Promise} Promise that resolves to temperature data
 */
const getTemperature = async (device) => {
  try {
    const oids = [
      MIKROTIK_OIDS.mtxrHlTemperature,
      MIKROTIK_OIDS.mtxrHlProcessorTemperature
    ];
    
    const data = await getSnmpData(device, oids);
    
    return {
      boardTemperature: data[MIKROTIK_OIDS.mtxrHlTemperature] ? 
        data[MIKROTIK_OIDS.mtxrHlTemperature] / 10 : null,
      cpuTemperature: data[MIKROTIK_OIDS.mtxrHlProcessorTemperature] ? 
        data[MIKROTIK_OIDS.mtxrHlProcessorTemperature] / 10 : null
    };
  } catch (error) {
    // Temperature might not be available on all devices
    return {
      boardTemperature: null,
      cpuTemperature: null
    };
  }
};

/**
 * Test SNMP connectivity
 * @param {Object} device - Device configuration
 * @returns {Promise} Promise that resolves to connectivity test result
 */
const testSnmpConnectivity = async (device) => {
  try {
    const startTime = Date.now();
    await getSnmpData(device, [MIKROTIK_OIDS.sysDescr]);
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
  }
};

module.exports = {
  MIKROTIK_OIDS,
  createSnmpSession,
  getSnmpData,
  getSystemInfo,
  getResourceUsage,
  getInterfaceStats,
  getTemperature,
  testSnmpConnectivity
};
