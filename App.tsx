import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon, MagnifyingGlassIcon, RocketLaunchIcon, ExclamationTriangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { ShortLink, AppSettings } from './types';
import { getLinks, saveLink, deleteLink, incrementClicks, getSettings, saveSettings } from './services/storage';
import { initGA, trackRedirect } from './services/analytics';
import { LinkCard } from './components/LinkCard';
import { CreateLinkModal } from './components/CreateLinkModal';
import { SettingsModal } from './components/SettingsModal';

enum AppMode {
  BOOTSTRAP,
  DASHBOARD,
  REDIRECT_PROCESS,
  NOT_FOUND
}

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.BOOTSTRAP);
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [detectedUrl, setDetectedUrl] = useState('');
  const [settings, setSettings] = useState<AppSettings>({});
  
  const [isBlob, setIsBlob] = useState(false);
  const [redirectData, setRedirectData] = useState<{target: string, slug: string} | null>(null);

  // --- INITIALIZATION SEQUENCE ---
  useEffect(() => {
    const initApp = async () => {
      // 1. Environment Detection
      const fullLocation = window.location.href;
      const cleanBase = fullLocation.split('#')[0].split('?')[0];

      setDetectedUrl(cleanBase);
      setIsBlob(fullLocation.startsWith('blob:'));

      // 2. Load Settings & Data
      const loadedSettings = getSettings();
      setSettings(loadedSettings);
      
      // Initialize Analytics if ID exists
      if (loadedSettings.googleAnalyticsId) {
        initGA(loadedSettings.googleAnalyticsId);
      }
      
      // Load Data (Merge LocalStorage + db.json)
      let mergedLinks = getLinks(); // LocalStorage
      
      try {
        const response = await fetch('./db.json');
        if (response.ok) {
          const staticLinks: ShortLink[] = await response.json();
          // Merge logic: Map by ID. Local storage (User edits) wins over static file.
          const linkMap = new Map<string, ShortLink>();
          staticLinks.forEach(l => linkMap.set(l.id, l));
          mergedLinks.forEach(l => linkMap.set(l.id, l)); 
          mergedLinks = Array.from(linkMap.values());
        }
      } catch (e) {
        // Ignore missing db.json in local dev
      }

      // Sort by newest first
      mergedLinks.sort((a, b) => b.createdAt - a.createdAt);
      setLinks(mergedLinks);

      // 3. Routing Logic
      const rawHash = window.location.hash.substring(1);
      
      if (rawHash) {
        // --- REDIRECT FLOW ---
        const hash = decodeURIComponent(rawHash);
        const match = mergedLinks.find(l => l.slug === hash);
        
        if (match) {
          setRedirectData({ target: match.originalUrl, slug: match.slug });
          setMode(AppMode.REDIRECT_PROCESS);
          
          // Execute Redirect Actions
          incrementClicks(match.id); // Update LocalStorage count (only visible to visitor)
          
          if (loadedSettings.googleAnalyticsId) {
             trackRedirect(loadedSettings.googleAnalyticsId, match.slug, match.originalUrl);
          }

          // Small delay to ensure Analytics beacon is sent before unload
          setTimeout(() => {
             window.location.replace(match.originalUrl);
          }, 150); 
          return;
        } else {
          // Link found in hash but not in DB
          setMode(AppMode.NOT_FOUND);
          return;
        }
      }

      // --- NO HASH FLOW (DASHBOARD) ---
      // We always show the dashboard if there is no hash. 
      // User is responsible for not sharing the root URL if they want privacy.
      setMode(AppMode.DASHBOARD);
    };

    initApp();

    // Listen for hash changes
    const handleRuntimeHashChange = () => {
       if(window.location.hash.substring(1)) window.location.reload(); 
    };
    window.addEventListener('hashchange', handleRuntimeHashChange);
    return () => window.removeEventListener('hashchange', handleRuntimeHashChange);
  }, []);


  // --- ACTIONS ---

  const refreshLinks = () => {
    const local = getLinks();
    setLinks(prev => {
        const linkMap = new Map<string, ShortLink>();
        prev.forEach(l => linkMap.set(l.id, l));
        local.forEach(l => linkMap.set(l.id, l));
        return Array.from(linkMap.values()).sort((a, b) => b.createdAt - a.createdAt);
    });
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
    if (newSettings.googleAnalyticsId) {
        initGA(newSettings.googleAnalyticsId);
    }
  };

  const handleCreate = (newLink: ShortLink) => {
    saveLink(newLink);
    refreshLinks();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this link?')) {
      deleteLink(id);
      refreshLinks();
    }
  };

  const filteredLinks = useMemo(() => {
    if (!searchQuery) return links;
    const lower = searchQuery.toLowerCase();
    return links.filter(l => 
      l.slug.toLowerCase().includes(lower) || 
      l.description?.toLowerCase().includes(lower) ||
      l.tags?.some(t => t.toLowerCase().includes(lower))
    );
  }, [links, searchQuery]);

  const baseUrl = settings.customBaseUrl || detectedUrl;


  // --- RENDER: BOOTSTRAP ---
  if (mode === AppMode.BOOTSTRAP) {
      return (
          <div className="h-screen w-screen bg-white" /> // Totally blank to avoid flash
      );
  }

  // --- RENDER: REDIRECT (INVISIBLE) ---
  if (mode === AppMode.REDIRECT_PROCESS && redirectData) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
         {/* Totally clean interface. No 'App' UI. */}
         <title>Redirecting...</title>
      </div>
    );
  }

  // --- RENDER: NOT FOUND ---
  if (mode === AppMode.NOT_FOUND) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-center p-4">
        <ExclamationTriangleIcon className="w-16 h-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Link Not Found</h1>
        <p className="text-slate-500 mt-2">The shortcut you used is invalid or has been removed.</p>
        <a href="/" className="mt-8 text-indigo-600 hover:text-indigo-800 text-sm font-medium">Go Home</a>
      </div>
    );
  }

  // --- RENDER: DASHBOARD (Admin Only) ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
              M
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">MacShorty</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Settings & Deploy"
            >
              <Cog6ToothIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-slate-900/20 active:scale-95"
            >
              <PlusIcon className="w-4 h-4" />
              New Link
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {isBlob && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Preview Mode Detected</h3>
              <p className="text-sm text-amber-700 mt-1">
                You are running in a temporary environment. Download the code to run locally.
              </p>
            </div>
          </div>
        )}

        {/* Search & Stats */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md group">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search links..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm transition-all"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
            {links.length} {links.length === 1 ? 'Link' : 'Links'} Stored
          </div>
        </div>

        {/* Link Grid */}
        {filteredLinks.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredLinks.map(link => (
              <LinkCard 
                key={link.id} 
                link={link} 
                onDelete={handleDelete} 
                baseUrl={baseUrl}
                gaConfigured={!!settings.googleAnalyticsId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 animate-slide-up">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <RocketLaunchIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-bold text-lg">No links found</h3>
            <p className="text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
              Create your first local shortcut to get started.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Create one now &rarr;
            </button>
          </div>
        )}
        
        {/* Floating Action Button (Mobile) */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl flex items-center justify-center z-20 hover:bg-slate-800 transition-transform active:scale-90"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </main>

      <CreateLinkModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreate}
        baseUrl={baseUrl}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        detectedUrl={detectedUrl}
      />
    </div>
  );
};

export default App;