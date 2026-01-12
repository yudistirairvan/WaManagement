
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icons } from './constants';
import { Contact, Message, SMEConfig, User, KnowledgeItem } from './types';
import { getAIResponse } from './geminiService';
import { io, Socket } from "socket.io-client";

const DEFAULT_SOCKET_URL = "http://localhost:4000";

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 translate-x-1' 
      : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
    }`}
  >
    <div className={active ? 'text-white' : 'text-slate-400'}>{icon}</div>
    <span className="font-semibold text-sm">{label}</span>
  </button>
);

const ContactCard: React.FC<{
  contact: Contact;
  active: boolean;
  onClick: () => void;
}> = ({ contact, active, onClick }) => (
  <div
    onClick={onClick}
    className={`p-4 border-b cursor-pointer transition-all flex items-center space-x-3 ${
      active ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-white'
    }`}
  >
    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 ${
      active ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
    }`}>
      {(contact.name || contact.phone || "?").charAt(0).toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline">
        <h3 className="font-bold text-slate-800 truncate text-sm">{contact.name || contact.phone}</h3>
        {contact.unreadCount > 0 && (
          <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
            {contact.unreadCount}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 truncate mt-0.5">{contact.lastMessage || contact.phone}</p>
    </div>
  </div>
);

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
  const [activeTab, setActiveTab] = useState<'chats' | 'blast' | 'settings'>('chats');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [baileysStatus, setBaileysStatus] = useState<'initial' | 'qr' | 'connecting' | 'connected' | 'error'>('initial');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);

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

  // Stabilize sendMessage by using a ref for the socket to avoid it as a dependency
  const socketRef = useRef<Socket | null>(null);

  const sendMessage = useCallback((text: string, contactId: string, isAi = false) => {
    if (!text || !text.trim()) return;

    if (!isAi && socketRef.current?.connected) {
      socketRef.current.emit("send_message", { jid: contactId, text: text });
    }

    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      sender: isAi ? configRef.current.businessName : 'Admin',
      text,
      timestamp: new Date(),
      isMine: true
    };

    setMessages(prev => ({
      ...prev,
      [contactId]: [...(prev[contactId] || []), newMessage]
    }));
    
    if (!isAi) setInputText('');
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsSocketConnected(true);
      newSocket.emit("whatsapp_get_status");
    });

    newSocket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    newSocket.on("whatsapp_qr", (qrData: string) => {
      setQrCode(qrData);
      setBaileysStatus('qr');
      setIsScannerOpen(true);
    });

    newSocket.on("whatsapp_contacts", (data: any[]) => {
      setIsSyncingContacts(false);
      const formattedContacts: Contact[] = data.map(c => ({
        id: c.id || c.jid,
        name: c.name || c.verifiedName || c.notify || "",
        phone: (c.id || c.jid || "").split('@')[0],
        unreadCount: 0
      }));
      setContacts(formattedContacts);
    });

    newSocket.on("whatsapp_status", (status: string) => {
      if (status === 'open' || status === 'connected') {
        setBaileysStatus('connected');
        setIsScannerOpen(false);
        setQrCode(null);
        newSocket.emit("whatsapp_get_contacts");
      } else if (status === 'connecting') {
        setBaileysStatus('connecting');
      } else {
        setBaileysStatus('initial');
      }
    });

    newSocket.on("whatsapp_message", async (msg: any) => {
      const msgId = msg.key.id;
      const contactId = msg.key.remoteJid;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

      if (!text || msg.key.fromMe || processedMessageIds.current.has(msgId)) return;
      processedMessageIds.current.add(msgId);
      
      if (processedMessageIds.current.size > 100) {
        const first = processedMessageIds.current.values().next().value;
        if (first) processedMessageIds.current.delete(first);
      }

      const incomingMsg: Message = {
        id: msgId,
        sender: contactId.split('@')[0],
        text: text,
        timestamp: new Date(),
        isMine: false
      };

      setMessages(prev => ({
        ...prev,
        [contactId]: [...(prev[contactId] || []), incomingMsg]
      }));

      if (configRef.current.autoReplyEnabled) {
        const aiResponse = await getAIResponse(text, configRef.current, apiKeyRef.current);
        if (aiResponse) {
          // Use the local newSocket to avoid stale closure or dependency issues
          sendMessage(aiResponse, contactId, true);
          newSocket.emit("send_message", { jid: contactId, text: aiResponse });
        }
      }
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser, backendUrl, sendMessage]);

  const addKnowledge = () => {
    if (!newKItem.category || !newKItem.content) return;
    const newItem: KnowledgeItem = {
      id: Date.now().toString(),
      category: newKItem.category,
      content: newKItem.content
    };
    setConfig(prev => ({ ...prev, knowledgeBase: [...prev.knowledgeBase, newItem] }));
    setNewKItem({ category: '', content: '' });
  };

  const removeKnowledge = (id: string) => {
    setConfig(prev => ({ ...prev, knowledgeBase: prev.knowledgeBase.filter(k => k.id !== id) }));
  };

  const filteredContacts = contacts.filter(c => 
    (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  const handleBlast = () => {
    if (!blastText.trim() || !socketRef.current?.connected || baileysStatus !== 'connected') return;
    setIsBlasting(true);
    const jids = contacts.map(c => c.id);
    socketRef.current.emit("whatsapp_blast", { jids, text: blastText });
    setTimeout(() => { setIsBlasting(false); setBlastText(''); }, 1500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
      const user: User = { id: '1', username: 'admin', name: 'Super Admin', role: 'admin' };
      setCurrentUser(user);
      localStorage.setItem('sme_user_session', JSON.stringify(user));
    } else {
      setLoginError('Kredensial salah (admin/admin123)');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-900">
        <div className="bg-white rounded-[2.5rem] p-12 max-w-md w-full shadow-2xl">
          <h1 className="text-3xl font-black text-center text-slate-800 mb-2 tracking-tight">WA UMKM AI</h1>
          <p className="text-slate-500 text-center mb-10 text-sm font-medium">Dashboard Bot Jawaban Otomatis</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="admin" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" placeholder="admin123" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            {loginError && <p className="text-red-500 text-xs text-center font-bold bg-red-50 py-2 rounded-xl">{loginError}</p>}
            <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-emerald-200">Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans text-slate-900">
      <aside className="w-72 bg-white border-r flex flex-col p-6 shadow-sm z-20">
        <div className="mb-10 flex items-center space-x-3 px-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100 font-black">AI</div>
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Wa Dashboard</h1>
        </div>
        <nav className="space-y-2 flex-1">
          <SidebarItem icon={<Icons.MessageCircle />} label="Chats" active={activeTab === 'chats'} onClick={() => setActiveTab('chats')} />
          <SidebarItem icon={<Icons.Blast />} label="Blast (Bulk)" active={activeTab === 'blast'} onClick={() => setActiveTab('blast')} />
          <SidebarItem icon={<Icons.Settings />} label="Bot Knowledge" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        
        <div className="mt-auto space-y-4">
          <div className="p-5 bg-slate-50 border rounded-3xl text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">WA Status</span>
            <div className={`text-[10px] font-black uppercase inline-flex items-center px-3 py-1 rounded-full ${baileysStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
               <div className={`w-1.5 h-1.5 rounded-full mr-2 ${baileysStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
               {baileysStatus}
            </div>
          </div>
          <button onClick={() => { setCurrentUser(null); localStorage.removeItem('sme_user_session'); }} className="w-full text-xs font-black text-red-500 py-2 hover:bg-red-50 rounded-xl transition-all">LOGOUT</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-slate-50 overflow-hidden">
        {activeTab === 'chats' && (
          <div className="flex flex-1 overflow-hidden">
            <div className="w-80 border-r bg-white flex flex-col">
              <div className="p-6 border-b space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest">Daftar Kontak</h2>
                  <button onClick={() => socket?.emit("whatsapp_get_contacts")} className={`p-2 rounded-lg transition-all ${isSyncingContacts ? 'bg-emerald-100 text-emerald-600 animate-spin' : 'hover:bg-slate-100 text-slate-400'}`}><Icons.History /></button>
                </div>
                <input type="text" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 rounded-xl py-2 px-4 text-xs font-medium outline-none border focus:border-emerald-500 transition-all" />
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredContacts.map(c => <ContactCard key={c.id} contact={c} active={selectedContact?.id === c.id} onClick={() => setSelectedContact(c)} />)}
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedContact ? (
                <>
                  <div className="bg-white p-4 border-b flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">{(selectedContact.name || selectedContact.phone)[0]}</div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 leading-none">{selectedContact.name || selectedContact.phone}</span>
                            <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{selectedContact.phone}</span>
                        </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-100/50">
                    {(messages[selectedContact.id] || []).map(msg => (
                      <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${msg.isMine ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800'}`}>
                          <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 bg-white border-t flex space-x-3"><input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage(inputText, selectedContact.id)} className="flex-1 p-4 bg-slate-50 rounded-2xl border-none outline-none text-sm" placeholder="Ketik pesan..." /><button onClick={() => sendMessage(inputText, selectedContact.id)} className="p-4 bg-emerald-600 text-white rounded-2xl"><Icons.Send /></button></div>
                </>
              ) : <div className="flex-1 flex items-center justify-center text-slate-300 uppercase font-black text-xs tracking-widest">Pilih chat</div>}
            </div>
          </div>
        )}

        {activeTab === 'blast' && (
          <div className="p-10 max-w-4xl mx-auto w-full">
            <h2 className="text-2xl font-black mb-8 uppercase tracking-tight">Kirim Pesan Massal</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Pesan Blast</label>
                <textarea value={blastText} onChange={e => setBlastText(e.target.value)} placeholder="Tulis pesan promosi ke semua kontak..." className="w-full p-6 bg-slate-50 border-none rounded-3xl h-48 mb-6 outline-none text-sm" />
                <button onClick={handleBlast} disabled={isBlasting || baileysStatus !== 'connected'} className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black shadow-xl shadow-emerald-200 transition-all hover:scale-[1.01] active:scale-[0.98]">{isBlasting ? 'Mengirim...' : 'Mulai Blast ke ' + contacts.length + ' Kontak'}</button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-10 max-w-5xl mx-auto w-full space-y-8 overflow-y-auto max-h-full pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tight">Pengaturan Bot Jawaban</h2>
                <div className="flex items-center space-x-3 bg-white px-6 py-3 rounded-2xl border">
                    <span className="text-xs font-bold text-slate-500">Auto Reply</span>
                    <button onClick={() => setConfig({...config, autoReplyEnabled: !config.autoReplyEnabled})} className={`w-12 h-6 rounded-full transition-all relative ${config.autoReplyEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.autoReplyEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Identitas Bisnis
                    </h3>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">Nama UMKM</label>
                        <input value={config.businessName} onChange={e => setConfig({...config, businessName: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">Deskripsi Bisnis</label>
                        <textarea value={config.description} onChange={e => setConfig({...config, description: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-sm h-24 border-none" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">Gaya Bicara Bot (Prompt)</label>
                        <input value={config.autoReplyPrompt} onChange={e => setConfig({...config, autoReplyPrompt: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none" placeholder="Cth: Sopan, gunakan emoji, bahasa gaul..." />
                    </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border space-y-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Gemini API Configuration
                      </h3>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">Gemini API Key</label>
                          <div className="relative">
                            <input 
                              type={showApiKey ? "text" : "password"}
                              value={geminiApiKey} 
                              onChange={e => setGeminiApiKey(e.target.value)} 
                              placeholder="Masukkan API Key dari Google AI Studio..."
                              className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none pr-12" 
                            />
                            <button 
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                            >
                              {showApiKey ? "Hide" : "Show"}
                            </button>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border space-y-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Koneksi Backend
                      </h3>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">Server URL</label>
                          <div className="flex space-x-2">
                              <input value={backendUrl} onChange={e => setBackendUrl(e.target.value)} className="flex-1 p-4 bg-slate-50 rounded-2xl text-sm border-none" />
                              <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-6 rounded-2xl font-bold text-xs uppercase">Save & Reload</button>
                          </div>
                      </div>
                  </div>
                </div>
            </section>

            <section className="bg-white p-8 rounded-[2.5rem] border">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Basis Pengetahuan (Knowledge Base)</h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-black uppercase">{config.knowledgeBase.length} Items</span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">Kategori / Topik</label>
                        <input value={newKItem.category} onChange={e => setNewKItem({...newKItem, category: e.target.value})} placeholder="Cth: Harga, Lokasi" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none" />
                    </div>
                    <div className="lg:col-span-2 flex space-x-3 items-end">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">Detail Jawaban / Fakta</label>
                            <input value={newKItem.content} onChange={e => setNewKItem({...newKItem, content: e.target.value})} placeholder="Cth: Harga produk A adalah Rp 50.000" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none" />
                        </div>
                        <button onClick={addKnowledge} className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                            <Icons.UserPlus />
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {config.knowledgeBase.length === 0 ? (
                        <div className="text-center p-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada data jawaban.</p>
                        </div>
                    ) : (
                        config.knowledgeBase.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-emerald-100">
                                <div className="flex items-center space-x-4">
                                    <span className="px-3 py-1 bg-white text-emerald-700 rounded-full text-[10px] font-black uppercase border">{item.category}</span>
                                    <p className="text-sm font-medium text-slate-700">{item.content}</p>
                                </div>
                                <button onClick={() => removeKnowledge(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>
          </div>
        )}
      </main>

      {isScannerOpen && qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6">
          <div className="bg-white p-12 rounded-[3.5rem] text-center max-w-sm w-full">
            <h2 className="text-2xl font-black mb-6">Scan QR</h2>
            <div className="bg-white p-4 border rounded-3xl mb-8 shadow-inner"><img src={qrCode} alt="QR" className="w-full h-auto" /></div>
            <button onClick={() => setIsScannerOpen(false)} className="text-xs font-black text-slate-400 hover:text-red-500 uppercase tracking-widest">Batal</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
