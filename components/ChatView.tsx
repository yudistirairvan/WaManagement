
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
          if (confirm("Ganti history chat lokal dengan file ini?")) {
            setMessages(json);
          }
        }
      } catch (err) { alert("Gagal membaca file JSON."); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearCurrentHistory = () => {
    if (selectedContact && confirm(`Hapus semua pesan untuk ${selectedContact.name}?`)) {
      const updatedMessages = { ...messages };
      delete updatedMessages[selectedContact.id];
      setMessages(updatedMessages);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
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
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {lastMsg ? lastMsg.text : (contact.lastMessage || contact.phone)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Tidak ada kontak ditemukan</div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase text-center mb-1">Backup History</p>
            <div className="flex space-x-2">
              <input type="file" ref={fileInputRef} onChange={handleImportHistory} className="hidden" accept=".json" />
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 bg-white border rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-100">Import</button>
              <button onClick={handleExportHistory} className="flex-1 py-2 bg-white border rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-100">Export</button>
            </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selectedContact ? (
          <>
            <div className="p-4 border-b flex items-center justify-between shadow-sm z-10 bg-white">
              <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">{(selectedContact.name || selectedContact.phone)[0]}</div>
                  <div className="flex flex-col">
                      <span className="font-bold text-slate-800 leading-none">{selectedContact.name || selectedContact.phone}</span>
                      <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{selectedContact.phone}</span>
                  </div>
              </div>
              <div className="flex items-center space-x-2">
                 <button onClick={clearCurrentHistory} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Hapus Chat"><Icons.FileText /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {(!messages[selectedContact.id] || messages[selectedContact.id].length === 0) && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                   <Icons.History />
                   <p className="text-[10px] font-black uppercase tracking-widest">Belum ada percakapan</p>
                </div>
              )}
              
              {(messages[selectedContact.id] || []).map(msg => (
                <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] flex flex-col space-y-1 ${msg.isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl shadow-sm overflow-hidden ${msg.isMine ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border'}`}>
                      {msg.mediaUrl && (
                        <div className="mb-3 rounded-xl overflow-hidden">
                          {msg.mediaType === 'video' ? (
                            <div className="bg-slate-900 aspect-video flex items-center justify-center text-white text-[10px] p-4 uppercase font-black">Video Sent: {msg.mediaUrl}</div>
                          ) : (
                            <img src={msg.mediaUrl} alt="Attached" className="max-w-full h-auto" />
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
                              className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${msg.isMine ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            >
                              {btn}
                            </button>
                          ))}
                        </div>
                      )}

                      <span className={`text-[9px] block mt-2 ${msg.isMine ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
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
                className="flex-1 p-4 bg-slate-50 rounded-2xl border-none outline-none text-sm transition-all focus:bg-white focus:ring-2 focus:ring-emerald-500/20" 
                placeholder="Tulis pesan..." 
              />
              <button onClick={() => onSendMessage(inputText, selectedContact.id)} className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95 transition-all"><Icons.Send /></button>
            </div>
          </>
        ) : <div className="flex-1 flex items-center justify-center text-slate-300 uppercase font-black text-xs tracking-widest bg-slate-50/50">Pilih kontak untuk chat</div>}
      </div>
    </div>
  );
};
