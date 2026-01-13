
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
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  buttons?: string[];
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  unreadCount: number;
}

export interface CampaignGroup {
  id: string;
  name: string;
  contacts: string[]; // Array of contact IDs (JIDs)
  createdAt: Date;
}

export interface BlastHistory {
  id: string;
  campaignName: string;
  message: string;
  timestamp: Date;
  recipients: string[]; // List of JIDs
  status: 'completed' | 'failed' | 'processing';
}

export interface KnowledgeItem {
  id: string;
  category: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  buttons?: string[]; // List of button labels
}

export interface SMEConfig {
  businessName: string;
  description: string;
  autoReplyEnabled: boolean;
  autoReplyPrompt: string;
  knowledgeBase: KnowledgeItem[];
}
