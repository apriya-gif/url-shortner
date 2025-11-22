import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon, MagnifyingGlassIcon, RocketLaunchIcon, ExclamationTriangleIcon, Cog6ToothIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ShortLink, AppSettings } from './types';
import { getLinks, saveLink, deleteLink, incrementClicks, getSettings, saveSettings } from './services/storage';
import { LinkCard } from './components/LinkCard';
import { CreateLinkModal } from './components/CreateLinkModal';
import { SettingsModal } from './components/SettingsModal';

enum AppMode {
  LOADING,
  DASHBOARD,
  REDIRECTING
}

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LOADING);
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
      // 1. Load Settings
      const loadedSettings = getSettings();
      setSettings(loadedSettings);

      // 2. Detect URL Environment
      const fullLocation = window.location.href;
      const cleanBase = fullLocation.split('#')[0].split('?')[0];
      setDetectedUrl(cleanBase);
      setIsBlob(fullLocation.startsWith('blob:'));

      // 3. Load Data (Merge LocalStorage + db.json)
      // This allows the app to work on a static host (GitHub Pages) for recruiters
      let mergedLinks = getLinks(); // Start with LocalStorage
      
      try {
        const response = await fetch('./db.json');
        if (response.ok) {
          const staticLinks: ShortLink[] = await response.json();
          // Merge logic: Create a map by ID. 
          // If we have local data (User), it overrides static.
          // If we are a Recruiter (no local data), we get static.
          const linkMap = new Map<string, ShortLink>();
          
          staticLinks.forEach(l => linkMap.set(l.id, l));
          mergedLinks.forEach(l => linkMap.set(l.id, l)); // Local wins conflicts
          
          mergedLinks = Array.from(linkMap.values());
        }
      } catch (e) {
        // If db.json is missing (local dev), just ignore
      }

      // Sort by newest first
      mergedLinks.sort((a, b) => b.createdAt - a.createdAt);
      setLinks(mergedLinks);

      // 4. Check for Redirect Hash
      // We do this AFTER loading data so we can find links from db.json
      const rawHash = window.location.hash.substring(1);
      if (rawHash) {
        const hash = decodeURIComponent(rawHash);
        const match = mergedLinks.find(l => l.slug === hash);
        
        if (match) {
          setRedirectData({ target: match.originalUrl, slug: match.slug });
          setMode(AppMode.REDIRECTING);
          
          // Execute Redirect
          incrementClicks(match.id);
          setTimeout(() => {
             window.location.replace(match.originalUrl);
          }, 800);
          return; // Stop here, don't show dashboard
        }
      }

      // If no redirect, show dashboard
      setMode(AppMode.DASHBOARD);
    };

    initApp();

    // Listen for hash changes while the app is open
    const handleRuntimeHashChange = () => {
       const rawHash = window.location.hash.substring(1);
       if(!rawHash) return;
       // Reload page to trigger full init cycle is safest, or just check links state
       window.location.reload(); 
    };
    window.addEventListener('hashchange', handleRuntimeHashChange);
    return () => window.removeEventListener('hashchange', handleRuntimeHashChange);
  }, []);


  // --- ACTIONS ---

  const refreshLinks = () => {
    // We only refresh from LocalStorage here because db.json is static
    // Ideally we would re-merge, but for local editing, local storage is enough.
    const local = getLinks();
    setLinks(prev => {
        // Keep static links that aren't in local, update local ones
        // This is a simplified merge for the UI update
        const linkMap = new Map<string, ShortLink>();
        prev.forEach(l => linkMap.set(l.id, l));
        local.forEach(l => linkMap.set(l.id, l));
        return Array.from(linkMap.values()).sort((a, b) => b.createdAt - a.createdAt);
    });
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
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

  // Use Custom URL if set, otherwise detected URL
  const baseUrl = settings.customBaseUrl || detectedUrl;


  // --- RENDER: LOADING ---
  if (mode === AppMode.LOADING) {
      return (
          <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
              <ArrowPathIcon className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
      );
  }

  // --- RENDER: REDIRECT MODE ---
  if (mode === AppMode.REDIRECTING && redirectData) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="text-center space-y-6 animate-fade-in px-4">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-xl shadow-indigo-200">
            <RocketLaunchIcon className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-800">Launching...</h1>
            <p className="text-slate-500 text-lg max-w-md mx-auto break-all">
              Redirecting to <span className="font-mono text-indigo-600 font-medium">{redirectData.target}</span>
            </p>
          </div>
          <div className="pt-4">
             <a href={redirectData.target} className="text-sm text-slate-400 underline hover:text-slate-600">
               Click here if you aren't redirected automatically
             </a>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: DASHBOARD MODE ---
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
                You are running in a temporary "blob" environment. Links created here will not persist if you close this tab. 
                For the best local experience, download `index.html` and run it locally on your machine.
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
              placeholder="Search links, slugs, or tags..."
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
              {searchQuery ? "Try adjusting your search query." : "Create your first local shortcut to get started."}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Create one now &rarr;
              </button>
            )}
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