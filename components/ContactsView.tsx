
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { Contact } from '../types';

interface ContactsViewProps {
  contacts: Contact[];
  isSyncing: boolean;
  onSync: () => void;
  onSelectChat: (contact: Contact) => void;
  // Menambahkan callback untuk memperbarui state kontak di App.tsx jika diimpor manual
  setContacts?: (contacts: Contact[]) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ 
  contacts, 
  isSyncing, 
  onSync,
  onSelectChat,
  setContacts
}) => {
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const time = localStorage.getItem('sme_contacts_last_sync');
    if (time) {
      setLastSync(new Date(time).toLocaleString('id-ID'));
    }
  }, [contacts, isSyncing]);

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const handleExportContacts = () => {
    if (contacts.length === 0) {
      alert("Tidak ada kontak untuk diekspor.");
      return;
    }

    setIsExporting(true);

    // Simulasi delay sedikit untuk memberikan kesan pemrosesan data besar
    // sekaligus memastikan user melihat feedback progress
    setTimeout(() => {
      try {
        const dataStr = JSON.stringify(contacts, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `wa_contacts_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      } catch (error) {
        console.error("Export error:", error);
        alert("Gagal mengekspor kontak.");
      } finally {
        setIsExporting(false);
      }
    }, 800);
  };

  const handleImportContacts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !setContacts) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          // Validasi sederhana dan normalisasi data
          const newContacts: Contact[] = json.filter(c => c.id || c.phone).map(c => ({
            id: c.id || `${c.phone}@s.whatsapp.net`,
            name: c.name || `User ${c.phone}`,
            phone: c.phone || c.id?.split('@')[0] || '',
            unreadCount: 0
          }));

          if (confirm(`Impor ${newContacts.length} kontak baru? Data akan digabungkan dengan yang sudah ada.`)) {
            // Merge agar tidak duplikat berdasarkan ID
            const contactMap = new Map();
            contacts.forEach(c => contactMap.set(c.id, c));
            newContacts.forEach(c => contactMap.set(c.id, c));
            
            const merged = Array.from(contactMap.values());
            setContacts(merged);
            localStorage.setItem('sme_contacts_cache', JSON.stringify(merged));
            alert("Kontak berhasil diimpor!");
          }
        } else {
          alert("Format file tidak valid. Gunakan format JSON Array.");
        }
      } catch (err) {
        alert("Gagal membaca file JSON.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-10 max-w-5xl mx-auto w-full space-y-8 overflow-y-auto max-h-full pb-20 relative">
      {/* Progress Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Mengekspor Data</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sedang menyiapkan file...</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Daftar Kontak</h2>
          <div className="flex flex-col mt-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Manajemen Database Pelanggan
            </p>
            {lastSync && (
              <p className="text-[9px] text-emerald-500 font-bold uppercase mt-1">
                Sinkron terakhir: {lastSync}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportContacts} 
            accept=".json" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-3 bg-white text-slate-600 rounded-2xl font-black text-[10px] uppercase border hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <Icons.FileText />
            <span>Import</span>
          </button>
          
          <button 
            onClick={handleExportContacts}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-3 bg-white text-emerald-600 rounded-2xl font-black text-[10px] uppercase border border-emerald-100 hover:bg-emerald-50 transition-all shadow-sm disabled:opacity-50"
          >
            <Icons.History />
            <span>Export</span>
          </button>

          <button 
            onClick={onSync}
            disabled={isSyncing || isExporting}
            className={`flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95 transition-all disabled:bg-slate-300`}
          >
            <div className={isSyncing ? 'animate-spin' : ''}>
              <Icons.History />
            </div>
            <span>{isSyncing ? 'Sync...' : 'Sync WA'}</span>
          </button>
        </div>
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
