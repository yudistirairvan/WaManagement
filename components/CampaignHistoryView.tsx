
import React, { useState } from 'react';
import { Icons } from '../constants';
import { Contact, BlastHistory } from '../types';

interface CampaignHistoryViewProps {
  blastHistory: BlastHistory[];
  setBlastHistory: (history: BlastHistory[]) => void;
  contacts: Contact[];
  onResendBlast?: (text: string, jids: string[]) => void;
}

export const CampaignHistoryView: React.FC<CampaignHistoryViewProps> = ({ 
  blastHistory, 
  setBlastHistory,
  contacts,
  onResendBlast
}) => {
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [isResending, setIsResending] = useState<string | null>(null);

  const deleteHistory = (id: string) => {
    if (confirm("Hapus catatan riwayat campaign ini?")) {
      setBlastHistory(blastHistory.filter(h => h.id !== id));
      if (expandedHistoryId === id) setExpandedHistoryId(null);
    }
  };

  const handleResend = (history: BlastHistory) => {
    if (!onResendBlast) return;
    
    if (confirm(`Kirim ulang campaign "${history.campaignName}" kepada ${history.recipients.length} penerima?`)) {
      setIsResending(history.id);
      
      // Execute the blast
      onResendBlast(history.message, history.recipients);
      
      // Create a new entry for this resend
      const newHistory: BlastHistory = {
        id: Date.now().toString(),
        campaignName: `${history.campaignName} (Resend)`,
        message: history.message,
        timestamp: new Date(),
        recipients: history.recipients,
        status: 'completed'
      };

      setTimeout(() => {
        setBlastHistory([newHistory, ...blastHistory]);
        setIsResending(null);
        alert("Campaign dikirim ulang berhasil masuk antrian!");
      }, 1000);
    }
  };

  const clearAllHistory = () => {
    if (confirm("Hapus SEMUA riwayat campaign? Tindakan ini tidak dapat dibatalkan.")) {
      setBlastHistory([]);
      setExpandedHistoryId(null);
    }
  };

  return (
    <div className="p-10 max-w-5xl mx-auto w-full space-y-8 overflow-y-auto max-h-full pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Campaign History</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lacak Performa Pesan Massal</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {blastHistory.length} Campaigns
          </div>
          {blastHistory.length > 0 && (
            <button 
              onClick={clearAllHistory}
              className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
            >
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      {blastHistory.length > 0 ? (
        <div className="space-y-4">
          {blastHistory.map((history) => (
            <div key={history.id} className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm transition-all hover:shadow-md">
              <div 
                className="p-6 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedHistoryId(expandedHistoryId === history.id ? null : history.id)}
              >
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 shadow-inner">
                    <Icons.History />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">{history.campaignName}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {new Date(history.timestamp).toLocaleString('id-ID')} • {history.recipients.length} Penerima
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteHistory(history.id); }}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-transform duration-300 ${expandedHistoryId === history.id ? 'rotate-180 bg-slate-900 border-slate-900 text-white' : 'bg-white text-slate-300'}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>

              {expandedHistoryId === history.id && (
                <div className="px-8 pb-8 pt-4 border-t bg-slate-50/50 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Konten Pesan</label>
                        <button 
                          onClick={() => handleResend(history)}
                          disabled={isResending !== null}
                          className="flex items-center space-x-2 px-3 py-1 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:bg-slate-300 shadow-sm"
                        >
                          <Icons.Send />
                          <span>{isResending === history.id ? 'Mengirim...' : 'Kirim Ulang'}</span>
                        </button>
                      </div>
                      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative">
                         <p className="text-xs text-slate-600 leading-relaxed font-medium">"{history.message}"</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Daftar Penerima</label>
                      </div>
                      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                          {history.recipients.map((jid) => {
                            const contact = contacts.find(c => c.id === jid);
                            return (
                              <div key={jid} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-black text-slate-800 truncate">
                                    {contact?.name || 'Unknown'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">+{contact?.phone || jid.split('@')[0]}</span>
                                </div>
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-20 border-2 border-dashed rounded-[3.5rem] text-center bg-white flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
            <Icons.History />
          </div>
          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Belum ada riwayat campaign</p>
        </div>
      )}
    </div>
  );
};
