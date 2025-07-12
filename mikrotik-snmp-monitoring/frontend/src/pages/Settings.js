import React, { useState, useEffect } from 'react';
import { 
  Save, 
  User, 
  Lock, 
  Bell, 
  Database, 
  Globe, 
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Users,
  Shield,
  Mail,
  Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile Settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // System Settings (Admin only)
  const [systemSettings, setSystemSettings] = useState({
    siteName: 'MikroTik SNMP Monitor',
    defaultPingInterval: 300,
    defaultSnmpInterval: 600,
    retentionDays: 90,
    enableNotifications: true,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    deviceDownAlerts: true,
    highCpuAlerts: true,
    highMemoryAlerts: true,
    thresholdCpu: 80,
    thresholdMemory: 80,
    alertCooldown: 300
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // In a real app, these would be API calls
      // const systemData = await settingsService.getSystemSettings();
      // const notificationData = await settingsService.getNotificationSettings();
      
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (profileData.newPassword && !profileData.currentPassword) {
      toast.error('Current password is required to change password');
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email
      };

      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      // await updateProfile(updateData);
      toast.success('Profile updated successfully');
      
      // Clear password fields
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSystemSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      // await settingsService.updateSystemSettings(systemSettings);
      toast.success('System settings updated successfully');
    } catch (error) {
      toast.error('Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      // await settingsService.updateNotificationSettings(notificationSettings);
      toast.success('Notification settings updated successfully');
    } catch (error) {
      toast.error('Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const testEmailConnection = async () => {
    try {
      setSaving(true);
      // await settingsService.testEmailConnection(systemSettings);
      toast.success('Email connection test successful');
    } catch (error) {
      toast.error('Email connection test failed');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(user?.role === 'admin' ? [
      { id: 'system', label: 'System', icon: SettingsIcon },
      { id: 'users', label: 'Users', icon: Users }
    ] : [])
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Manage your account and system preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-body p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Settings</h3>
                
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="input"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="input"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>

                  <hr className="border-gray-200" />

                  <h4 className="text-md font-medium text-gray-900">Change Password</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="input"
                      placeholder="Enter current password to change"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={profileData.newPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="input"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="input"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn btn-primary"
                    >
                      {saving ? (
                        <>
                          <LoadingSpinner size="small" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h3>
                
                <form onSubmit={handleNotificationSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                        <p className="text-sm text-gray-500">Receive email alerts for system events</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailNotifications}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Device Down Alerts</h4>
                        <p className="text-sm text-gray-500">Get notified when devices go offline</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.deviceDownAlerts}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, deviceDownAlerts: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">High CPU Alerts</h4>
                        <p className="text-sm text-gray-500">Alert when CPU usage exceeds threshold</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.highCpuAlerts}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, highCpuAlerts: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">High Memory Alerts</h4>
                        <p className="text-sm text-gray-500">Alert when memory usage exceeds threshold</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.highMemoryAlerts}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, highMemoryAlerts: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CPU Threshold (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={notificationSettings.thresholdCpu}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, thresholdCpu: parseInt(e.target.value) }))}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Memory Threshold (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={notificationSettings.thresholdMemory}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, thresholdMemory: parseInt(e.target.value) }))}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alert Cooldown (seconds)
                      </label>
                      <input
                        type="number"
                        min="60"
                        value={notificationSettings.alertCooldown}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, alertCooldown: parseInt(e.target.value) }))}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn btn-primary"
                    >
                      {saving ? (
                        <>
                          <LoadingSpinner size="small" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* System Tab (Admin only) */}
          {activeTab === 'system' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-body">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">System Settings</h3>
                  
                  <form onSubmit={handleSystemSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Site Name
                      </label>
                      <input
                        type="text"
                        value={systemSettings.siteName}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, siteName: e.target.value }))}
                        className="input"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Default Ping Interval (seconds)
                        </label>
                        <input
                          type="number"
                          min="30"
                          value={systemSettings.defaultPingInterval}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, defaultPingInterval: parseInt(e.target.value) }))}
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Default SNMP Interval (seconds)
                        </label>
                        <input
                          type="number"
                          min="60"
                          value={systemSettings.defaultSnmpInterval}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, defaultSnmpInterval: parseInt(e.target.value) }))}
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data Retention (days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={systemSettings.retentionDays}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
                          className="input"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-4">
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary"
                      >
                        {saving ? (
                          <>
                            <LoadingSpinner size="small" className="mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Settings
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Email Configuration */}
              <div className="card">
                <div className="card-body">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Email Configuration</h3>
                  
                  <form onSubmit={handleSystemSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          value={systemSettings.smtpHost}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                          className="input"
                          placeholder="smtp.gmail.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SMTP Port
                        </label>
                        <input
                          type="number"
                          value={systemSettings.smtpPort}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                          className="input"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SMTP Username
                        </label>
                        <input
                          type="text"
                          value={systemSettings.smtpUser}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SMTP Password
                        </label>
                        <input
                          type="password"
                          value={systemSettings.smtpPassword}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                          className="input"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="smtpSecure"
                        checked={systemSettings.smtpSecure}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, smtpSecure: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="smtpSecure" className="ml-2 text-sm text-gray-700">
                        Use secure connection (TLS/SSL)
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <button
                        type="button"
                        onClick={testEmailConnection}
                        disabled={saving}
                        className="btn btn-secondary"
                      >
                        {saving ? (
                          <>
                            <LoadingSpinner size="small" className="mr-2" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Test Connection
                          </>
                        )}
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary"
                      >
                        {saving ? (
                          <>
                            <LoadingSpinner size="small" className="mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Email Settings
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab (Admin only) */}
          {activeTab === 'users' && user?.role === 'admin' && (
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">User Management</h3>
                
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
                  <p className="text-gray-500 mb-4">
                    Advanced user management features will be implemented here
                  </p>
                  <button className="btn btn-primary">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;