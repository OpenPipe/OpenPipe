import { useRef, useState, useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { env } from "~/env.mjs";

const url = env.NEXT_PUBLIC_SOCKET_URL;

export default function useSocket<T>(channel?: string | null) {
  const socketRef = useRef<Socket>();
  const [message, setMessage] = useState<T | null>(null);

  useEffect(() => {
    if (!channel) return;

    console.log("connecting to channel", channel);
    // Create websocket connection
    socketRef.current = io(url);

    socketRef.current.on("connect", () => {
      // Join the specific room
      socketRef.current?.emit("join", channel);

      // Listen for 'message' events
      socketRef.current?.on("message", (message: T) => {
        setMessage(message);
      });
    });

    // Unsubscribe and disconnect on cleanup
    return () => {
      if (socketRef.current) {
        if (channel) {
          socketRef.current.off("message");
        }
        socketRef.current.disconnect();
        socketRef.current = undefined;
      }
      setMessage(null);
    };
  }, [channel]);

  return message;
}
