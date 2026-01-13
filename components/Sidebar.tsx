
import React from 'react';
import { Icons } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isSocketConnected: boolean;
  baileysStatus: string;
  isResetting: boolean;
  onReconnect: () => void;
  onLogout: () => void;
}

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 translate-x-1' 
      : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
    }`}
  >
    <div className={active ? 'text-white' : 'text-slate-400'}>{icon}</div>
    <span className="font-semibold text-sm">{label}</span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isSocketConnected, 
  baileysStatus, 
  isResetting, 
  onReconnect, 
  onLogout 
}) => {
  return (
    <aside className="w-72 bg-white border-r flex flex-col p-6 shadow-sm z-20">
      <div className="mb-10 flex items-center space-x-3 px-2">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100 font-black">AI</div>
        <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Wa Dashboard</h1>
      </div>
      <nav className="space-y-2 flex-1">
        <SidebarItem icon={<Icons.MessageCircle />} label="Chats" active={activeTab === 'chats'} onClick={() => setActiveTab('chats')} />
        <SidebarItem icon={<Icons.Users />} label="Contacts List" active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} />
        <SidebarItem icon={<Icons.Blast />} label="Blast (Bulk)" active={activeTab === 'blast'} onClick={() => setActiveTab('blast')} />
        <SidebarItem icon={<Icons.Bot />} label="Knowledge Base" active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} />
        <SidebarItem icon={<Icons.Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
      
      <div className="mt-auto space-y-4">
        <div className="p-5 bg-slate-50 border rounded-3xl text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Server Status</span>
            <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
          </div>
          <div className={`text-[10px] font-black uppercase inline-flex items-center px-3 py-1 rounded-full mb-3 ${baileysStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
             WA: {baileysStatus}
          </div>
          <button 
            onClick={onReconnect}
            disabled={!isSocketConnected || isResetting}
            className={`flex items-center justify-center space-x-2 w-full text-[9px] font-black uppercase tracking-widest py-3 border rounded-xl transition-all shadow-sm ${isSocketConnected ? 'text-amber-600 border-amber-200 bg-amber-50/50 hover:bg-amber-50 active:scale-95' : 'text-slate-400 border-slate-200 bg-slate-100 cursor-not-allowed'}`}
          >
            <Icons.QrCode />
            <span>{isResetting ? 'Mereset...' : 'Ganti Akun'}</span>
          </button>
        </div>
        <button onClick={onLogout} className="w-full text-xs font-black text-red-500 py-2 hover:bg-red-50 rounded-xl transition-all uppercase tracking-widest">Logout</button>
      </div>
    </aside>
  );
};
