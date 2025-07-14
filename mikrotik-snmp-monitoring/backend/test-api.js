const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'test123'
};

const testDevice = {
  name: 'Test Router',
  ipAddress: '192.168.1.1',
  snmpCommunity: 'public',
  snmpVersion: '2c',
  deviceType: 'router',
  location: 'Test Location',
  description: 'Test device for API testing'
};

let authToken = '';

// Test functions
const testHealthCheck = async () => {
  try {
    console.log('🔍 Testing health check...');
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
};

const testUserRegistration = async () => {
  try {
    console.log('🔍 Testing user registration...');
    const response = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
    console.log('✅ User registration passed:', response.data.message);
    return true;
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message.includes('already exists')) {
      console.log('⚠️  User already exists, continuing...');
      return true;
    }
    console.error('❌ User registration failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testUserLogin = async () => {
  try {
    console.log('🔍 Testing user login...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = response.data.data.token;
    console.log('✅ User login passed');
    return true;
  } catch (error) {
    console.error('❌ User login failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testDeviceCreation = async () => {
  try {
    console.log('🔍 Testing device creation...');
    const response = await axios.post(`${API_BASE_URL}/devices`, testDevice, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Device creation passed:', response.data.message);
    return response.data.data._id;
  } catch (error) {
    console.error('❌ Device creation failed:', error.response?.data?.message || error.message);
    return null;
  }
};

const testDeviceList = async () => {
  try {
    console.log('🔍 Testing device list...');
    const response = await axios.get(`${API_BASE_URL}/devices`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Device list passed:', response.data.data.length, 'devices found');
    return true;
  } catch (error) {
    console.error('❌ Device list failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testDashboard = async () => {
  try {
    console.log('🔍 Testing dashboard...');
    const response = await axios.get(`${API_BASE_URL}/monitoring/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Dashboard passed:', response.data.data.summary);
    return true;
  } catch (error) {
    console.error('❌ Dashboard failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testMonitoringLogs = async () => {
  try {
    console.log('🔍 Testing monitoring logs...');
    const response = await axios.get(`${API_BASE_URL}/monitoring/logs`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Monitoring logs passed:', response.data.data.logs.length, 'logs found');
    return true;
  } catch (error) {
    console.error('❌ Monitoring logs failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testSNMPExporterStatus = async () => {
  try {
    console.log('🔍 Testing SNMP exporter status...');
    const response = await axios.get(`${API_BASE_URL}/snmp-exporter/active`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ SNMP exporter status passed:', response.data.data.totalActive, 'active collectors');
    return true;
  } catch (error) {
    console.error('❌ SNMP exporter status failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting API tests...\n');

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Device Creation', fn: testDeviceCreation },
    { name: 'Device List', fn: testDeviceList },
    { name: 'Dashboard', fn: testDashboard },
    { name: 'Monitoring Logs', fn: testMonitoringLogs },
    { name: 'SNMP Exporter Status', fn: testSNMPExporterStatus }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const result = await test.fn();
    if (result) passedTests++;
  }

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Backend is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the backend configuration.');
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests }; 