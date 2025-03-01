"use server";

import fs from "fs";
import path from "path";
import { DataStructure, Class, Source } from "@/types";
import { v4 as uuidv4 } from "uuid";

const classesPath = path.join(process.cwd(), "lib", "classes.json");
const sourcesPath = path.join(process.cwd(), "lib", "sources.json");

// ✅ Utility to read JSON file
function readJSON<T>(filePath: string, defaultValue: T): T {
  if (!fs.existsSync(filePath)) return defaultValue;
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
}

// ✅ Utility to write JSON file
function writeJSON<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ✅ Load data from JSON files
export async function getClasses(): Promise<Class[]> {
  return readJSON<Class[]>(classesPath, []);
}

export async function getSources(): Promise<Record<string, Source[]>> {
  return readJSON<Record<string, Source[]>>(sourcesPath, {});
}

// ✅ Save updated classes
export async function saveClasses(classes: Class[]): Promise<void> {
  writeJSON(classesPath, classes);
}

// ✅ Save updated sources
export async function saveSources(sources: Record<string, Source[]>): Promise<void> {
  writeJSON(sourcesPath, sources);
}
