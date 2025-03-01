export interface Class {
  id: string;
  title: string;
  emoji: string;
  createdAt: string;
  sourcesCount: number;
}

export interface Source {
  id: string;
  title: string;
  type: 'pdf' | 'doc' | 'txt' | 'url';
  selected?: boolean;
  path: string;
}

export interface Conversation {
  id: string;
  classId: string;
  messages: Message[];
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export type DataStructure = {
  classes: Class[];
  sources: Record<string, Source[]>;
};