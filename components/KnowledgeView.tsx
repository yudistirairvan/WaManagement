
import React, { useRef, useState, useEffect } from 'react';
import { Icons } from '../constants';
import { KnowledgeItem } from '../types';

interface KnowledgeViewProps {
  knowledgeBase: KnowledgeItem[];
  setKnowledgeBase: (items: KnowledgeItem[]) => void;
  newKItem: Partial<KnowledgeItem>;
  setNewKItem: (item: any) => void;
  editingKItem: string | null;
  onAddOrUpdate: () => void;
  onEdit: (item: KnowledgeItem) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  knowledgeBase, setKnowledgeBase, newKItem, setNewKItem, editingKItem,
  onAddOrUpdate, onEdit, onCancelEdit, onDelete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [buttonInput, setButtonInput] = useState('');

  // Effect to scroll to form when editing starts
  useEffect(() => {
    if (editingKItem && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Automatically expand advanced section if item has media or buttons
      if (newKItem.mediaUrl || (newKItem.buttons && newKItem.buttons.length > 0)) {
        setShowAdvanced(true);
      }
    }
  }, [editingKItem]);

  const handleExport = () => {
    const dataStr = JSON.stringify(knowledgeBase, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `knowledge_base_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          const validItems = json.filter(item => item.category && item.content);
          if (confirm(`Impor ${validItems.length} data pengetahuan baru?`)) {
            setKnowledgeBase([...knowledgeBase, ...validItems.map(item => ({
              ...item,
              id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 5)
            }))]);
          }
        }
      } catch (err) { alert("Gagal membaca file JSON."); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addButton = () => {
    if (!buttonInput.trim()) return;
    const currentButtons = newKItem.buttons || [];
    // Increased limit to 5
    if (currentButtons.length >= 5) {
        alert("Maksimal 5 tombol diperbolehkan.");
        return;
    }
    setNewKItem({ ...newKItem, buttons: [...currentButtons, buttonInput.trim()] });
    setButtonInput('');
  };

  const removeButton = (index: number) => {
    const currentButtons = newKItem.buttons || [];
    setNewKItem({ ...newKItem, buttons: currentButtons.filter((_, i) => i !== index) });
  };

  // Function to clear media
  const removeMedia = () => {
    setNewKItem({ ...newKItem, mediaUrl: '', mediaType: 'image' });
  };

  return (
    <div className="p-10 max-w-5xl mx-auto w-full space-y-8 overflow-y-auto max-h-full pb-20">
      <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Knowledge Base</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Latih AI Toko Anda</p>
          </div>
          <div className="flex items-center space-x-2">
              <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-4 py-2 bg-white text-slate-600 rounded-xl font-bold text-xs uppercase border hover:bg-slate-50 transition-all shadow-sm">
                <Icons.FileText />
                <span>Import</span>
              </button>
              <button onClick={handleExport} className="flex items-center space-x-2 px-4 py-2 bg-white text-emerald-600 rounded-xl font-bold text-xs uppercase border border-emerald-100 hover:bg-emerald-50 transition-all shadow-sm">
                <Icons.History />
                <span>Export</span>
              </button>
              <div className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100">
                  {knowledgeBase.length} Items
              </div>
          </div>
      </div>
      
      <div 
        ref={formRef}
        className={`p-8 rounded-[2.5rem] transition-all shadow-md border space-y-6 scroll-mt-10 ${editingKItem ? 'bg-emerald-50 border-emerald-400 ring-8 ring-emerald-500/5 scale-[1.01]' : 'bg-white border-slate-200'}`}
      >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {editingKItem ? '📝 Sedang Mengedit Item' : '✨ Tambah Pengetahuan Baru'}
            </h3>
            {editingKItem && (
              <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase animate-pulse">Mode Edit Aktif</span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori / Trigger</label>
                  <input value={newKItem.category || ''} onChange={e => setNewKItem({...newKItem, category: e.target.value})} placeholder="Harga, Menu, Alamat..." className="w-full p-4 bg-white rounded-2xl text-sm border-none shadow-sm focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="lg:col-span-2 space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Lengkap (Pesan Teks)</label>
                  <textarea value={newKItem.content || ''} onChange={e => setNewKItem({...newKItem, content: e.target.value})} placeholder="Tuliskan fakta untuk dijawab bot..." className="w-full p-4 bg-white rounded-2xl text-sm border-none shadow-sm focus:ring-2 focus:ring-emerald-500/20 min-h-[52px]" />
              </div>
          </div>

          <div className="border-t pt-4">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)} 
              className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center space-x-2 hover:bg-emerald-100/50 px-3 py-2 rounded-xl transition-colors"
            >
              <span>{showAdvanced ? '[-] Sembunyikan' : '[+] Media & Interaksi (Gambar/Video/Tombol)'}</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-4 bg-white/50 p-6 rounded-3xl border border-emerald-100">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Lampiran Media</label>
                    {newKItem.mediaUrl && (
                      <button onClick={removeMedia} className="text-[9px] font-black text-red-500 uppercase hover:underline">Hapus Media</button>
                    )}
                  </div>
                  <input 
                    type="text" 
                    value={newKItem.mediaUrl || ''} 
                    onChange={e => setNewKItem({...newKItem, mediaUrl: e.target.value})} 
                    placeholder="https://example.com/image.jpg" 
                    className="w-full p-4 bg-white rounded-2xl text-xs border border-slate-100 shadow-sm focus:ring-1 focus:ring-emerald-500"
                  />
                  <div>
                    <label className="block text-[9px] font-black text-slate-300 mb-2 uppercase tracking-widest">Tipe Media</label>
                    <div className="flex space-x-2">
                      {['image', 'video'].map(type => (
                        <button 
                          key={type}
                          onClick={() => setNewKItem({...newKItem, mediaType: type})}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${newKItem.mediaType === type ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-white/50 p-6 rounded-3xl border border-emerald-100">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Tombol Klik (Maks 5)</label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={buttonInput} 
                      onChange={e => setButtonInput(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && addButton()}
                      placeholder="Label tombol..." 
                      className="flex-1 p-4 bg-white rounded-2xl text-xs border border-slate-100 shadow-sm focus:ring-1 focus:ring-emerald-500"
                    />
                    <button 
                      onClick={addButton}
                      disabled={(newKItem.buttons?.length || 0) >= 5}
                      className="px-6 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 disabled:bg-slate-200 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newKItem.buttons?.map((btn, idx) => (
                      <span key={idx} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center space-x-3 border border-emerald-200 shadow-sm">
                        <span>{btn}</span>
                        <button onClick={() => removeButton(idx)} className="text-emerald-400 hover:text-red-500 font-bold text-lg leading-none">×</button>
                      </span>
                    ))}
                    {(!newKItem.buttons || newKItem.buttons.length === 0) && (
                      <span className="text-[10px] text-slate-300 italic">Belum ada tombol dikonfigurasi</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4 border-t border-slate-100">
              <button 
                onClick={onAddOrUpdate} 
                className={`flex-1 py-4 ${editingKItem ? 'bg-blue-600 shadow-blue-100' : 'bg-emerald-600 shadow-emerald-100'} text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all`}
              >
                  {editingKItem ? 'Simpan Perubahan' : 'Tambah Pengetahuan'}
              </button>
              {editingKItem && (
                <button onClick={onCancelEdit} className="px-8 py-4 bg-slate-200 text-slate-600 rounded-[1.5rem] font-black uppercase text-xs hover:bg-slate-300 transition-colors">Batal</button>
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {knowledgeBase.length === 0 ? (
            <div className="md:col-span-2 text-center p-20 bg-white rounded-[3rem] border border-dashed text-slate-300 font-black uppercase text-xs tracking-widest">Database Kosong</div>
          ) : knowledgeBase.map(item => (
              <div key={item.id} className={`p-6 rounded-[2rem] border transition-all group overflow-hidden ${editingKItem === item.id ? 'border-emerald-500 bg-white shadow-xl scale-[0.98]' : 'bg-white border-slate-100 hover:border-emerald-200'}`}>
                  {item.mediaUrl && (
                    <div className="mb-4 rounded-2xl overflow-hidden bg-slate-100 aspect-video relative">
                      {item.mediaType === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-[10px] font-black uppercase">Video: {item.mediaUrl.split('/').pop()}</div>
                      ) : (
                        <img src={item.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute top-2 right-2 bg-slate-900/50 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase">{item.mediaType}</div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-3">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider">{item.category}</span>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                          <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                      </div>
                  </div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed mb-4">{item.content}</p>
                  
                  {item.buttons && item.buttons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.buttons.map((btn, i) => (
                        <div key={i} className="flex-1 text-center py-2 bg-slate-50 border rounded-xl text-[9px] font-black text-slate-400 uppercase">
                          {btn}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
          ))}
      </div>
    </div>
  );
};
