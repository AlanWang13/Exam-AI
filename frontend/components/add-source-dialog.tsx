"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { addSource } from "@/lib/actions";
import { Source } from "@/types";
import { FileUp } from "lucide-react";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  onSourceAdded: (source: Source) => void;
}

export function AddSourceDialog({ 
  open, 
  onOpenChange, 
  classId, 
  onSourceAdded 
}: AddSourceDialogProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Auto-fill title with filename if empty
      if (!title) {
        setTitle(selectedFile.name);
      }
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !file) return;
    
    setIsLoading(true);
    try {
        const formData = new FormData();
        formData.append("classId", classId);
        formData.append("title", title);
        formData.append("file", file); // Append the file
    
        console.log("file before sending:", file.name); // Ensure file is valid before sending
    
        const newSource = await addSource(formData);
      onSourceAdded(newSource);
      toast({
        title: "Source added",
        description: "Your source has been added to the class.",
      });
      setTitle("");
      setFile(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add source. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new source</DialogTitle>
          <DialogDescription>
            Upload a document to use as a source for this class.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              placeholder="e.g., Lecture Notes Week 1" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="file">File</Label>
            <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
              {file ? (
                <div className="text-center">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setFile(null)}
                  >
                    Change file
                  </Button>
                </div>
              ) : (
                <>
                  <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop your file here, or click to browse
                  </p>
                  <Input 
                    id="file" 
                    type="file" 
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById("file")?.click()}
                  >
                    Browse files
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || !file || isLoading}
          >
            {isLoading ? "Adding..." : "Add source"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}