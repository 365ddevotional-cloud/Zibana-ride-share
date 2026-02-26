import { io, Socket } from "socket.io-client";
import { API_BASE } from "./apiBase";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE || window.location.origin, {
      path: "/ws",
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}

export function joinDriver(driverId: string) {
  getSocket().emit("join:driver", driverId);
}

export function leaveDriver(driverId: string) {
  getSocket().emit("leave:driver", driverId);
}

export function joinTrip(tripId: string) {
  getSocket().emit("join:trip", tripId);
}

export function leaveTrip(tripId: string) {
  getSocket().emit("leave:trip", tripId);
}

export function joinPublicToken(token: string) {
  getSocket().emit("join:publicToken", token);
}

export interface LocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  battery: number | null;
  isMoving: boolean | null;
  updatedAt: string;
}

export function onDriverLocation(callback: (data: LocationUpdate) => void): () => void {
  const s = getSocket();
  s.on("driver:location", callback);
  return () => {
    s.off("driver:location", callback);
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
