import { Server } from 'socket.io';

interface SignalPayload {
  roomId: string;
  data: Record<string, unknown>;
}

const signaling = (io: Server) => {
  io.on('connection', (socket) => {
    socket.on('join', (roomId: string) => {
      socket.join(roomId);
    });

    socket.on('signal', (payload: SignalPayload) => {
      socket.to(payload.roomId).emit('signal', { ...payload.data, from: socket.id });
    });
  });
};

export default signaling;
