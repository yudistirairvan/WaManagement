
export type UserRole = 'admin' | 'operator';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  isMine: boolean;
  status?: 'sent' | 'received' | 'read';
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  unreadCount: number;
}

export interface BlastHistory {
  id: string;
  message: string;
  timestamp: Date;
  recipientCount: number;
  status: 'completed' | 'failed' | 'processing';
}

export interface KnowledgeItem {
  id: string;
  category: string;
  content: string;
}

export interface ActivityLog {
  id: string;
  type: 'system' | 'ai' | 'blast' | 'contact' | 'auth';
  action: string;
  user: string;
  timestamp: Date;
}

export interface SMEConfig {
  businessName: string;
  description: string;
  autoReplyEnabled: boolean;
  autoReplyPrompt: string;
  knowledgeBase: KnowledgeItem[];
}
