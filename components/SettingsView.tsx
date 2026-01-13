
import React from 'react';
import { Icons } from '../constants';
import { SMEConfig } from '../types';

interface SettingsViewProps {
  config: SMEConfig;
  setConfig: (config: SMEConfig) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  isSocketConnected: boolean;
  isResetting: boolean;
  onReconnect: () => void;
  onTabChange: (tab: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config, setConfig, geminiApiKey, setGeminiApiKey, showApiKey, setShowApiKey,
  backendUrl, setBackendUrl, isSocketConnected, isResetting, onReconnect, onTabChange
}) => {
  return (
    <div className="p-10 max-w-5xl mx-auto w-full space-y-8 overflow-y-auto max-h-full pb-20">
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase tracking-tight">System Settings</h2>
          <div className="flex items-center space-x-3 bg-white px-6 py-3 rounded-2xl border shadow-sm">
              <span className="text-xs font-bold text-slate-500">Auto Reply AI</span>
              <button 
                onClick={() => setConfig({...config, autoReplyEnabled: !config.autoReplyEnabled})} 
                className={`w-12 h-6 rounded-full transition-all relative ${config.autoReplyEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.autoReplyEnabled ? 'left-7' : 'left-1'}`} />
              </button>
          </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Profil Bisnis
              </h3>
              <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter">Nama Toko</label>
                  <input value={config.businessName} onChange={e => setConfig({...config, businessName: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-emerald-500/10" />
              </div>
              <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter">Deskripsi</label>
                  <textarea value={config.description} onChange={e => setConfig({...config, description: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-sm h-24 border-none focus:ring-2 focus:ring-emerald-500/10" />
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-between">
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Manajemen Pengetahuan</span>
                      <span className="text-xs font-bold text-slate-600">{config.knowledgeBase.length} Entri tersimpan</span>
                  </div>
                  <button onClick={() => onTabChange('knowledge')} className="px-4 py-2 bg-white text-emerald-600 rounded-xl text-[10px] font-black uppercase border shadow-sm hover:scale-105 transition-all">Buka Editor</button>
              </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> API & Kredensial
                </h3>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter">Gemini API Key</label>
                    <div className="relative">
                      <input 
                        type={showApiKey ? "text" : "password"}
                        value={geminiApiKey} 
                        onChange={e => setGeminiApiKey(e.target.value)} 
                        className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none pr-12 focus:ring-2 focus:ring-emerald-500/10" 
                      />
                      <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 font-bold text-[10px] uppercase">
                        {showApiKey ? "Hide" : "Show"}
                      </button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Koneksi Server
                </h3>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter">URL Backend</label>
                    <div className="flex space-x-2 mb-4">
                        <input value={backendUrl} onChange={e => setBackendUrl(e.target.value)} className="flex-1 p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-emerald-500/10" />
                        <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-6 rounded-2xl font-bold text-[10px] uppercase">Reload</button>
                    </div>
                    <button 
                      onClick={onReconnect}
                      disabled={!isSocketConnected || isResetting}
                      className="w-full p-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl font-bold text-[10px] uppercase hover:bg-amber-100 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Icons.QrCode />
                      <span>{isResetting ? 'Cleaning...' : 'Ganti Akun WhatsApp'}</span>
                    </button>
                </div>
            </div>
          </div>
      </section>
    </div>
  );
};
