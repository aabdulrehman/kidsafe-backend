const { Device, Activity } = require('../models');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Device authentication
    socket.on('device_auth', async (data) => {
      try {
        const { deviceId, type } = data;

        if (type === 'device') {
          // Android device connecting
          const device = await Device.findOneAndUpdate(
            { deviceId },
            { 
              socketId: socket.id,
              isOnline: true,
              lastSeen: new Date()
            },
            { new: true }
          );

          if (device) {
            socket.deviceId = device._id;
            socket.deviceType = 'device';
            socket.join(`device_${device._id}`);
            
            console.log(`Device ${device.deviceName} authenticated`);
            
            socket.emit('auth_success', {
              deviceId: device._id,
              settings: device.settings,
              restrictions: device.restrictions
            });

            // Notify parent
            io.to(`parent_${device.parentId}`).emit('device_online', {
              deviceId: device._id,
              deviceName: device.deviceName
            });
          } else {
            socket.emit('auth_error', { message: 'Device not found' });
          }
        } else if (type === 'parent') {
          // Parent dashboard connecting
          socket.userId = deviceId; // Actually userId in this case
          socket.deviceType = 'parent';
          socket.join(`parent_${deviceId}`);
          
          console.log(`Parent ${deviceId} authenticated`);
          socket.emit('auth_success', { type: 'parent' });
        }
      } catch (error) {
        console.error('Socket auth error:', error);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });

    // Device heartbeat
    socket.on('heartbeat', async (data) => {
      try {
        if (socket.deviceType === 'device' && socket.deviceId) {
          await Device.findByIdAndUpdate(socket.deviceId, {
            isOnline: true,
            lastSeen: new Date(),
            batteryLevel: data.batteryLevel,
            isCharging: data.isCharging,
            networkType: data.networkType,
            signalStrength: data.signalStrength
          });
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    });

    // Location update
    socket.on('location_update', async (data) => {
      try {
        if (socket.deviceType === 'device' && socket.deviceId) {
          // Emit to parent
          const device = await Device.findById(socket.deviceId);
          if (device) {
            io.to(`parent_${device.parentId}`).emit('location_update', {
              deviceId: socket.deviceId,
              ...data
            });
          }
        }
      } catch (error) {
        console.error('Location update error:', error);
      }
    });

    // Call event
    socket.on('call_event', async (data) => {
      try {
        if (socket.deviceType === 'device' && socket.deviceId) {
          const device = await Device.findById(socket.deviceId);
          if (device) {
            io.to(`parent_${device.parentId}`).emit('call_event', {
              deviceId: socket.deviceId,
              deviceName: device.deviceName,
              ...data
            });
          }
        }
      } catch (error) {
        console.error('Call event error:', error);
      }
    });

    // Message event
    socket.on('message_event', async (data) => {
      try {
        if (socket.deviceType === 'device' && socket.deviceId) {
          const device = await Device.findById(socket.deviceId);
          if (device) {
            io.to(`parent_${device.parentId}`).emit('message_event', {
              deviceId: socket.deviceId,
              deviceName: device.deviceName,
              ...data
            });
          }
        }
      } catch (error) {
        console.error('Message event error:', error);
      }
    });

    // Screenshot/photo capture
    socket.on('media_capture', async (data) => {
      try {
        if (socket.deviceType === 'device' && socket.deviceId) {
          const device = await Device.findById(socket.deviceId);
          if (device) {
            io.to(`parent_${device.parentId}`).emit('media_capture', {
              deviceId: socket.deviceId,
              deviceName: device.deviceName,
              ...data
            });
          }
        }
      } catch (error) {
        console.error('Media capture error:', error);
      }
    });

    // Command response from device
    socket.on('command_response', async (data) => {
      try {
        if (socket.deviceType === 'device' && socket.deviceId) {
          const device = await Device.findById(socket.deviceId);
          if (device) {
            io.to(`parent_${device.parentId}`).emit('command_response', {
              deviceId: socket.deviceId,
              ...data
            });

            // Log activity
            const activity = new Activity({
              deviceId: socket.deviceId,
              parentId: device.parentId,
              activityType: 'REMOTE_COMMAND_EXECUTED',
              title: `Command ${data.status}`,
              description: `Remote command execution ${data.status.toLowerCase()}`,
              data: { commandId: data.commandId, status: data.status },
              timestamp: new Date()
            });
            await activity.save();
          }
        }
      } catch (error) {
        console.error('Command response error:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      try {
        if (socket.deviceType === 'device' && socket.deviceId) {
          const device = await Device.findByIdAndUpdate(
            socket.deviceId,
            { 
              isOnline: false,
              socketId: null
            },
            { new: true }
          );

          if (device) {
            // Notify parent
            io.to(`parent_${device.parentId}`).emit('device_offline', {
              deviceId: socket.deviceId,
              deviceName: device.deviceName
            });
          }
        }
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });
  });
};
