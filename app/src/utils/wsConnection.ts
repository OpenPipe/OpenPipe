import { io } from "socket.io-client";
import { env } from "~/env.mjs";

export const wsConnection = io(env.NEXT_PUBLIC_SOCKET_URL);
