
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from './constants';
import { Contact, Message, SMEConfig, User, KnowledgeItem } from './types';
import { getAIResponse } from './geminiService';
import { io, Socket } from "socket.io-client";

// Import Separated Components
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { KnowledgeView } from './components/KnowledgeView';

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
  const [activeTab, setActiveTab] = useState<'chats' | 'blast' | 'knowledge' | 'settings'>('chats');
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
  const lastNudgeTime = useRef<number>(0);

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
  
  const [blastText, setBlastText] = useState('');
  const [isBlasting, setIsBlasting] = useState(false);
  
  const [newKItem, setNewKItem] = useState({ category: '', content: '' });
  const [editingKItem, setEditingKItem] = useState<string | null>(null);

  const sendMessage = useCallback((text: string, contactId: string, isAi = false) => {
    if (!text || !text.trim()) return;
    if (!isAi && socketRef.current && socketRef.current.connected) {
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
    const newSocket = io(backendUrl, { transports: ['websocket'], reconnection: true });
    socketRef.current = newSocket;
    newSocket.on("connect", () => { setIsSocketConnected(true); newSocket.emit("whatsapp_get_status"); });
    newSocket.on("disconnect", () => { setIsSocketConnected(false); setBaileysStatus('initial'); });
    newSocket.on("whatsapp_qr", (qr) => { setQrCode(qr); setBaileysStatus('qr'); setIsScannerOpen(true); });
    newSocket.on("whatsapp_status", (s) => {
      const norm = s === 'open' ? 'connected' : s;
      setBaileysStatus(norm as any);
      if (norm === 'connected') { setIsScannerOpen(false); setQrCode(null); newSocket.emit("whatsapp_get_contacts"); }
    });
    newSocket.on("whatsapp_contacts", (data) => {
      setIsSyncingContacts(false);
      setContacts(data.map((c: any) => ({ id: c.id || c.jid, name: c.name || "", phone: (c.id || c.jid || "").split('@')[0], unreadCount: 0 })));
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
        if (aiRes && socketRef.current?.connected) {
          sendMessage(aiRes, contactId, true);
          socketRef.current.emit("send_message", { jid: contactId, text: aiRes });
        }
      }
    });
    return () => { newSocket.close(); };
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
            isSyncingContacts={isSyncingContacts} onSyncContacts={() => { setIsSyncingContacts(true); socketRef.current?.emit("whatsapp_get_contacts"); }}
            inputText={inputText} setInputText={setInputText} onSendMessage={sendMessage}
          />
        )}

        {activeTab === 'blast' && (
          <div className="p-10 max-w-4xl mx-auto w-full overflow-y-auto">
            <h2 className="text-2xl font-black mb-8 uppercase tracking-tight">WhatsApp Blast</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                <textarea value={blastText} onChange={e => setBlastText(e.target.value)} placeholder="Tulis pesan promosi..." className="w-full p-6 bg-slate-50 border-none rounded-3xl h-48 outline-none text-sm focus:ring-2 focus:ring-emerald-500/10 transition-all" />
                <button 
                  onClick={() => {
                    if (!blastText.trim() || !socketRef.current?.connected) return;
                    setIsBlasting(true);
                    socketRef.current.emit("whatsapp_blast", { jids: contacts.map(c => c.id), text: blastText });
                    setTimeout(() => { setIsBlasting(false); setBlastText(''); alert("Blast terkirim!"); }, 2000);
                  }} 
                  className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black shadow-xl shadow-emerald-200"
                >Kirim Blast ke {contacts.length} Kontak</button>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeView 
            knowledgeBase={config.knowledgeBase} newKItem={newKItem} setNewKItem={setNewKItem}
            editingKItem={editingKItem} onAddOrUpdate={handleAddOrUpdateKItem}
            onEdit={(item) => { setNewKItem({category: item.category, content: item.content}); setEditingKItem(item.id); }}
            onCancelEdit={() => { setEditingKItem(null); setNewKItem({category: '', content: ''}); }}
            onDelete={(id) => setConfig(prev => ({ ...prev, knowledgeBase: prev.knowledgeBase.filter(k => k.id !== id) }))}
          />
        )}

        {activeTab === 'settings' && (
          <div className="p-10 max-w-5xl mx-auto w-full space-y-8 overflow-y-auto pb-20">
            <h2 className="text-2xl font-black uppercase tracking-tight">System Settings</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase">Business Profile</h3>
                <input value={config.businessName} onChange={e => setConfig({...config, businessName: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-sm" placeholder="Nama Bisnis" />
                <textarea value={config.description} onChange={e => setConfig({...config, description: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-sm h-24" placeholder="Deskripsi Bisnis" />
                <button onClick={() => setActiveTab('knowledge')} className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs uppercase">Edit Knowledge Base</button>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase">Credentials</h3>
                <input type={showApiKey ? "text" : "password"} value={geminiApiKey} onChange={e => setGeminiApiKey(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-sm" placeholder="Gemini API Key" />
                <button onClick={() => setShowApiKey(!showApiKey)} className="text-[10px] font-black uppercase text-slate-400">{showApiKey ? "Hide" : "Show"}</button>
                <div className="pt-4 space-y-2">
                  <input value={backendUrl} onChange={e => setBackendUrl(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-sm" placeholder="Backend URL" />
                  <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase">Save & Reload</button>
                </div>
              </div>
            </div>
          </div>
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
