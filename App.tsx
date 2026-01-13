
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from './constants';
import { Contact, Message, SMEConfig, User, KnowledgeItem, CampaignGroup, BlastHistory } from './types';
import { getAIResponse } from './geminiService';
import { io, Socket } from "socket.io-client";

// Import Separated Components
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { KnowledgeView } from './components/KnowledgeView';
import { BlastView } from './components/BlastView';
import { SettingsView } from './components/SettingsView';
import { ContactsView } from './components/ContactsView';
import { CampaignHistoryView } from './components/CampaignHistoryView';

const DEFAULT_SOCKET_URL = "http://localhost:4000";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('sme_user_session');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Added missing state variables for login
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);

  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem('sme_backend_url') || DEFAULT_SOCKET_URL);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('sme_gemini_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'blast' | 'history' | 'knowledge' | 'settings' | 'contacts'>(() => {
    const savedTab = localStorage.getItem('sme_active_tab');
    return (savedTab as any) || 'chats';
  });

  const [campaignGroups, setCampaignGroups] = useState<CampaignGroup[]>(() => {
    const saved = localStorage.getItem('sme_campaign_groups');
    return saved ? JSON.parse(saved) : [];
  });

  const [blastHistory, setBlastHistory] = useState<BlastHistory[]>(() => {
    const saved = localStorage.getItem('sme_blast_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [baileysStatus, setBaileysStatus] = useState<'initial' | 'qr' | 'connecting' | 'connected' | 'error'>('initial');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const savedContacts = localStorage.getItem('sme_contacts_cache');
    return savedContacts ? JSON.parse(savedContacts) : [];
  });

  const [config, setConfig] = useState<SMEConfig>(() => {
    const saved = localStorage.getItem('sme_bot_config');
    return saved ? JSON.parse(saved) : {
      businessName: 'Toko Saya',
      description: 'UMKM Bergerak di bidang jasa/produk',
      autoReplyEnabled: true,
      autoReplyPrompt: 'Ramah dan membantu',
      knowledgeBase: []
    };
  });

  const configRef = useRef(config);
  const apiKeyRef = useRef(geminiApiKey);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => { localStorage.setItem('sme_active_tab', activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem('sme_campaign_groups', JSON.stringify(campaignGroups)); }, [campaignGroups]);
  useEffect(() => { localStorage.setItem('sme_blast_history', JSON.stringify(blastHistory)); }, [blastHistory]);
  useEffect(() => { configRef.current = config; localStorage.setItem('sme_bot_config', JSON.stringify(config)); }, [config]);
  useEffect(() => { if (contacts.length > 0) localStorage.setItem('sme_contacts_cache', JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { apiKeyRef.current = geminiApiKey; localStorage.setItem('sme_gemini_key', geminiApiKey); }, [geminiApiKey]);

  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [inputText, setInputText] = useState('');
  const [newKItem, setNewKItem] = useState<Partial<KnowledgeItem>>({ category: '', content: '', buttons: [], mediaUrl: '', mediaType: 'image' });
  const [editingKItem, setEditingKItem] = useState<string | null>(null);

  const sendMessage = useCallback((text: string, contactId: string, isAi = false, media?: any, buttons?: string[]) => {
    if (!text && !media) return;
    if (!isAi && socketRef.current?.connected) {
      socketRef.current.emit("send_message", { jid: contactId, text, media, buttons });
    }
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      sender: isAi ? configRef.current.businessName : 'Admin',
      text, timestamp: new Date(), isMine: true,
      mediaUrl: media?.url,
      mediaType: media?.type,
      buttons: buttons
    };
    setMessages(prev => ({ ...prev, [contactId]: [...(prev[contactId] || []), newMessage] }));
    if (!isAi) setInputText('');
  }, []);

  const triggerContactSync = useCallback(() => {
    if (socketRef.current?.connected) {
      setIsSyncingContacts(true);
      socketRef.current.emit("whatsapp_get_contacts");
      setTimeout(() => setIsSyncingContacts(false), 20000);
    }
  }, []);

  const handleReconnect = useCallback(() => {
    if (!socketRef.current?.connected) return;
    if (confirm("Ganti akun WhatsApp? Sesi lama akan dihapus.")) {
      setIsResetting(true); setQrCode(null); setBaileysStatus('connecting'); setIsScannerOpen(true);
      socketRef.current.emit("whatsapp_logout");
      setTimeout(() => {
        socketRef.current?.emit("whatsapp_reset");
        setTimeout(() => { socketRef.current?.emit("whatsapp_get_status"); setIsResetting(false); }, 2000);
      }, 2000);
    }
  }, []);

  const handleAddOrUpdateKItem = () => {
    if (!newKItem.category || !newKItem.content) return;
    if (editingKItem) {
      setConfig(prev => ({
        ...prev,
        knowledgeBase: prev.knowledgeBase.map(item => item.id === editingKItem ? { ...item, ...newKItem } as KnowledgeItem : item)
      }));
      setEditingKItem(null);
    } else {
      setConfig(prev => ({ ...prev, knowledgeBase: [...prev.knowledgeBase, { id: Date.now().toString(), ...newKItem } as KnowledgeItem] }));
    }
    setNewKItem({ category: '', content: '', buttons: [], mediaUrl: '', mediaType: 'image' });
  };

  useEffect(() => {
    if (!currentUser) return;
    const newSocket = io(backendUrl, { transports: ['polling', 'websocket'], reconnection: true });
    socketRef.current = newSocket;

    newSocket.on("connect", () => { setIsSocketConnected(true); newSocket.emit("whatsapp_get_status"); });
    newSocket.on("disconnect", () => { setIsSocketConnected(false); setBaileysStatus('initial'); });
    newSocket.on("whatsapp_qr", (qr: string) => { setQrCode(qr); setBaileysStatus('qr'); setIsScannerOpen(true); });
    newSocket.on("whatsapp_status", (s: string) => {
      const norm = s === 'open' ? 'connected' : s;
      setBaileysStatus(norm as any);
      if (norm === 'connected') { setIsScannerOpen(false); setQrCode(null); }
    });
    newSocket.on("whatsapp_contacts", (data: any) => {
      setIsSyncingContacts(false);
      if (Array.isArray(data)) {
        setContacts(data.map(c => ({ id: c.id, name: c.name || c.phone, phone: c.phone, unreadCount: 0 })));
      }
    });
    newSocket.on("whatsapp_message", async (msg: any) => {
      const contactId = msg.key?.remoteJid;
      if (!contactId || msg.key?.fromMe) return;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      if (!text || processedMessageIds.current.has(msg.key.id)) return;
      processedMessageIds.current.add(msg.key.id);
      
      setMessages(prev => ({ ...prev, [contactId]: [...(prev[contactId] || []), { id: msg.key.id, sender: contactId.split('@')[0], text, timestamp: new Date(), isMine: false }] }));
      
      if (configRef.current.autoReplyEnabled) {
        const aiRes = await getAIResponse(text, configRef.current, apiKeyRef.current);
        if (aiRes) { sendMessage(aiRes.text, contactId, true, aiRes.media, aiRes.buttons); }
      }
    });

    return () => { newSocket.disconnect(); socketRef.current = null; };
  }, [currentUser, backendUrl, sendMessage]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-900">
        <div className="bg-white rounded-[2.5rem] p-12 max-w-md w-full shadow-2xl text-center">
          <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight uppercase">WA AI DASHBOARD</h1>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
              const u: User = { id: '1', username: 'admin', name: 'Super Admin', role: 'admin' };
              setCurrentUser(u); localStorage.setItem('sme_user_session', JSON.stringify(u));
            } else setLoginError('Kredensial salah');
          }} className="space-y-4">
            <input type="text" placeholder="Username" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" placeholder="Password" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
            <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-bold">Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isSocketConnected={isSocketConnected} baileysStatus={baileysStatus} isResetting={isResetting} onReconnect={handleReconnect} onLogout={() => { setCurrentUser(null); localStorage.removeItem('sme_user_session'); }} />
      <main className="flex-1 flex flex-col relative bg-slate-50 overflow-hidden">
        {activeTab === 'chats' && <ChatView contacts={contacts} messages={messages} selectedContact={selectedContact} setSelectedContact={setSelectedContact} searchTerm={searchTerm} setSearchTerm={setSearchTerm} isSyncingContacts={isSyncingContacts} onSyncContacts={triggerContactSync} inputText={inputText} setInputText={setInputText} onSendMessage={sendMessage} />}
        {activeTab === 'contacts' && <ContactsView contacts={contacts} isSyncing={isSyncingContacts} onSync={triggerContactSync} setContacts={setContacts} onSelectChat={(c) => { setSelectedContact(c); setActiveTab('chats'); }} />}
        {activeTab === 'blast' && <BlastView contacts={contacts} campaignGroups={campaignGroups} setCampaignGroups={setCampaignGroups} blastHistory={blastHistory} setBlastHistory={setBlastHistory} baileysStatus={baileysStatus} isSocketConnected={isSocketConnected} onBlast={(text, jids) => socketRef.current?.emit("whatsapp_blast", { jids, text })} />}
        {activeTab === 'history' && <CampaignHistoryView blastHistory={blastHistory} setBlastHistory={setBlastHistory} contacts={contacts} onResendBlast={(text, jids) => socketRef.current?.emit("whatsapp_blast", { jids, text })} />}
        {activeTab === 'knowledge' && (
          <KnowledgeView 
            knowledgeBase={config.knowledgeBase} setKnowledgeBase={(kb) => setConfig({...config, knowledgeBase: kb})}
            newKItem={newKItem} setNewKItem={setNewKItem} editingKItem={editingKItem}
            onAddOrUpdate={handleAddOrUpdateKItem} onEdit={(i) => { setNewKItem(i); setEditingKItem(i.id); }}
            onCancelEdit={() => { setEditingKItem(null); setNewKItem({category: '', content: '', buttons: [], mediaUrl: '', mediaType: 'image'}); }}
            onDelete={(id) => setConfig({...config, knowledgeBase: config.knowledgeBase.filter(k => k.id !== id)})}
          />
        )}
        {activeTab === 'settings' && <SettingsView config={config} setConfig={setConfig} geminiApiKey={geminiApiKey} setGeminiApiKey={setGeminiApiKey} showApiKey={showApiKey} setShowApiKey={setShowApiKey} backendUrl={backendUrl} setBackendUrl={setBackendUrl} isSocketConnected={isSocketConnected} isResetting={isResetting} onReconnect={handleReconnect} onTabChange={setActiveTab} />}
      </main>

      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-2xl p-6">
          <div className="bg-white p-12 rounded-[3.5rem] text-center max-w-sm w-full shadow-2xl relative">
            <h2 className="text-2xl font-black mb-2 text-slate-800">Scan WhatsApp</h2>
            <div className="bg-slate-50 p-6 border rounded-[2rem] mb-8 min-h-[250px] flex items-center justify-center">
              {qrCode ? <img src={qrCode} alt="QR" className="w-full rounded-lg shadow-sm" /> : <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
            </div>
            <button onClick={() => setIsScannerOpen(false)} className="w-full py-4 text-xs font-black text-slate-400 uppercase border rounded-2xl">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
