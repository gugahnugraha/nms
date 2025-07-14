# MikroTik SNMP Monitoring Backend

Backend API untuk sistem monitoring perangkat MikroTik via SNMP.

## Fitur

- ✅ Autentikasi JWT
- ✅ Manajemen perangkat MikroTik
- ✅ Monitoring SNMP real-time
- ✅ Socket.IO untuk data real-time
- ✅ Dashboard dan laporan
- ✅ Rate limiting
- ✅ Error handling

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Buat file `.env` di root backend dengan konfigurasi berikut:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/mikrotik-monitoring

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=30d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SNMP Configuration
SNMP_DEFAULT_TIMEOUT=5000
SNMP_DEFAULT_RETRIES=1

# Logging
LOG_LEVEL=info
```

### 3. Database Setup

Pastikan MongoDB sudah berjalan dan database `mikrotik-monitoring` sudah dibuat.

### 4. Run Development Server

```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get profile user
- `PUT /api/auth/profile` - Update profile user
- `PUT /api/auth/change-password` - Ganti password

### Devices

- `GET /api/devices` - Get semua perangkat
- `GET /api/devices/:id` - Get detail perangkat
- `POST /api/devices` - Tambah perangkat baru
- `PUT /api/devices/:id` - Update perangkat
- `DELETE /api/devices/:id` - Hapus perangkat
- `GET /api/devices/:id/stats` - Get statistik perangkat
- `POST /api/devices/test-connection` - Test koneksi perangkat
- `POST /api/devices/:id/ping` - Ping perangkat

### Monitoring

- `GET /api/monitoring/dashboard` - Get data dashboard
- `GET /api/monitoring/device/:id` - Get data monitoring perangkat
- `GET /api/monitoring/device/:id/metrics` - Get metrics perangkat untuk chart
- `GET /api/monitoring/device/:id/real-time-metrics` - Get metrics real-time
- `GET /api/monitoring/device/:id/logs` - Get log perangkat
- `GET /api/monitoring/logs` - Get semua log monitoring
- `GET /api/monitoring/reports` - Get laporan monitoring
- `POST /api/monitoring/test/:id` - Test konektivitas perangkat

### SNMP Exporter

- `POST /api/snmp-exporter/start/:id` - Start SNMP collector
- `POST /api/snmp-exporter/stop/:id` - Stop SNMP collector
- `GET /api/snmp-exporter/status/:id` - Get status collector
- `GET /api/snmp-exporter/active` - Get daftar collector aktif

## Socket.IO Events

### Client to Server

- `subscribe_device_metrics` - Subscribe ke metrics perangkat
- `unsubscribe_device_metrics` - Unsubscribe dari metrics perangkat
- `request_real_time_metrics` - Request metrics real-time
- `request_device_status` - Request status perangkat

### Server to Client

- `device_metrics` - Data metrics perangkat real-time
- `device_status` - Update status perangkat
- `device_alert` - Alert perangkat
- `real_time_metrics` - Response metrics real-time
- `error` - Error message

## Models

### Device

```javascript
{
  deviceId: String,
  name: String,
  ipAddress: String,
  snmpCommunity: String,
  snmpVersion: String,
  snmpPort: Number,
  location: String,
  description: String,
  deviceType: String,
  model: String,
  serialNumber: String,
  firmwareVersion: String,
  isActive: Boolean,
  status: String,
  lastSeen: Date,
  pingInterval: Number,
  snmpInterval: Number,
  snmpTimeout: Number,
  autoCollect: Boolean,
  collectInterval: String,
  createdBy: ObjectId,
  tags: [String]
}
```

### MonitoringLog

```javascript
{
  deviceId: ObjectId,
  timestamp: Date,
  metrics: Mixed,
  status: String
}
```

### User

```javascript
{
  username: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean
}
```

## SNMP OIDs

Sistem menggunakan OID berikut untuk MikroTik:

- CPU Load: `1.3.6.1.4.1.14988.1.1.1.2.1.1`
- Memory Usage: `1.3.6.1.4.1.14988.1.1.1.2.1.5`
- HDD Usage: `1.3.6.1.4.1.14988.1.1.1.2.1.10`
- Temperature: `1.3.6.1.4.1.14988.1.1.1.2.1.11`
- Power Consumption: `1.3.6.1.4.1.14988.1.1.1.2.1.14`

## Error Handling

Semua endpoint mengembalikan response dengan format:

```javascript
{
  success: Boolean,
  message: String,
  data: Object,
  error: String // hanya jika ada error
}
```

## Rate Limiting

- General: 100 requests per 15 menit
- Auth: 5 requests per 15 menit

## Security

- JWT authentication untuk semua endpoint private
- Password hashing dengan bcrypt
- CORS protection
- Rate limiting
- Input validation
- Error handling yang aman 