import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function setupSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    socket.on("join:driver", (driverId: string) => {
      socket.join(`driver:${driverId}`);
    });

    socket.on("join:trip", (tripId: string) => {
      socket.join(`trip:${tripId}`);
    });

    socket.on("join:publicToken", async (token: string) => {
      const { storage } = await import("./storage");
      const link = await storage.getEmergencyTrackingLink(token);
      if (!link || link.revokedAt || new Date(link.expiresAt) < new Date()) {
        socket.emit("token:invalid");
        return;
      }
      socket.join(`token:${token}`);
      if (link.tripId) socket.join(`trip:${link.tripId}`);
      socket.join(`driver:${link.driverId}`);
    });

    socket.on("leave:driver", (driverId: string) => {
      socket.leave(`driver:${driverId}`);
    });

    socket.on("leave:trip", (tripId: string) => {
      socket.leave(`trip:${tripId}`);
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitDriverLocation(driverId: string, data: any, tripId?: string | null) {
  if (!io) return;
  const payload = { driverId, ...data };
  io.to(`driver:${driverId}`).emit("driver:location", payload);
  if (tripId) {
    io.to(`trip:${tripId}`).emit("driver:location", payload);
  }
}
