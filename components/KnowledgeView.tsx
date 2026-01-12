
import React from 'react';
import { Icons } from '../constants';
import { KnowledgeItem } from '../types';

interface KnowledgeViewProps {
  knowledgeBase: KnowledgeItem[];
  newKItem: { category: string, content: string };
  setNewKItem: (item: any) => void;
  editingKItem: string | null;
  onAddOrUpdate: () => void;
  onEdit: (item: KnowledgeItem) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  knowledgeBase, newKItem, setNewKItem, editingKItem,
  onAddOrUpdate, onEdit, onCancelEdit, onDelete
}) => {
  return (
    <div className="p-10 max-w-5xl mx-auto w-full space-y-8 overflow-y-auto max-h-full pb-20">
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase tracking-tight">Knowledge Base</h2>
          <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest border border-emerald-100">
              {knowledgeBase.length} Items
          </div>
      </div>
      
      <div id="kb-form" className={`grid grid-cols-1 lg:grid-cols-3 gap-6 p-8 rounded-[2.5rem] transition-all shadow-sm border ${editingKItem ? 'bg-emerald-50 border-emerald-200 ring-4 ring-emerald-500/5' : 'bg-white'}`}>
          <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</label>
              <input value={newKItem.category} onChange={e => setNewKItem({...newKItem, category: e.target.value})} placeholder="Harga, Menu, Alamat..." className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-emerald-500/10" />
          </div>
          <div className="lg:col-span-2 flex space-x-3 items-end">
              <div className="flex-1 space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Lengkap</label>
                  <input value={newKItem.content} onChange={e => setNewKItem({...newKItem, content: e.target.value})} placeholder="Tuliskan fakta untuk dijawab bot..." className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-emerald-500/10" />
              </div>
              <div className="flex space-x-2">
                  <button onClick={onAddOrUpdate} className={`p-4 ${editingKItem ? 'bg-blue-600' : 'bg-emerald-600'} text-white rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-emerald-100`}>
                      {editingKItem ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : <Icons.UserPlus />}
                  </button>
                  {editingKItem && (
                    <button onClick={onCancelEdit} className="p-4 bg-slate-200 text-slate-600 rounded-2xl hover:bg-slate-300 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  )}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {knowledgeBase.length === 0 ? (
            <div className="md:col-span-2 text-center p-20 bg-white rounded-[3rem] border border-dashed text-slate-300 font-black uppercase text-xs tracking-widest">Database Kosong</div>
          ) : knowledgeBase.map(item => (
              <div key={item.id} className={`p-6 rounded-[2rem] border transition-all group ${editingKItem === item.id ? 'border-emerald-500 bg-white shadow-xl translate-y-[-4px]' : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-md'}`}>
                  <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider">{item.category}</span>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                          <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                      </div>
                  </div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">{item.content}</p>
              </div>
          ))}
      </div>
    </div>
  );
};
