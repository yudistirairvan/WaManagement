
import React, { useRef } from 'react';
import { Icons } from '../constants';
import { Contact, Message } from '../types';

interface ChatViewProps {
  contacts: Contact[];
  messages: Record<string, Message[]>;
  setMessages: (messages: Record<string, Message[]>) => void;
  selectedContact: Contact | null;
  setSelectedContact: (c: Contact) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  isSyncingContacts: boolean;
  onSyncContacts: () => void;
  inputText: string;
  setInputText: (t: string) => void;
  onSendMessage: (text: string, contactId: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  contacts, messages, setMessages, selectedContact, setSelectedContact,
  searchTerm, setSearchTerm, isSyncingContacts, onSyncContacts,
  inputText, setInputText, onSendMessage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const filteredContacts = contacts.filter(contact => 
    (contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     contact.phone?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportHistory = () => {
    if (Object.keys(messages).length === 0) return alert("Belum ada history untuk diekspor.");
    const dataStr = JSON.stringify(messages, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `chat_history_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (typeof json === 'object' && !Array.isArray(json)) {
          if (confirm("Ganti history chat lokal dengan file ini? History saat ini akan tertimpa.")) {
            setMessages(json);
            localStorage.setItem('sme_chat_history', JSON.stringify(json));
          }
        } else {
          alert("Format file tidak valid.");
        }
      } catch (err) { alert("Gagal membaca file JSON."); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearCurrentHistory = () => {
    if (selectedContact && confirm(`Hapus semua pesan untuk ${selectedContact.name}? Tindakan ini permanen.`)) {
      const updatedMessages = { ...messages };
      delete updatedMessages[selectedContact.id];
      setMessages(updatedMessages);
      localStorage.setItem('sme_chat_history', JSON.stringify(updatedMessages));
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Contact List Sidebar */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest">Daftar Chat</h2>
            <div className="flex space-x-1">
               <button onClick={onSyncContacts} className={`p-2 rounded-lg transition-all ${isSyncingContacts ? 'bg-emerald-100 text-emerald-600 animate-spin' : 'hover:bg-slate-100 text-slate-400'}`} title="Sync Kontak"><Icons.History /></button>
            </div>
          </div>
          <input type="text" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 rounded-xl py-2 px-4 text-xs font-medium outline-none border focus:border-emerald-500 transition-all" />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => {
              const contactMessages = messages[contact.id] || [];
              const lastMsg = contactMessages[contactMessages.length - 1];
              
              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 border-b cursor-pointer transition-all flex items-center space-x-3 ${selectedContact?.id === contact.id ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-white'}`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 ${selectedContact?.id === contact.id ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                    {(contact.name || contact.phone || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-slate-800 truncate text-sm">{contact.name || contact.phone}</h3>
                      {contact.unreadCount > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{contact.unreadCount}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                      {lastMsg ? lastMsg.text : (contact.lastMessage || 'Tidak ada pesan')}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Tidak ada kontak ditemukan</div>
          )}
        </div>

        {/* Global History Actions */}
        <div className="p-4 bg-slate-50 border-t space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase text-center mb-1 tracking-tighter">Pencadangan Percakapan</p>
            <div className="flex space-x-2">
              <input type="file" ref={fileInputRef} onChange={handleImportHistory} className="hidden" accept=".json" />
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2.5 bg-white border rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-100 shadow-sm transition-all active:scale-95">Import</button>
              <button onClick={handleExportHistory} className="flex-1 py-2.5 bg-white border rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-100 shadow-sm transition-all active:scale-95">Export</button>
            </div>
        </div>
      </div>

      {/* Conversation Pane */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selectedContact ? (
          <>
            <div className="p-4 border-b flex items-center justify-between shadow-sm z-10 bg-white">
              <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">{(selectedContact.name || selectedContact.phone)[0]}</div>
                  <div className="flex flex-col">
                      <span className="font-black text-slate-800 leading-none text-sm">{selectedContact.name || selectedContact.phone}</span>
                      <span className="text-[9px] text-emerald-600 font-bold mt-1 uppercase tracking-wider">Online • +{selectedContact.phone}</span>
                  </div>
              </div>
              <div className="flex items-center space-x-1">
                 <button onClick={clearCurrentHistory} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-xl" title="Bersihkan Chat Ini">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                 </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
              {(!messages[selectedContact.id] || messages[selectedContact.id].length === 0) && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
                   <div className="p-4 bg-slate-100 rounded-full animate-bounce">
                     <Icons.History />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mulailah percakapan atau muat history</p>
                </div>
              )}
              
              {(messages[selectedContact.id] || []).map(msg => (
                <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[75%] flex flex-col space-y-1 ${msg.isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl shadow-sm overflow-hidden ${msg.isMine ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                      {msg.mediaUrl && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-white/20">
                          {msg.mediaType === 'video' ? (
                            <div className="bg-slate-900 aspect-video flex items-center justify-center text-white text-[10px] p-4 uppercase font-black text-center">Video Lampiran:<br/>{msg.mediaUrl.split('/').pop()}</div>
                          ) : (
                            <img src={msg.mediaUrl} alt="Lampiran AI" className="max-w-full h-auto" />
                          )}
                        </div>
                      )}
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      
                      {msg.buttons && msg.buttons.length > 0 && (
                        <div className="mt-4 flex flex-col space-y-2">
                          {msg.buttons.map((btn, i) => (
                            <button 
                              key={i} 
                              disabled 
                              className={`py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${msg.isMine ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            >
                              {btn}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className={`flex items-center space-x-1 mt-2 ${msg.isMine ? 'justify-end text-emerald-100' : 'text-slate-400'}`}>
                        <span className="text-[9px] font-bold">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.isMine && <span className="text-[10px]">✓✓</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-white border-t flex space-x-3 items-center">
              <input 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && onSendMessage(inputText, selectedContact.id)} 
                className="flex-1 p-4 bg-slate-50 rounded-2xl border-none outline-none text-sm font-medium transition-all focus:bg-white focus:ring-4 focus:ring-emerald-500/5 placeholder:text-slate-400" 
                placeholder="Tulis pesan ke pelanggan..." 
              />
              <button 
                onClick={() => onSendMessage(inputText, selectedContact.id)} 
                disabled={!inputText.trim()}
                className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all disabled:bg-slate-200 disabled:shadow-none"
              >
                <Icons.Send />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 space-y-4">
            <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-emerald-600 border border-emerald-50">
               <Icons.MessageCircle />
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Dashboard Chat Aktif</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Pilih kontak di sebelah kiri untuk mengelola chat</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
