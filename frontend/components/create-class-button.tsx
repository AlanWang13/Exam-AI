"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { addClass } from "@/lib/actions";
import { useWebSocket } from "@/hooks/websocket-context";

export function CreateClassButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const ws = useWebSocket();

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsLoading(true);
    try {
      // Call the server action to add the class.
      const newClass = await addClass(title);
      
      // Use the existing WebSocket connection to notify your FastAPI server.
      if (ws && ws.readyState === WebSocket.OPEN) {
        const payload = {
          event: "new_class",
          data: newClass,
        };
        ws.send(JSON.stringify(payload));
      } else {
        console.warn("WebSocket connection is not open.");
      }
      
      toast({
        title: "Class created",
        description: "Your new class has been created successfully.",
      });
      setTitle("");
      router.push(`/class/${newClass.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create class. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Create new
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new class</DialogTitle>
          <DialogDescription>
            Add a title for your new class. You can add sources later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              placeholder="e.g., CS 101: Introduction to Programming" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleCreate} 
            disabled={!title.trim() || isLoading}
          >
            {isLoading ? "Creating..." : "Create class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}