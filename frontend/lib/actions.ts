"use server";

import fs from "fs";
import path from "path";
import {
  getClasses,
  getSources,
  saveClasses,
  saveSources,
} from "@/lib/storage";
import { Class, Source } from "@/types";
import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";

// ✅ Add a new class
export async function addClass(title: string): Promise<string> {
    const classes = await getClasses();
  
    const newClass: Class = {
      id: uuidv4(),
      title,
      emoji: getRandomEmoji(),
      createdAt: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      sourcesCount: 0,
    };
  
    classes.unshift(newClass);
    saveClasses(classes);
  
    // Open a WebSocket connection to the /create/{newClass.id} endpoint
    const ws = new WebSocket(`ws://127.0.0.1:8000/create/${newClass.id}`);
  
    ws.on("open", () => {
      const payload = {
        event: "new_class",
        data: newClass,
      };
      ws.send(JSON.stringify(payload));
      ws.close();
    });
  
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  
    return newClass.id;
  }
  
// ✅ Add a source to a class
export async function addSource(formData: FormData): Promise<Source> {
    const classId = formData.get("classId") as string;
    const title = formData.get("title") as string;
    const file = formData.get("file") as File | null;
  
    if (!file) {
      throw new Error("File is missing.");
    }
  
    const sources = await getSources();
    const classes = await getClasses();
  
    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  
    // Save file to disk
    const filePath = path.join(uploadDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
  
    const newSource: Source = {
      id: uuidv4(),
      title,
      type: getFileType(file.name),
      path: `/uploads/${file.name}`, // Store relative path
    };
  
    if (!sources[classId]) {
      sources[classId] = [];
    }
    sources[classId].push(newSource);
    saveSources(sources);
  
    // Update class sources count
    const classItem = classes.find((c) => c.id === classId);
    if (classItem) {
      classItem.sourcesCount = sources[classId].length;
      saveClasses(classes);
    }
  
    // Notify the FastAPI server via WebSocket at /add_source/
    // This endpoint expects two messages:
    // 1. A message with the class ID.
    // 2. A message with the file path.
    const ws = new WebSocket("ws://127.0.0.1:8000/add_source/");
    
    ws.on("open", () => {
      // Send the class ID as JSON
      const idPayload = { data: classId };
      ws.send(JSON.stringify(idPayload));
      
      // Send the file path as JSON
      const filePathPayload = { file_path: newSource.path };
      ws.send(JSON.stringify(filePathPayload));
      
      ws.close();
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  
    return newSource;
  }

// ✅ Delete a source
export async function deleteSource(
  classId: string,
  sourceId: string
): Promise<void> {
  const sources = await getSources();
  const classes = await getClasses();

  if (sources[classId]) {
    sources[classId] = sources[classId].filter((s) => s.id !== sourceId);
    saveSources(sources);

    // Update sources count in class
    const classItem = classes.find((c) => c.id === classId);
    if (classItem) {
      classItem.sourcesCount = sources[classId].length;
      saveClasses(classes);
    }
  }
}

// ✅ Helper function: Get file type
function getFileType(filename: string): Source["type"] {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "pdf";
  if (extension === "doc" || extension === "docx") return "doc";
  if (extension === "txt") return "txt";
  return "pdf"; // Default
}

// ✅ Helper function: Get random emoji
function getRandomEmoji(): string {
  const emojis = [
    "📚",
    "🤔",
    "🧠",
    "📝",
    "🔬",
    "🧪",
    "🧮",
    "📊",
    "📈",
    "🤖",
    "💻",
  ];
  return emojis[Math.floor(Math.random() * emojis.length)];
}
