"use client";

import { notFound, useRouter } from "next/navigation";
import { SourceList } from "@/components/source-list";
import { ChatInterface } from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getClasses, getSources } from "@/lib/storage";
import { Class, Source } from "@/types";

interface ClassPageProps {
  params: {
    id: string;
  };
}

export default function ClassPage({ params }: ClassPageProps) {
  const [classItem, setClassItem] = useState<Class | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const router = useRouter();

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

  if (!classItem) return <div>Loading...</div>; // Prevent rendering before data loads

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
          <h2 className="font-semibold">ExamLM</h2>
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
                <Share className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <ChatInterface 
            classId={classItem.id} 
            className={classItem.title}
            sourcesCount={sources.length}
          />
        </div>
      </div>
      
      {/* Right sidebar - Studio */}
      <div className="w-80 border-l flex-shrink-0 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Studio</h2>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-4 border-b">
          <h3 className="font-medium mb-4">Audio Overview</h3>
          <div className="bg-card rounded-lg p-4 flex items-center gap-3 mb-4">
            <div className="bg-secondary rounded-full p-2">
              <div className="h-8 w-8 flex items-center justify-center">🎙️</div>
            </div>
            <div>
              <p className="font-medium">Deep Dive conversation</p>
              <p className="text-sm text-muted-foreground">Two hosts (English only)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full">Customize</Button>
            <Button className="w-full">Generate</Button>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-medium mb-4">Notes</h3>
          <Button variant="outline" className="w-full mb-4">Add note</Button>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button variant="outline" className="w-full flex items-center gap-2 justify-start">
              <span className="text-lg">📝</span>
              <span>Study guide</span>
            </Button>
            <Button variant="outline" className="w-full flex items-center gap-2 justify-start">
              <span className="text-lg">📄</span>
              <span>Briefing doc</span>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full flex items-center gap-2 justify-start">
              <span className="text-lg">❓</span>
              <span>FAQ</span>
            </Button>
            <Button variant="outline" className="w-full flex items-center gap-2 justify-start">
              <span className="text-lg">⏱️</span>
              <span>Timeline</span>
            </Button>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-sm text-muted-foreground">
              Saved notes will appear here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Save a chat message to create a new note, or click Add note above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
