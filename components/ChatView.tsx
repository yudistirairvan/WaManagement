
import React from 'react';
import { Icons } from '../constants';
import { Contact, Message } from '../types';

interface ChatViewProps {
  contacts: Contact[];
  messages: Record<string, Message[]>;
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
  contacts, messages, selectedContact, setSelectedContact,
  searchTerm, setSearchTerm, isSyncingContacts, onSyncContacts,
  inputText, setInputText, onSendMessage
}) => {
  const filteredContacts = contacts.filter(contact => 
    (contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     contact.phone?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest">Daftar Chat</h2>
            <button onClick={onSyncContacts} className={`p-2 rounded-lg transition-all ${isSyncingContacts ? 'bg-emerald-100 text-emerald-600 animate-spin' : 'hover:bg-slate-100 text-slate-400'}`}><Icons.History /></button>
          </div>
          <input type="text" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 rounded-xl py-2 px-4 text-xs font-medium outline-none border focus:border-emerald-500 transition-all" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
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
                  <p className="text-xs text-slate-500 truncate mt-0.5">{contact.lastMessage || contact.phone}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Tidak ada kontak ditemukan</div>
          )}
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
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {(messages[selectedContact.id] || []).map(msg => (
                <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm ${msg.isMine ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border'}`}>
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                    <span className={`text-[9px] block mt-1 ${msg.isMine ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
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
