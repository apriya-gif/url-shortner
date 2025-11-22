import React, { useState, useEffect } from 'react';
import { XMarkIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  detectedUrl: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, detectedUrl }) => {
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCustomUrl(settings.customBaseUrl || '');
    }
  }, [isOpen, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Normalize URL: remove trailing slash
    let cleaned = customUrl.trim();
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    
    // Add protocol if missing
    if (cleaned && !cleaned.startsWith('http')) {
      cleaned = `https://${cleaned}`;
    }

    onSave({ ...settings, customBaseUrl: cleaned });
    onClose();
  };

  const handleClear = () => {
    onSave({ ...settings, customBaseUrl: undefined });
    setCustomUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5 text-slate-500" />
            Domain Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Custom Base URL</label>
            <p className="text-xs text-slate-500 mb-2">
              Override the messy default URL with your own domain.
            </p>
            <input
              type="text"
              placeholder="https://www.wqrt32s.com"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
             <p className="text-xs text-blue-800">
               <strong>Current Detected URL:</strong><br/>
               {detectedUrl}
             </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors"
            >
              Reset to Default
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 font-medium transition-all active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};