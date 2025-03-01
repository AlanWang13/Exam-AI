"use client";

import { Source } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileIcon, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { AddSourceDialog } from "@/components/add-source-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteSource } from "@/lib/actions";

interface SourceListProps {
  sources: Source[];
  classId: string;
  onSourceSelect?: (sourceId: string, selected: boolean) => void;
}

export function SourceList({ sources, classId, onSourceSelect }: SourceListProps) {
  const [localSources, setLocalSources] = useState<Source[]>(
    sources.map(source => ({ ...source, selected: true }))
  );

  useEffect(() => {
    console.log("Updating localSources:", sources);
    setLocalSources(sources.map(source => ({ ...source, selected: true })));
  }, [sources]);

  
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const { toast } = useToast();

  const handleSourceSelect = (sourceId: string, checked: boolean) => {
    setLocalSources(prev => 
      prev.map(source => 
        source.id === sourceId ? { ...source, selected: checked } : source
      )
    );
    
    if (onSourceSelect) {
      onSourceSelect(sourceId, checked);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setLocalSources(prev => 
      prev.map(source => ({ ...source, selected: checked }))
    );
    
    if (onSourceSelect) {
      localSources.forEach(source => {
        onSourceSelect(source.id, checked);
      });
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await deleteSource(classId, sourceId);
      setLocalSources(prev => prev.filter(source => source.id !== sourceId));
      toast({
        title: "Source deleted",
        description: "The source has been removed from this class.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete source. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSourceAdded = (newSource: Source) => {
    setLocalSources(prev => [...prev, { ...newSource, selected: true }]);
    setIsAddSourceOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-semibold">Sources</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1"
          onClick={() => setIsAddSourceOpen(true)}
        >
          <PlusCircle className="h-4 w-4" />
          Add source
        </Button>
      </div>
      
      <div className="p-2 border-b">
        <div className="flex items-center space-x-2 px-2 py-1">
          <Checkbox 
            id="select-all" 
            checked={localSources.every(s => s.selected)}
            onCheckedChange={(checked) => handleSelectAll(!!checked)}
          />
          <label htmlFor="select-all" className="text-sm cursor-pointer">
            Select all sources
          </label>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {localSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-sm text-muted-foreground">
                No sources added yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Add source" to upload documents
              </p>
            </div>
          ) : (
            localSources.map((source) => (
              <div key={source.id} className="flex items-center justify-between px-2 py-1 group hover:bg-secondary/50 rounded-md">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={source.id} 
                    checked={source.selected}
                    onCheckedChange={(checked) => handleSourceSelect(source.id, !!checked)}
                  />
                  <label htmlFor={source.id} className="flex items-center text-sm cursor-pointer">
                    <FileIcon className="h-4 w-4 mr-2 text-red-500" />
                    {source.title}
                  </label>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100 h-8 w-8"
                  onClick={() => handleDeleteSource(source.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <AddSourceDialog 
        open={isAddSourceOpen} 
        onOpenChange={setIsAddSourceOpen}
        classId={classId}
        onSourceAdded={handleSourceAdded}
      />
    </div>
  );
}
