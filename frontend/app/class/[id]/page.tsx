"use client";

import { notFound, useRouter } from "next/navigation";
import { SourceList } from "@/components/source-list";
import { ChatInterface } from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share, Settings, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getClasses, getSources } from "@/lib/storage";
import { Class, Source } from "@/types";

interface ClassPageProps {
  params: {
    id: string;
  };
}

type DocumentType = "exam" | "study_guide" | "briefing" | "faq" | "timeline";

interface GeneratedDocument {
  type: DocumentType;
  content: string;
  title: string;
}

export default function ClassPage({ params }: ClassPageProps) {
  const [classItem, setClassItem] = useState<Class | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const router = useRouter();
  const [examFormat, setExamFormat] = useState("");
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);
  const [currentDocument, setCurrentDocument] = useState<GeneratedDocument | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const classes = await getClasses();
      const foundClass = classes.find((c) => c.id === params.id);

      if (!foundClass) {
        notFound();
        return;
      }

      setClassItem(foundClass);

      const classSources = await getSources();
      setSources(classSources[params.id] || []);
    }

    fetchData();
  }, [params.id]);

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocket(`ws://127.0.0.1:8000/query/`);
    
    ws.onopen = () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
      
      // Send the classId as the first message
      ws.send(JSON.stringify({ data: params.id }));
    };
    
    // onmessage is now handled exclusively in ChatInterface
    
    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
      setIsGenerating(false);
    };
    
    setSocket(ws);
    
    return () => {
      ws.close();
    };
  }, [params.id]);

  const getDocumentTitle = (type: DocumentType, className: string): string => {
    switch (type) {
      case "exam":
        return `${className} Exam`;
      case "study_guide":
        return `${className} Study Guide`;
      case "briefing":
        return `${className} Briefing Document`;
      case "faq":
        return `${className} FAQ`;
      case "timeline":
        return `${className} Timeline`;
      default:
        return `${className} Document`;
    }
  };

  const generateDocument = (type: DocumentType) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Set generating flag
    setIsGenerating(true);
    
    // Create a temporary current document to track what's being generated
    const tempDocument: GeneratedDocument = {
      type,
      content: "",
      title: getDocumentTitle(type, classItem?.title || "Document")
    };
    setCurrentDocument(tempDocument);
    
    // Send request to generate document
    socket.send(JSON.stringify({
      type: "generate_document",
      document_type: type,
      format: type === "exam" ? examFormat : "",
      classId: params.id
    }));
    
    // Set up a listener specifically for this document generation
    const originalOnMessage = socket.onmessage;
    
    // Custom document generation message handler
    const documentGenerationHandler = (event: MessageEvent) => {
      try {
        // Process the document
        handleDocumentGenerated(event.data);
        
        // Reset the message handler when done
        socket.onmessage = originalOnMessage;
      } catch (error) {
        console.error("Error in document generation handler:", error);
        // Reset the handler even on error
        socket.onmessage = originalOnMessage;
        setIsGenerating(false);
      }
    };
    
    // Set the custom handler
    socket.onmessage = documentGenerationHandler;
    
    // Safety timeout to reset handler after 60 seconds if nothing happens
    setTimeout(() => {
      if (socket.onmessage === documentGenerationHandler) {
        console.log("Resetting document generation handler due to timeout");
        socket.onmessage = originalOnMessage;
        setIsGenerating(false);
      }
    }, 60000);
  };

  const handleDocumentGenerated = (documentData: string) => {
    try {
      // Try to parse as JSON first
      try {
        const jsonResponse = JSON.parse(documentData);
        console.log("JSON response:", jsonResponse);
        if (jsonResponse.type && jsonResponse.content) {
          const newDocument: GeneratedDocument = {
            type: jsonResponse.type as DocumentType,
            content: jsonResponse.content,
            title: getDocumentTitle(jsonResponse.type as DocumentType, classItem?.title || "Document")
          };
          console.log("Generated document:", newDocument);
          
          setGeneratedDocuments(prev => [...prev, newDocument]);
          setCurrentDocument(newDocument);
        } else {
          // Fallback for simple string responses (assuming it's for the current type)
          if (currentDocument) {
            const newDocument: GeneratedDocument = {
              ...currentDocument,
              content: documentData
            };
            setGeneratedDocuments(prev => 
              prev.map(doc => doc.type === currentDocument.type ? newDocument : doc)
            );
            setCurrentDocument(newDocument);
          }
        }
      } catch (jsonError) {
        // Treat as markdown string for current document type
        if (currentDocument) {
          const newDocument: GeneratedDocument = {
            ...currentDocument,
            content: documentData
          };
          setGeneratedDocuments(prev => 
            prev.map(doc => doc.type === currentDocument.type ? newDocument : doc)
          );
          setCurrentDocument(newDocument);
        }
      }
      setIsGenerating(false);
    } catch (error) {
      console.error("Error handling document generation:", error);
      setIsGenerating(false);
    }
  };

  const downloadDocument = (document: GeneratedDocument) => {
    if (!document?.content) return;
    
    // Create a Blob with the markdown content
    const blob = new Blob([document.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary download link
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title}.md`;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
  };

  if (!classItem)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    ); // Prevent rendering before data loads

  return (
    <div className="flex h-screen bg-background">
      {/* Left sidebar - Sources */}
      <div className="w-80 border-r flex-shrink-0 flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h2 className="font-semibold">ExamAI</h2>
        </div>
        <SourceList sources={sources} classId={params.id} />
      </div>

      {/* Main content - Chat */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="font-semibold">{classItem.title}</h2>
            <div className="flex items-center gap-2">
             
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <ChatInterface
            classId={classItem.id}
            className={classItem.title}
            sourcesCount={sources.length}
            socket={socket}
            isConnected={isConnected}
            onDocumentGenerated={handleDocumentGenerated}
            isGeneratingDocument={isGenerating}
          />
        </div>
      </div>

      {/* Right sidebar - Studio */}
      <div className="w-80 border-l flex-shrink-0 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Study Material Generator</h2>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 border-b">
          <h3 className="font-medium mb-4">Exam Format</h3>

          {/* Textarea for custom exam format */}
          <textarea
            className="w-full h-40 p-2 border rounded-lg mb-4 text-left align-top resize-none"
            placeholder="Enter exam format (e.g., multiple-choice, essay)..."
            value={examFormat}
            onChange={(e) => setExamFormat(e.target.value)}
            disabled={isGenerating}
          />

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full" disabled={isGenerating}>
              Customize
            </Button>
            <Button 
              className="w-full" 
              onClick={() => generateDocument("exam")}
              disabled={!isConnected || isGenerating || !examFormat.trim()}
            >
              {isGenerating && currentDocument?.type === "exam" ? (
                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
              ) : null}
              Generate Exam
            </Button>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-medium mb-4">Study Materials</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button
              variant="outline"
              className="w-full flex items-center gap-2 justify-start"
              onClick={() => generateDocument("study_guide")}
              disabled={!isConnected || isGenerating}
            >
              {isGenerating && currentDocument?.type === "study_guide" ? (
                <div className="h-4 w-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
              ) : (
                <span className="text-lg">📝</span>
              )}
              <span>Study guide</span>
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center gap-2 justify-start"
              onClick={() => generateDocument("briefing")}
              disabled={!isConnected || isGenerating}
            >
              {isGenerating && currentDocument?.type === "briefing" ? (
                <div className="h-4 w-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
              ) : (
                <span className="text-lg">📄</span>
              )}
              <span>Briefing doc</span>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full flex items-center gap-2 justify-start"
              onClick={() => generateDocument("faq")}
              disabled={!isConnected || isGenerating}
            >
              {isGenerating && currentDocument?.type === "faq" ? (
                <div className="h-4 w-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
              ) : (
                <span className="text-lg">❓</span>
              )}
              <span>FAQ</span>
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center gap-2 justify-start"
              onClick={() => generateDocument("timeline")}
              disabled={!isConnected || isGenerating}
            >
              {isGenerating && currentDocument?.type === "timeline" ? (
                <div className="h-4 w-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
              ) : (
                <span className="text-lg">⏱️</span>
              )}
              <span>Timeline</span>
            </Button>
          </div>
        </div>

        {generatedDocuments.length > 0 && (
          <div className="p-4 border-t">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Generated Documents</h3>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {generatedDocuments.map((doc, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
                  onClick={() => setCurrentDocument(doc)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {doc.type === "exam" && "📝"}
                      {doc.type === "study_guide" && "📚"}
                      {doc.type === "briefing" && "📄"}
                      {doc.type === "faq" && "❓"}
                      {doc.type === "timeline" && "⏱️"}
                    </span>
                    <span className="font-medium text-sm truncate max-w-40">{doc.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation(); 
                      downloadDocument(doc);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentDocument && (
          <div className="p-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">{currentDocument.title}</h3>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => downloadDocument(currentDocument)}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto border rounded p-2 text-sm">
              <pre className="whitespace-pre-wrap">{currentDocument.content.substring(0, 200)}...</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}