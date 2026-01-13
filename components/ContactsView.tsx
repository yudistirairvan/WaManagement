
import React, { useState } from 'react';
import { Icons } from '../constants';
import { Contact } from '../types';

interface ContactsViewProps {
  contacts: Contact[];
  isSyncing: boolean;
  onSync: () => void;
  onSelectChat: (contact: Contact) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ 
  contacts, 
  isSyncing, 
  onSync,
  onSelectChat
}) => {
  const [search, setSearch] = useState('');

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="p-10 max-w-5xl mx-auto w-full space-y-8 overflow-y-auto max-h-full pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Daftar Kontak</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Data kontak dari WhatsApp yang terhubung
          </p>
        </div>
        <button 
          onClick={onSync}
          disabled={isSyncing}
          className={`flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95 transition-all disabled:bg-slate-300`}
        >
          <div className={isSyncing ? 'animate-spin' : ''}>
            <Icons.History />
          </div>
          <span>{isSyncing ? 'Sinkronisasi...' : 'Sinkron Ulang'}</span>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Cari nama atau nomor telepon..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
          </div>
        </div>

        <div className="divide-y max-h-[600px] overflow-y-auto">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
              <div key={contact.id} className="p-4 hover:bg-slate-50 flex items-center justify-between group transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg">
                    {contact.name ? contact.name[0].toUpperCase() : '#'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{contact.name || 'Tanpa Nama'}</h4>
                    <p className="text-xs font-medium text-slate-400 tracking-wider">+{contact.phone}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onSelectChat(contact)}
                  className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all"
                >
                  Kirim Pesan
                </button>
              </div>
            ))
          ) : (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <Icons.Users />
              </div>
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Tidak ada kontak ditemukan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
