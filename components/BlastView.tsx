
import React, { useState } from 'react';
import { Icons } from '../constants';
import { Contact } from '../types';

interface BlastViewProps {
  contacts: Contact[];
  baileysStatus: string;
  isSocketConnected: boolean;
  onBlast: (text: string, jids: string[]) => void;
}

export const BlastView: React.FC<BlastViewProps> = ({ 
  contacts, 
  baileysStatus, 
  isSocketConnected, 
  onBlast 
}) => {
  const [blastText, setBlastText] = useState('');
  const [isBlasting, setIsBlasting] = useState(false);

  const handleBlast = () => {
    if (!blastText.trim() || !isSocketConnected) return;
    setIsBlasting(true);
    onBlast(blastText, contacts.map(c => c.id));
    setTimeout(() => {
      setIsBlasting(false);
      setBlastText('');
      alert("Pesan blast telah dikirim ke antrian server!");
    }, 2000);
  };

  return (
    <div className="p-10 max-w-4xl mx-auto w-full overflow-y-auto">
      <h2 className="text-2xl font-black mb-8 uppercase tracking-tight">WhatsApp Blast</h2>
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Pesan Promosi</label>
            <textarea 
              value={blastText} 
              onChange={e => setBlastText(e.target.value)} 
              placeholder="Tulis pesan yang akan dikirim ke semua kontak..." 
              className="w-full p-6 bg-slate-50 border-none rounded-3xl h-48 outline-none text-sm focus:ring-2 focus:ring-emerald-500/10 transition-all" 
            />
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600"><Icons.Users /></div>
            <div>
              <p className="text-xs font-bold text-emerald-800">Status Database</p>
              <p className="text-[10px] font-medium text-emerald-600">{contacts.length} Kontak ditemukan</p>
            </div>
          </div>
          <button 
            onClick={handleBlast} 
            disabled={isBlasting || baileysStatus !== 'connected' || !blastText.trim()} 
            className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black shadow-xl shadow-emerald-200 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
          >
            {isBlasting ? 'Memproses...' : `Kirim Blast ke ${contacts.length} Kontak`}
          </button>
      </div>
    </div>
  );
};
