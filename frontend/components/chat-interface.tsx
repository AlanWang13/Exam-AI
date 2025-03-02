"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Save } from "lucide-react";
import { Message } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";


interface ChatInterfaceProps {
  classId: string;
  className: string;
  initialMessages?: Message[];
  sourcesCount: number;
}

interface ChatResponse {
  response: string;
  questions: string[];
}

export function ChatInterface({ 
  classId, 
  className,
  initialMessages = [],
  sourcesCount
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [sources, setSources] = useState<Array<{title: string; content: string; page?: number}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocket(`ws://127.0.0.1:8000/query/`);
    
    ws.onopen = () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
      
      // Send the classId as the first message
      ws.send(JSON.stringify({ data: classId }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = event.data;
        // First, try to parse as JSON
        try {
          const jsonResponse = JSON.parse(data);
          handleJsonResponse(jsonResponse);
        } catch (jsonError) {
          // If not valid JSON, treat as string
          handleStringResponse(data);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error handling WebSocket response:", error);
        setIsLoading(false);
      }
    };
    
    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
      setIsLoading(false);
    };
    
    setSocket(ws);
    
    return () => {
      ws.close();
    };
  }, [classId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handler for the new JSON response format
  const handleJsonResponse = (response: ChatResponse) => {
    const aiResponse: Message = {
      id: Date.now().toString(),
      content: response.response,
      role: "assistant",
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, aiResponse]);
    setSuggestedQuestions(response.questions || []);
    // Clear sources if not provided in this format
    setSources([]);
  };

  // Handler for the old format or string responses
  const handleStringResponse = (responseString: string) => {
    const aiResponse: Message = {
      id: Date.now().toString(),
      content: responseString,
      role: "assistant",
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, aiResponse]);
    // Clear suggestions and sources for simple string responses
    setSuggestedQuestions([]);
    setSources([]);
  };

  const handleSendMessage = () => {
    if (!input.trim() || !isConnected || isLoading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);
    
    // Send message to WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ message: input }));
    } else {
      console.error("WebSocket is not connected");
      setIsLoading(false);
    }
    
    setInput("");
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center mb-2">
          <div className="text-3xl mr-3">🤔</div>
          <h2 className="text-2xl font-semibold">{className}</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          {sourcesCount} sources
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="text-4xl mb-4">🤔</div>
            <h3 className="text-lg font-semibold mb-2">{className}</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              This collection of sources can be used to create exams and study materials. 
              Ask questions about the content to generate exam questions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "assistant" ? "justify-start" : "justify-end"
                )}
              >
                <div className="flex items-start max-w-[80%] space-x-2">
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>AI</AvatarFallback>
                      <AvatarImage src="/ai-avatar.png" />
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm",
                      message.role === "assistant"
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {message.content}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Suggested questions section */}
      {suggestedQuestions.length > 0 ? (
        <div className="border-t p-3 bg-muted/20">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-1">Suggested questions:</h4>
            <div className="flex flex-wrap gap-1">
              {suggestedQuestions.map((question, index) => (
                <Button 
                  key={index} 
                  variant="outline" 
                  size="sm" 
                  className="text-xs py-1 h-auto"
                  onClick={() => handleSuggestedQuestion(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Sources section - only shown if there are sources */}
      {sources.length > 0 && (
        <div className="border-t p-3 bg-muted/20">
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-muted-foreground mb-1">Sources:</h4>
            <div className="text-xs max-h-24 overflow-y-auto">
              {sources.map((source, index) => (
                <div key={index} className="mb-1">
                  <span className="font-semibold">{source.title}</span>
                  {source.page && <span> (p. {source.page})</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder={isConnected ? "Start typing..." : "Connecting..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] resize-none"
            disabled={!isConnected || isLoading}
          />
          <div className="flex flex-col gap-2">
            <Button 
              size="icon" 
              onClick={handleSendMessage} 
              disabled={!input.trim() || !isConnected || isLoading}
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            <Button size="icon" variant="outline">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-muted-foreground">
            {isConnected ? `${sourcesCount} sources` : "Connecting..."}
          </div>
          {isLoading && (
            <div className="text-xs text-muted-foreground">
              Processing your question...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}