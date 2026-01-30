# KidSafe+ Backend API

Real-time monitoring and spy app backend API built with Node.js, Express, MongoDB, and Socket.io.

## Features

- ✅ User Authentication (JWT)
- ✅ Device Management
- ✅ Call Recording & Logs
- ✅ SMS & Social Media Tracking
- ✅ GPS Location Tracking
- ✅ Photo/Video/Media Access
- ✅ Real-time Communication (Socket.io)
- ✅ Remote Commands
- ✅ Activity Logs
- ✅ Multi-language Support (English/Arabic)

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.io
- **Authentication**: JWT
- **File Upload**: Multer
- **Security**: Helmet, Rate Limiting, CORS

## Installation

### 1. Clone and Install

```bash
cd kidsafe-backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or use MongoDB Atlas (cloud)
```

### 4. Run Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Devices
- `GET /api/devices` - Get all devices
- `GET /api/devices/:id` - Get device details
- `POST /api/devices` - Register device (from Android app)
- `PUT /api/devices/:id` - Update device settings
- `DELETE /api/devices/:id` - Unlink device
- `POST /api/devices/:id/heartbeat` - Device heartbeat

### Calls
- `GET /api/calls` - Get call logs
- `POST /api/calls` - Log new call
- `POST /api/calls/:id/recording` - Upload call recording
- `GET /api/calls/stats/overview` - Call statistics

### Messages
- `GET /api/messages` - Get messages
- `POST /api/messages` - Log new message
- `POST /api/messages/:id/media` - Upload message media

### Locations
- `GET /api/locations` - Get location history
- `GET /api/locations/latest` - Get latest locations
- `POST /api/locations` - Log new location
- `GET /api/locations/route/:deviceId` - Get route

### Media
- `GET /api/media` - Get media files
- `POST /api/media` - Upload media
- `GET /api/media/:id` - Get media details
- `DELETE /api/media/:id` - Delete media

### Social Media
- `GET /api/social` - Get social activity
- `GET /api/social/stats` - Social statistics

### Remote Commands
- `POST /api/remote/:deviceId/command` - Send command
- `POST /api/remote/:deviceId/response` - Receive response
- `GET /api/remote/:deviceId/status` - Get device status

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/activity` - Activity feed
- `PUT /api/dashboard/activity/:id/read` - Mark as read
- `GET /api/dashboard/chart-data` - Chart data

## Socket.io Events

### Device → Server
- `device_auth` - Authenticate device
- `heartbeat` - Device heartbeat
- `location_update` - Location update
- `call_event` - Call event
- `message_event` - Message event
- `media_capture` - Media capture
- `command_response` - Command response

### Server → Device
- `auth_success` - Authentication success
- `auth_error` - Authentication error
- `settings_updated` - Settings updated
- `device_unlinked` - Device unlinked
- `remote_command` - Remote command

### Server → Parent
- `device_online` - Device came online
- `device_offline` - Device went offline
- `new_call` - New call received
- `new_message` - New message received
- `location_update` - Location updated
- `new_media` - New media received
- `command_response` - Command response

## Folder Structure

```
kidsafe-backend/
├── config/           # Configuration files
├── src/
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   ├── middleware/   # Middleware
│   ├── services/     # Services (Socket.io)
│   └── utils/        # Utilities
├── uploads/          # Uploaded files
├── server.js         # Main server file
├── package.json
└── .env
```

## License

This software is intended for legal uses only. Make sure you comply with local laws.
