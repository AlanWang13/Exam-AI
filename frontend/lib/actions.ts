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
