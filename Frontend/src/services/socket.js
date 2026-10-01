import { io } from "socket.io-client";

const socket = io(
  import.meta.env.VITE_SOCKET_URL || "http://localhost:9430",
  {
    autoConnect: false,
    transports: ["websocket"],
  }
);

export default socket;