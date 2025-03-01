"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

// Create a context for the WebSocket connection
const WebSocketContext = createContext<WebSocket | null>(null);

export const WebSocketProvider: React.FC<{ url: string; children: React.ReactNode }> = ({
  url,
  children,
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Create the WebSocket connection
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket connection established.");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event);
    };

    setSocket(ws);

    // Cleanup function: close the connection when the provider unmounts
    return () => {
      ws.close();
    };
  }, [url]);

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to access the WebSocket connection
export const useWebSocket = () => {
  return useContext(WebSocketContext);
};
