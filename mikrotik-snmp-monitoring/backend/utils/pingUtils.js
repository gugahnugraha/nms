const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Ping a host to check connectivity
 * @param {string} host - IP address or hostname to ping
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Promise that resolves to ping result
 */
const pingHost = async (host, timeout = 5000) => {
  try {
    const isWindows = process.platform === 'win32';
    const pingCommand = isWindows 
      ? `ping -n 1 -w ${timeout} ${host}`
      : `ping -c 1 -W ${Math.ceil(timeout / 1000)} ${host}`;

    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(pingCommand);
    const responseTime = Date.now() - startTime;

    if (stderr) {
      throw new Error(stderr);
    }

    // Parse response time from output
    let parsedResponseTime = responseTime;
    
    if (isWindows) {
      const timeMatch = stdout.match(/time[<=](\d+)ms/i);
      if (timeMatch) {
        parsedResponseTime = parseInt(timeMatch[1]);
      }
    } else {
      const timeMatch = stdout.match(/time=(\d+\.?\d*)\s*ms/i);
      if (timeMatch) {
        parsedResponseTime = parseFloat(timeMatch[1]);
      }
    }

    return {
      success: true,
      responseTime: parsedResponseTime,
      output: stdout,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      success: false,
      responseTime: null,
      error: error.message,
      timestamp: new Date()
    };
  }
};

/**
 * Check if a host is reachable via ping
 * @param {string} host - IP address or hostname
 * @returns {Promise} Promise that resolves to boolean
 */
const isHostReachable = async (host) => {
  const result = await pingHost(host);
  return result.success;
};

/**
 * Ping multiple hosts concurrently
 * @param {Array} hosts - Array of hosts to ping
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Promise that resolves to array of ping results
 */
const pingMultipleHosts = async (hosts, timeout = 5000) => {
  const pingPromises = hosts.map(host => 
    pingHost(host, timeout).then(result => ({
      host,
      ...result
    }))
  );

  return await Promise.all(pingPromises);
};

/**
 * Continuous ping monitoring
 * @param {string} host - Host to monitor
 * @param {Function} callback - Callback function for each ping result
 * @param {number} interval - Ping interval in milliseconds
 * @param {number} timeout - Ping timeout in milliseconds
 * @returns {Object} Object with stop function
 */
const continuousPing = (host, callback, interval = 60000, timeout = 5000) => {
  let intervalId;
  let isRunning = false;

  const doPing = async () => {
    if (!isRunning) return;
    
    try {
      const result = await pingHost(host, timeout);
      callback({
        host,
        ...result
      });
    } catch (error) {
      callback({
        host,
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  };

  const start = () => {
    if (isRunning) return;
    
    isRunning = true;
    // Do initial ping
    doPing();
    // Set up interval
    intervalId = setInterval(doPing, interval);
  };

  const stop = () => {
    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // Auto start
  start();

  return {
    stop,
    start,
    isRunning: () => isRunning
  };
};

/**
 * Traceroute to a host (simplified)
 * @param {string} host - Target host
 * @param {number} maxHops - Maximum number of hops
 * @returns {Promise} Promise that resolves to traceroute result
 */
const traceroute = async (host, maxHops = 30) => {
  try {
    const isWindows = process.platform === 'win32';
    const traceCommand = isWindows 
      ? `tracert -h ${maxHops} ${host}`
      : `traceroute -m ${maxHops} ${host}`;

    const { stdout, stderr } = await execAsync(traceCommand);

    if (stderr) {
      throw new Error(stderr);
    }

    return {
      success: true,
      output: stdout,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
};

/**
 * Get network statistics for a host
 * @param {string} host - Target host
 * @returns {Promise} Promise that resolves to network stats
 */
const getNetworkStats = async (host) => {
  try {
    // Perform multiple pings to get statistics
    const pingCount = 5;
    const pingPromises = [];

    for (let i = 0; i < pingCount; i++) {
      pingPromises.push(pingHost(host));
    }

    const results = await Promise.all(pingPromises);
    const successfulPings = results.filter(r => r.success);
    const responseTimes = successfulPings.map(r => r.responseTime);

    if (responseTimes.length === 0) {
      return {
        host,
        packetsTransmitted: pingCount,
        packetsReceived: 0,
        packetLoss: 100,
        minTime: null,
        maxTime: null,
        avgTime: null,
        timestamp: new Date()
      };
    }

    const minTime = Math.min(...responseTimes);
    const maxTime = Math.max(...responseTimes);
    const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const packetLoss = ((pingCount - successfulPings.length) / pingCount) * 100;

    return {
      host,
      packetsTransmitted: pingCount,
      packetsReceived: successfulPings.length,
      packetLoss,
      minTime,
      maxTime,
      avgTime,
      timestamp: new Date()
    };
  } catch (error) {
    throw new Error(`Failed to get network stats for ${host}: ${error.message}`);
  }
};

module.exports = {
  pingHost,
  isHostReachable,
  pingMultipleHosts,
  continuousPing,
  traceroute,
  getNetworkStats
};
