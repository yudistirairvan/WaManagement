
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from './constants';
import { Contact, Message, SMEConfig, User, KnowledgeItem } from './types';
import { getAIResponse } from './geminiService';
import { io, Socket } from "socket.io-client";

// Import Separated Components
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { KnowledgeView } from './components/KnowledgeView';
import { BlastView } from './components/BlastView';
import { SettingsView } from './components/SettingsView';
import { ContactsView } from './components/ContactsView';

const DEFAULT_SOCKET_URL = "http://localhost:4000";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('sme_user_session');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem('sme_backend_url') || DEFAULT_SOCKET_URL);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('sme_gemini_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'blast' | 'knowledge' | 'settings' | 'contacts'>('chats');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [baileysStatus, setBaileysStatus] = useState<'initial' | 'qr' | 'connecting' | 'connected' | 'error'>('initial');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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

  useEffect(() => {
    configRef.current = config;
    localStorage.setItem('sme_bot_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    apiKeyRef.current = geminiApiKey;
    localStorage.setItem('sme_gemini_key', geminiApiKey);
  }, [geminiApiKey]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [inputText, setInputText] = useState('');
  
  const [newKItem, setNewKItem] = useState({ category: '', content: '' });
  const [editingKItem, setEditingKItem] = useState<string | null>(null);

  const sendMessage = useCallback((text: string, contactId: string, isAi = false) => {
    if (!text || !text.trim()) return;
    if (!isAi && socketRef.current?.connected) {
      socketRef.current.emit("send_message", { jid: contactId, text: text });
    }
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      sender: isAi ? configRef.current.businessName : 'Admin',
      text, timestamp: new Date(), isMine: true
    };
    setMessages(prev => ({ ...prev, [contactId]: [...(prev[contactId] || []), newMessage] }));
    if (!isAi) setInputText('');
  }, []);

  const triggerContactSync = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log("🚀 Requesting full contact sync from server...");
      setIsSyncingContacts(true);
      socketRef.current.emit("whatsapp_get_contacts");
      // Safety timeout extended for slow Baileys stores
      setTimeout(() => setIsSyncingContacts(false), 20000);
    } else {
      alert("Socket tidak terhubung ke server.");
    }
  }, []);

  const handleReconnect = useCallback(() => {
    if (!socketRef.current?.connected) { alert("Terputus dari server."); return; }
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
        knowledgeBase: prev.knowledgeBase.map(item => item.id === editingKItem ? { ...item, category: newKItem.category, content: newKItem.content } : item)
      }));
      setEditingKItem(null);
    } else {
      setConfig(prev => ({ ...prev, knowledgeBase: [...prev.knowledgeBase, { id: Date.now().toString(), ...newKItem }] }));
    }
    setNewKItem({ category: '', content: '' });
  };

  useEffect(() => {
    if (!currentUser) return;
    
    console.log("🔌 Initializing Socket Connection to:", backendUrl);
    const newSocket = io(backendUrl, { 
      transports: ['polling', 'websocket'], 
      reconnection: true,
      reconnectionAttempts: 10,
      forceNew: true,
      timeout: 20000
    });
    
    socketRef.current = newSocket;

    const onConnect = () => { 
      console.log("✅ Socket Connected Successfully");
      setIsSocketConnected(true); 
      newSocket.emit("whatsapp_get_status"); 
    };

    const onDisconnect = (reason: string) => { 
      console.log("❌ Socket Disconnected:", reason);
      setIsSocketConnected(false); 
      setBaileysStatus('initial'); 
    };

    const onConnectError = (error: Error) => {
      console.error("⚠️ Socket Connection Error:", error.message);
      setIsSocketConnected(false);
    };

    const onQr = (qr: string) => { 
      console.log("📲 New QR Code received");
      setQrCode(qr); 
      setBaileysStatus('qr'); 
      setIsScannerOpen(true); 
    };

    const onStatus = (s: string) => {
      console.log("📊 WhatsApp Status Update:", s);
      const norm = s === 'open' ? 'connected' : s;
      setBaileysStatus(norm as any);
      if (norm === 'connected') { 
        setIsScannerOpen(false); 
        setQrCode(null); 
        // Delay sync significantly to wait for Baileys data load
        console.log("⏳ Waiting 5s before auto-syncing contacts...");
        setTimeout(() => {
          if (newSocket.connected) {
            console.log("🔄 Auto-syncing contacts...");
            newSocket.emit("whatsapp_get_contacts");
          }
        }, 5000);
      }
    };

    const onContacts = (data: any) => {
      console.log("📦 Raw data from whatsapp_contacts event:", data);
      setIsSyncingContacts(false);
      
      if (Array.isArray(data)) {
        const contactMap = new Map();
        data.forEach((c: any) => {
          if (!c) return;
          const jid = c.id || c.jid;
          if (!jid) return;

          // Filter: only individual contacts, ignore groups (@g.us), broadcast lists (@broadcast), etc.
          const isPersonal = jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us') || !jid.includes('@');
          
          if (isPersonal) {
            const cleanPhone = jid.split('@')[0];
            contactMap.set(jid, { 
              id: jid, 
              name: c.name || c.verifiedName || c.notify || cleanPhone, 
              phone: cleanPhone, 
              unreadCount: 0 
            });
          }
        });
        
        const finalContacts = Array.from(contactMap.values());
        console.log("✨ Processed contacts count:", finalContacts.length);
        setContacts(finalContacts);
      } else {
        console.warn("⚠️ Received non-array data for contacts:", typeof data);
      }
    };

    const onMessage = async (msg: any) => {
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
        if (aiRes && socketRef.current?.connected) {
          sendMessage(aiRes, contactId, true);
          socketRef.current.emit("send_message", { jid: contactId, text: aiRes });
        }
      }
    };

    newSocket.on("connect", onConnect);
    newSocket.on("disconnect", onDisconnect);
    newSocket.on("connect_error", onConnectError);
    newSocket.on("whatsapp_qr", onQr);
    newSocket.on("whatsapp_status", onStatus);
    newSocket.on("whatsapp_contacts", onContacts);
    newSocket.on("whatsapp_message", onMessage);

    return () => {
      console.log("🧹 Unmounting: Closing Socket");
      newSocket.off("connect", onConnect);
      newSocket.off("disconnect", onDisconnect);
      newSocket.off("connect_error", onConnectError);
      newSocket.off("whatsapp_qr", onQr);
      newSocket.off("whatsapp_status", onStatus);
      newSocket.off("whatsapp_contacts", onContacts);
      newSocket.off("whatsapp_message", onMessage);
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser, backendUrl, sendMessage]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-900">
        <div className="bg-white rounded-[2.5rem] p-12 max-w-md w-full shadow-2xl text-center">
          <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight uppercase">WA AI DASHBOARD</h1>
          <p className="text-slate-500 mb-10 text-sm font-medium">Panel Manajemen Chatbot UMKM</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
              const u: User = { id: '1', username: 'admin', name: 'Super Admin', role: 'admin' };
              setCurrentUser(u); localStorage.setItem('sme_user_session', JSON.stringify(u));
            } else setLoginError('Kredensial salah');
          }} className="space-y-4">
            <input type="text" placeholder="Username" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" placeholder="Password" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            {loginError && <p className="text-red-500 text-xs font-bold bg-red-50 py-2 rounded-xl">{loginError}</p>}
            <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.98]">Masuk Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans text-slate-900">
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        isSocketConnected={isSocketConnected} baileysStatus={baileysStatus} 
        isResetting={isResetting} onReconnect={handleReconnect}
        onLogout={() => { setCurrentUser(null); localStorage.removeItem('sme_user_session'); }}
      />

      <main className="flex-1 flex flex-col relative bg-slate-50 overflow-hidden">
        {activeTab === 'chats' && (
          <ChatView 
            contacts={contacts} messages={messages} selectedContact={selectedContact}
            setSelectedContact={setSelectedContact} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            isSyncingContacts={isSyncingContacts} onSyncContacts={triggerContactSync}
            inputText={inputText} setInputText={setInputText} onSendMessage={sendMessage}
          />
        )}

        {activeTab === 'contacts' && (
          <ContactsView 
            contacts={contacts} 
            isSyncing={isSyncingContacts} 
            onSync={triggerContactSync}
            onSelectChat={(contact) => {
              setSelectedContact(contact);
              setActiveTab('chats');
            }}
          />
        )}

        {activeTab === 'blast' && (
          <BlastView 
            contacts={contacts} 
            baileysStatus={baileysStatus} 
            isSocketConnected={isSocketConnected}
            onBlast={(text, jids) => socketRef.current?.emit("whatsapp_blast", { jids, text })}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeView 
            knowledgeBase={config.knowledgeBase} 
            setKnowledgeBase={(newKb) => setConfig(prev => ({ ...prev, knowledgeBase: newKb }))}
            newKItem={newKItem} setNewKItem={setNewKItem}
            editingKItem={editingKItem} onAddOrUpdate={handleAddOrUpdateKItem}
            onEdit={(item) => { setNewKItem({category: item.category, content: item.content}); setEditingKItem(item.id); }}
            onCancelEdit={() => { setEditingKItem(null); setNewKItem({category: '', content: ''}); }}
            onDelete={(id) => setConfig(prev => ({ ...prev, knowledgeBase: prev.knowledgeBase.filter(k => k.id !== id) }))}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            config={config} setConfig={setConfig} 
            geminiApiKey={geminiApiKey} setGeminiApiKey={setGeminiApiKey}
            showApiKey={showApiKey} setShowApiKey={setShowApiKey}
            backendUrl={backendUrl} setBackendUrl={setBackendUrl}
            isSocketConnected={isSocketConnected} isResetting={isResetting}
            onReconnect={handleReconnect} onTabChange={setActiveTab}
          />
        )}
      </main>

      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-2xl p-6">
          <div className="bg-white p-12 rounded-[3.5rem] text-center max-w-sm w-full shadow-2xl relative border border-white/20">
            <h2 className="text-2xl font-black mb-2 text-slate-800">Scan WhatsApp</h2>
            <div className="bg-slate-50 p-6 border rounded-[2rem] mb-8 min-h-[250px] flex items-center justify-center">
              {qrCode ? <img src={qrCode} alt="QR" className="w-full rounded-lg shadow-sm" /> : <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
            </div>
            <button onClick={() => { setIsScannerOpen(false); setQrCode(null); }} className="w-full py-4 text-xs font-black text-slate-400 hover:text-red-500 uppercase tracking-widest border rounded-2xl">Tutup Panel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
