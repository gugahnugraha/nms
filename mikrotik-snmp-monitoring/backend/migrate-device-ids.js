/**
 * Direct entry point for device ID migration
 * Run this from the backend directory with: node migrate-device-ids.js
 */
console.log('Starting device ID migration...');

// Import directly from the scripts directory
require('./scripts/migrateDeviceIds');
