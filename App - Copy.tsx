
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

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem('sme_backend_url') || DEFAULT_SOCKET_URL);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('sme_gemini_key') || '');
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
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // State baru untuk Queue Monitoring
  const [transmissionLogs, setTransmissionLogs] = useState<{id: string, status: string, msg: string}[]>([]);

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

  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem('sme_chat_history');
    return saved ? JSON.parse(saved) : {};
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
  useEffect(() => { localStorage.setItem('sme_chat_history', JSON.stringify(messages)); }, [messages]);

  const ensureJid = (id: string) => {
    if (id.includes('@')) return id;
    return `${id.replace(/\D/g, '')}@s.whatsapp.net`;
  };

  const sendMessage = useCallback((text: string, contactId: string, isAi = false) => {
    if (!text) return;
    const targetJid = ensureJid(contactId);

    if (!isAi && socketRef.current?.connected) {
      socketRef.current.emit("send_message", { jid: targetJid, text });
    }

    // Tampilkan di UI segera agar terasa responsif
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      sender: isAi ? configRef.current.businessName : 'Admin',
      text, timestamp: new Date(), isMine: true
    };
    setMessages(prev => ({ ...prev, [contactId]: [...(prev[contactId] || []), newMessage] }));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    const newSocket = io(backendUrl, { transports: ['polling', 'websocket'] });
    socketRef.current = newSocket;

    newSocket.on("connect", () => { 
      setIsSocketConnected(true); 
      newSocket.emit("whatsapp_get_status"); 
    });

    newSocket.on("queue_log", (log: any) => {
      setTransmissionLogs(prev => [log, ...prev].slice(0, 5));
    });

    newSocket.on("whatsapp_qr", (qr: string) => { 
      setQrCode(qr); 
      setBaileysStatus('qr'); 
      setIsScannerOpen(true); 
    });

    newSocket.on("whatsapp_status", (status: string) => {
      const norm = status === 'open' ? 'connected' : status;
      setBaileysStatus(norm as any);
      if (norm === 'connected') { setIsScannerOpen(false); setQrCode(null); }
    });

    newSocket.on("whatsapp_contacts", (data: any) => {
      setIsSyncingContacts(false);
      if (Array.isArray(data)) {
        setContacts(data.map(c => ({ id: c.id, name: c.name || c.id.split('@')[0], phone: c.id.split('@')[0], unreadCount: 0 })));
      }
    });

    newSocket.on("whatsapp_message", async (msg: any) => {
      const contactId = msg.key?.remoteJid;
      if (!contactId || msg.key?.fromMe) return;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      if (!text || processedMessageIds.current.has(msg.key.id)) return;
      processedMessageIds.current.add(msg.key.id);
      
      setMessages(prev => ({ 
        ...prev, 
        [contactId]: [...(prev[contactId] || []), { 
          id: msg.key.id, 
          sender: contactId.split('@')[0], 
          text, 
          timestamp: new Date(), 
          isMine: false 
        }] 
      }));
      
      if (configRef.current.autoReplyEnabled) {
        const aiRes = await getAIResponse(text, configRef.current, apiKeyRef.current);
        if (aiRes) { sendMessage(aiRes.text, contactId, true); }
      }
    });

    return () => { newSocket.close(); };
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
            <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-bold">Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isSocketConnected={isSocketConnected} baileysStatus={baileysStatus} isResetting={isResetting} onReconnect={() => socketRef.current?.emit("whatsapp_logout")} onLogout={() => { setCurrentUser(null); localStorage.removeItem('sme_user_session'); }} />
      <main className="flex-1 flex flex-col relative bg-slate-50 overflow-hidden">
        
        {/* Transmission Log Monitor (New UI Component) */}
        {transmissionLogs.length > 0 && (
          <div className="absolute top-4 right-4 z-30 w-72 bg-slate-900 text-white p-4 rounded-3xl shadow-2xl animate-in slide-in-from-right-4 duration-500 border border-slate-700/50 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Transmission Monitor</span>
              <button onClick={() => setTransmissionLogs([])} className="text-[10px] text-slate-500 hover:text-white">Clear</button>
            </div>
            <div className="space-y-2">
              {transmissionLogs.map((log, i) => (
                <div key={i} className="flex items-start space-x-2 text-[10px] animate-in fade-in slide-in-from-top-1">
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${log.status === 'success' ? 'bg-emerald-500' : log.status === 'error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="font-mono text-slate-300 break-words">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chats' && (
          <ChatView contacts={contacts} messages={messages} setMessages={setMessages} selectedContact={null} setSelectedContact={() => {}} searchTerm={''} setSearchTerm={() => {}} isSyncingContacts={isSyncingContacts} onSyncContacts={() => socketRef.current?.emit("whatsapp_get_contacts")} inputText={''} setInputText={() => {}} onSendMessage={sendMessage} />
        )}
        {activeTab === 'contacts' && <ContactsView contacts={contacts} isSyncing={isSyncingContacts} onSync={() => socketRef.current?.emit("whatsapp_get_contacts")} onSelectChat={() => {}} />}
        {activeTab === 'blast' && <BlastView contacts={contacts} campaignGroups={campaignGroups} setCampaignGroups={setCampaignGroups} blastHistory={blastHistory} setBlastHistory={setBlastHistory} baileysStatus={baileysStatus} isSocketConnected={isSocketConnected} onBlast={(text, jids) => socketRef.current?.emit("whatsapp_blast", { jids, text })} />}
        {activeTab === 'history' && <CampaignHistoryView blastHistory={blastHistory} setBlastHistory={setBlastHistory} contacts={contacts} />}
        {activeTab === 'knowledge' && (
          <KnowledgeView knowledgeBase={config.knowledgeBase} setKnowledgeBase={(kb) => setConfig({...config, knowledgeBase: kb})} newKItem={{}} setNewKItem={() => {}} editingKItem={null} onAddOrUpdate={() => {}} onEdit={() => {}} onCancelEdit={() => {}} onDelete={() => {}} />
        )}
        {activeTab === 'settings' && <SettingsView config={config} setConfig={setConfig} geminiApiKey={geminiApiKey} setGeminiApiKey={setGeminiApiKey} showApiKey={false} setShowApiKey={() => {}} backendUrl={backendUrl} setBackendUrl={setBackendUrl} isSocketConnected={isSocketConnected} isResetting={isResetting} onReconnect={() => {}} onTabChange={setActiveTab} />}
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
