import React, { useState, useEffect } from 'react';
import { XMarkIcon, GlobeAltIcon, ArrowDownTrayIcon, CloudArrowUpIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { AppSettings } from '../types';
import { downloadDB } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  detectedUrl: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, detectedUrl }) => {
  const [customUrl, setCustomUrl] = useState('');
  const [gaId, setGaId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCustomUrl(settings.customBaseUrl || '');
      setGaId(settings.googleAnalyticsId || '');
    }
  }, [isOpen, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanedUrl = customUrl.trim();
    if (cleanedUrl.endsWith('/')) {
        cleanedUrl = cleanedUrl.slice(0, -1);
    }
    if (cleanedUrl && !cleanedUrl.startsWith('http')) {
        cleanedUrl = `https://${cleanedUrl}`;
    }

    const cleanedGa = gaId.trim().toUpperCase();

    onSave({ 
        ...settings, 
        customBaseUrl: cleanedUrl,
        googleAnalyticsId: cleanedGa
    });
    onClose();
  };

  const handleClear = () => {
    onSave({ ...settings, customBaseUrl: undefined, googleAnalyticsId: undefined });
    setCustomUrl('');
    setGaId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5 text-slate-500" />
            Global Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Domain Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Public Domain (LinkedIn Friendly)</label>
              <p className="text-xs text-slate-500 mb-2">
                Enter your website URL here so the "Copy" button generates the correct links for sharing (e.g., https://mysite.com).
              </p>
              <input
                type="text"
                placeholder="https://www.wqrt32s.com"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4" />
                Google Analytics ID (Optional)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                To track how many people visit your links, enter a GA4 Measurement ID (e.g., G-XXXXXXXXXX).
              </p>
              <input
                type="text"
                placeholder="G-A1B2C3D4E5"
                value={gaId}
                onChange={(e) => setGaId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm uppercase"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* Deployment Section */}
          <div className="space-y-3">
             <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <CloudArrowUpIcon className="w-4 h-4" />
                How to Share with Recruiters
             </h3>
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-3">
               <p>
                 Links created locally won't work for others unless you deploy.
               </p>
               <ol className="list-decimal pl-4 space-y-1 text-slate-500">
                 <li>Add links here on your laptop.</li>
                 <li>Click <strong>Download Database</strong> below.</li>
                 <li>Upload <code>db.json</code> + <code>index.html</code> to your website.</li>
               </ol>
             </div>
             
             <button
               type="button"
               onClick={downloadDB}
               className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-bold transition-colors border border-slate-200"
             >
               <ArrowDownTrayIcon className="w-4 h-4" />
               Download Database (db.json)
             </button>
          </div>

          <div className="border-t border-slate-100 pt-4 flex gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 font-medium transition-all active:scale-95"
            >
              Save & Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};