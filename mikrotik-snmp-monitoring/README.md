# MikroTik SNMP Monitoring System

Sistem monitoring perangkat jaringan MikroTik menggunakan SNMP dengan teknologi MERN Stack (MongoDB, Express, React, Node.js).

## 🚀 Fitur Utama

- **Monitoring Real-time**: Monitoring perangkat MikroTik via SNMP
- **Dashboard Visualisasi**: Dashboard modern dengan grafik menggunakan RechartsJS
- **Device Management**: Manajemen perangkat dengan input SNMP config dan IP address
- **Alert System**: Notifikasi real-time saat perangkat down/up
- **Role-based Access**: Sistem akses berbasis role (Admin vs User)
- **Historical Reports**: Laporan historis data monitoring
- **Responsive Design**: UI modern dan responsif mirip Grafana

## 🛠 Teknologi yang Digunakan

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- bcrypt
- net-snmp
- cors
- dotenv

### Frontend
- React.js (tanpa TypeScript)
- Tailwind CSS v3.x
- React Router DOM
- RechartsJS
- Axios
- clsx

## 📁 Struktur Proyek

```
mikrotik-snmp-monitoring/
├── backend/
│   ├── controllers/        # Controller untuk API endpoints
│   ├── models/            # Model MongoDB (User, Device, Log, dll)
│   ├── routes/            # Route definitions
│   ├── middleware/        # Middleware (auth, validation, dll)
│   ├── utils/             # Utility functions (SNMP, ping, dll)
│   ├── config/            # Konfigurasi database dan aplikasi
│   ├── package.json
│   └── app.js            # Entry point backend
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/       # Images, icons, dll
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── context/      # React context
│   │   └── App.jsx       # Entry point frontend
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 🚀 Instalasi dan Setup

### Prerequisites
- Node.js (v16 atau lebih baru)
- MongoDB Atlas account
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd mikrotik-snmp-monitoring
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Buat file `.env` di folder backend:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

Jalankan backend:
```bash
npm start
```

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Jalankan frontend:
```bash
npm start
```

## 🔧 Konfigurasi MongoDB Atlas

1. Buat account di [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Buat cluster baru
3. Buat database user
4. Whitelist IP address
5. Copy connection string ke file `.env`

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Device Management
- `GET /api/devices` - Get semua devices
- `POST /api/devices` - Tambah device baru
- `GET /api/devices/:id` - Get detail device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

### Monitoring
- `GET /api/monitoring/status` - Get status semua devices
- `GET /api/monitoring/logs` - Get monitoring logs
- `GET /api/monitoring/reports` - Get laporan

## 🎨 Tema Warna

Aplikasi menggunakan tema warna utama `#11b6d4` (cyan-500) dengan desain modern dan profesional.

## 🔐 Role-based Access

- **Admin**: Full access ke semua fitur
- **User**: Read-only access ke dashboard dan reports

## 📱 Responsive Design

Aplikasi fully responsive dan dapat diakses dari desktop, tablet, dan mobile.

## 🚀 Deployment

### Backend (Heroku/Railway)
1. Push ke repository Git
2. Connect ke platform deployment
3. Set environment variables
4. Deploy

### Frontend (Netlify/Vercel)
1. Build aplikasi: `npm run build`
2. Deploy folder `build` ke platform

## 📝 Contributing

1. Fork repository
2. Buat feature branch
3. Commit changes
4. Push ke branch
5. Create Pull Request

## 📄 License

MIT License

## 📞 Support

Untuk pertanyaan dan support, silahkan buat issue di repository ini.
