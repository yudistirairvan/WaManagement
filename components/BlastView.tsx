
import React, { useState } from 'react';
import { Icons } from '../constants';
import { Contact, CampaignGroup, BlastHistory } from '../types';

interface BlastViewProps {
  contacts: Contact[];
  campaignGroups: CampaignGroup[];
  setCampaignGroups: (groups: CampaignGroup[]) => void;
  blastHistory: BlastHistory[];
  setBlastHistory: (history: BlastHistory[]) => void;
  baileysStatus: string;
  isSocketConnected: boolean;
  onBlast: (text: string, jids: string[]) => void;
}

export const BlastView: React.FC<BlastViewProps> = ({ 
  contacts, 
  campaignGroups,
  setCampaignGroups,
  blastHistory,
  setBlastHistory,
  baileysStatus, 
  isSocketConnected, 
  onBlast 
}) => {
  const [blastText, setBlastText] = useState('');
  const [isBlasting, setIsBlasting] = useState(false);
  const [targetType, setTargetType] = useState<'all' | 'group'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  
  // UI for managing groups
  const [isManagingGroups, setIsManagingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedContactJids, setSelectedContactJids] = useState<string[]>([]);

  const handleBlast = () => {
    if (!blastText.trim() || !isSocketConnected) return;
    
    let targetJids: string[] = [];
    let campaignName = "";

    if (targetType === 'all') {
      targetJids = contacts.map(c => c.id);
      campaignName = `Blast Semua Kontak (${new Date().toLocaleDateString('id-ID')})`;
    } else {
      const group = campaignGroups.find(g => g.id === selectedGroupId);
      if (!group) return alert("Pilih grup terlebih dahulu");
      targetJids = group.contacts;
      campaignName = `Campaign: ${group.name}`;
    }

    if (targetJids.length === 0) return alert("Target penerima kosong");

    setIsBlasting(true);
    onBlast(blastText, targetJids);
    
    // Save to history with recipient details
    const newHistory: BlastHistory = {
      id: Date.now().toString(),
      campaignName: campaignName,
      message: blastText,
      timestamp: new Date(),
      recipients: targetJids,
      status: 'completed'
    };
    
    setTimeout(() => {
      setBlastHistory([newHistory, ...blastHistory]);
      setIsBlasting(false);
      setBlastText('');
      alert(`Pesan blast dikirim ke antrian untuk ${targetJids.length} nomor!`);
    }, 1500);
  };

  const createGroup = () => {
    if (!newGroupName.trim() || selectedContactJids.length === 0) {
      return alert("Nama grup dan minimal 1 kontak harus dipilih");
    }
    const newGroup: CampaignGroup = {
      id: Date.now().toString(),
      name: newGroupName,
      contacts: selectedContactJids,
      createdAt: new Date()
    };
    setCampaignGroups([...campaignGroups, newGroup]);
    setNewGroupName('');
    setSelectedContactJids([]);
    setIsManagingGroups(false);
  };

  const deleteGroup = (id: string) => {
    if (confirm("Hapus grup ini?")) {
      setCampaignGroups(campaignGroups.filter(g => g.id !== id));
      if (selectedGroupId === id) setSelectedGroupId('');
    }
  };

  const toggleContact = (jid: string) => {
    setSelectedContactJids(prev => 
      prev.includes(jid) ? prev.filter(j => j !== jid) : [...prev, jid]
    );
  };

  if (isManagingGroups) {
    return (
      <div className="p-10 max-w-4xl mx-auto w-full overflow-y-auto max-h-full pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tight">Buat Grup Campaign</h2>
          <button onClick={() => setIsManagingGroups(false)} className="text-xs font-black text-slate-400 uppercase hover:text-slate-600">Batal</button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Nama Grup</label>
            <input 
              type="text"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Contoh: Reseller Jawa, Pelanggan VIP..."
              className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Pilih Kontak ({selectedContactJids.length})</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-4 rounded-2xl bg-slate-50">
              {contacts.map(contact => (
                <div 
                  key={contact.id} 
                  onClick={() => toggleContact(contact.id)}
                  className={`flex items-center p-3 rounded-xl cursor-pointer transition-all border ${selectedContactJids.includes(contact.id) ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-transparent'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${selectedContactJids.includes(contact.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {selectedContactJids.includes(contact.id) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold truncate">{contact.name || contact.phone}</span>
                    <span className="text-[10px] text-slate-400">+{contact.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={createGroup}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:scale-[1.01] active:scale-[0.98] transition-all"
          >
            Simpan Grup Campaign
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-4xl mx-auto w-full overflow-y-auto max-h-full pb-20 space-y-12">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">WhatsApp Blast</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Kirim Pesan Massal Terjadwal</p>
          </div>
          <button 
            onClick={() => setIsManagingGroups(true)}
            className="px-4 py-2 bg-white text-emerald-600 border border-emerald-100 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-emerald-50 transition-all flex items-center space-x-2"
          >
            <Icons.UserPlus />
            <span>Manage Groups</span>
          </button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <div className="flex space-x-4">
            <button 
              onClick={() => setTargetType('all')}
              className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${targetType === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
            >
              Semua Kontak ({contacts.length})
            </button>
            <button 
              onClick={() => setTargetType('group')}
              className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${targetType === 'group' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
            >
              Grup Campaign ({campaignGroups.length})
            </button>
          </div>

          {targetType === 'group' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Grup Target</label>
              <div className="flex flex-wrap gap-3">
                {campaignGroups.length > 0 ? campaignGroups.map(group => (
                  <div 
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`relative px-5 py-3 rounded-2xl border cursor-pointer transition-all group ${selectedGroupId === group.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white'}`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs">{group.name}</span>
                      <span className={`text-[9px] font-black ${selectedGroupId === group.id ? 'text-emerald-100' : 'text-slate-400'}`}>({group.contacts.length})</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <span className="text-[10px]">×</span>
                    </button>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 italic">Belum ada grup kampanye.</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Isi Pesan Blast</label>
            <textarea 
              value={blastText} 
              onChange={e => setBlastText(e.target.value)} 
              placeholder="Tulis pesan promosi Anda di sini..." 
              className="w-full p-6 bg-slate-50 border-none rounded-3xl h-48 outline-none text-sm focus:ring-2 focus:ring-emerald-500/10 transition-all" 
            />
          </div>

          <div className="bg-emerald-50 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <Icons.Blast />
              </div>
              <div>
                <p className="text-xs font-black text-emerald-800 uppercase tracking-tight">Siap Meluncur</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase">
                  Target: {targetType === 'all' ? contacts.length : (campaignGroups.find(g => g.id === selectedGroupId)?.contacts.length || 0)} Penerima
                </p>
              </div>
            </div>
            {baileysStatus !== 'connected' && (
              <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">WA Offline</span>
            )}
          </div>

          <button 
            onClick={handleBlast} 
            disabled={isBlasting || baileysStatus !== 'connected' || !blastText.trim() || (targetType === 'group' && !selectedGroupId)} 
            className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black shadow-xl shadow-emerald-200 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none uppercase tracking-widest text-xs"
          >
            {isBlasting ? 'Memproses Pengiriman...' : 'Luncurkan Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
};
