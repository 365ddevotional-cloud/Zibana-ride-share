import { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import type { RequestHandler } from "express";
import { activeTrip, canTrack, getLiveLink, validIdentity } from "./tracking-policy";
let io: SocketIOServer | null = null;
const identifier = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 256;
async function identity(socket: Socket): Promise<string | null> {
  const request = socket.request as any;
  if (!request.session?.reload) return null;
  try {
    await new Promise<void>((resolve, reject) => request.session.reload((err: any) => err ? reject(err) : resolve()));
    return validIdentity(request.session.passport?.user);
  } catch { return null; }
}
export function setupSocketIO(httpServer: HttpServer, sessionMiddleware: RequestHandler): SocketIOServer {
  if (!sessionMiddleware) throw new Error("Tracking requires the configured authentication session");
  io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: { origin: process.env.APP_BASE_URL, credentials: true, methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });
  io.engine.use(sessionMiddleware as any);
  io.on("connection", (socket) => {
    socket.data.drivers = new Set<string>();
    socket.data.trips = new Set<string>();
    for (const kind of ["driver", "trip"] as const) {
      socket.on(`join:${kind}`, async (id: unknown) => {
        try {
          const userId = await identity(socket);
          const subscriptions: Set<string> = socket.data[kind === "driver" ? "drivers" : "trips"];
          if (!identifier(id) || !userId || subscriptions.size >= 20 ||
            !await canTrack(userId, kind === "driver" ? { driverId: id } : { tripId: id })) {
            socket.emit("tracking:denied"); return;
          }
          subscriptions.add(id);
        } catch { socket.emit("tracking:denied"); }
      });
      socket.on(`leave:${kind}`, (id: unknown) => {
        if (identifier(id)) socket.data[kind === "driver" ? "drivers" : "trips"].delete(id);
      });
    }
    socket.on("join:publicToken", async (token: unknown) => {
      delete socket.data.publicToken;
      try {
        if (!identifier(token) || !await getLiveLink(token)) { socket.emit("token:invalid"); return; }
        socket.data.publicToken = token;
      } catch { socket.emit("token:invalid"); }
    });
  });
  return io;
}
export function getIO(): SocketIOServer | null { return io; }
export async function emitDriverLocation(driverId: string, data: any, tripId?: string | null) {
  if (!io) return;
  const payload = { ...data, driverId };
  // Revalidate every update; public tokens never join private tracking rooms.
  await Promise.all(Array.from(io.sockets.sockets.values()).map(async socket => {
    try {
      const watchesDriver = socket.data.drivers?.has(driverId);
      const watchesTrip = tripId && socket.data.trips?.has(tripId);
      if (watchesDriver || watchesTrip) {
        const userId = await identity(socket);
        const { storage } = await import("./storage");
        const trip = watchesTrip ? await storage.getTripById(tripId!) : null;
        const allowed = userId && (
          (watchesDriver && await canTrack(userId, { driverId })) ||
          (watchesTrip && activeTrip(trip) && trip.driverId === driverId && await canTrack(userId, { tripId: tripId! }))
        );
        if (allowed && socket.connected) socket.emit("driver:location", payload);
      }
      if (socket.data.publicToken) {
        const link = await getLiveLink(socket.data.publicToken);
        if (!link) { delete socket.data.publicToken; socket.emit("token:invalid"); }
        else if (link.driverId === driverId && link.tripId === tripId && socket.connected) {
          socket.emit("driver:location", { driverId, lat: data.lat, lng: data.lng, heading: data.heading, speed: data.speed, updatedAt: data.updatedAt });
        }
      }
    } catch { /* Fail closed without exposing private session/token details. */ }
  }));
}
