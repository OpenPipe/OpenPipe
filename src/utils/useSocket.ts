import { type ChatCompletion } from "openai/resources/chat";
import { useRef, useState, useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { env } from "~/env.mjs";

const url = env.NEXT_PUBLIC_SOCKET_URL;

export default function useSocket(channelId?: string) {
  const socketRef = useRef<Socket>();
  const [message, setMessage] = useState<ChatCompletion | null>(null);

  useEffect(() => {
    // Create websocket connection
    socketRef.current = io(url);

    socketRef.current.on("connect", () => {
      // Join the specific room
      if (channelId) {
        socketRef.current?.emit("join", channelId);

        // Listen for 'message' events
        socketRef.current?.on("message", (message: ChatCompletion) => {
          setMessage(message);
        });
      }
    });

    // Unsubscribe and disconnect on cleanup
    return () => {
      if (socketRef.current) {
        if (channelId) {
          socketRef.current.off("message");
        }
        socketRef.current.disconnect();
      }
      setMessage(null);
    };
  }, [channelId]);

  return message;
}
