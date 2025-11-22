import React, { useState } from 'react';
import { ShortLink } from '../types';
import { ArrowTopRightOnSquareIcon, ClipboardDocumentIcon, TrashIcon, ChartBarIcon, CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface LinkCardProps {
  link: ShortLink;
  onDelete: (id: string) => void;
  baseUrl: string;
  gaConfigured: boolean;
}

export const LinkCard: React.FC<LinkCardProps> = ({ link, onDelete, baseUrl, gaConfigured }) => {
  const [copied, setCopied] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  
  // The functional URL that works when clicked or copied
  const fullShortUrl = `${baseUrl}#${link.slug}`;
  
  // Clean up display URL logic
  let displayDomain = baseUrl;
  try {
    const urlObj = new URL(baseUrl);
    displayDomain = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
  } catch (e) {
    displayDomain = baseUrl.replace(/^https?:\/\//, '');
  }

  const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  const isBlob = baseUrl.startsWith('blob:');

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShortUrl);
    setCopied(true);
    
    // Warn user if they are copying a localhost link
    if (isLocalhost) {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
    }

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 animate-slide-up group">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        
        {/* Main Content Info */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-slate-800 truncate" title={link.description}>
              {link.description || 'Untitled Link'}
            </h3>
            {link.tags?.map(tag => (
               <span key={tag} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
               {tag}
             </span>
            ))}
          </div>

          <div className="space-y-3">
            {/* Short URL Row */}
            <div className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${showWarning ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100 group-hover:border-indigo-100'}`}>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${showWarning ? 'text-amber-700 bg-amber-100' : 'text-indigo-600 bg-indigo-50'}`}>
                {showWarning ? 'Local Only' : 'Short'}
              </span>
              <span className="font-mono text-slate-700 text-sm font-semibold truncate flex-1" title={fullShortUrl}>
                {isBlob ? (
                    <span className="text-slate-400">preview</span>
                ) : (
                    <span className="text-slate-400">{displayDomain}/</span>
                )}
                <span className="text-indigo-600">#{link.slug}</span>
              </span>
            </div>

            {/* Warning Message */}
            {showWarning && (
                <div className="flex items-start gap-2 text-xs text-amber-700 px-1 animate-fade-in">
                    <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                        <strong>Careful!</strong> This link uses <code>localhost</code>. It will NOT work if you send it to others (LinkedIn, etc). Deploy to a public server first.
                    </span>
                </div>
            )}

            {/* Target URL Row */}
            <div className="flex items-center gap-3 px-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[3rem]">
                Target
              </span>
              <a 
                href={link.originalUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="font-mono text-slate-500 text-sm truncate hover:text-indigo-600 transition-colors flex-1"
              >
                {link.originalUrl}
              </a>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
          <button 
            onClick={handleCopy}
            className={`flex items-center gap-2 sm:gap-0 px-3 py-2 sm:p-2 rounded-lg transition-all relative font-medium text-sm w-full sm:w-auto justify-center ${
              copied 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300'
            }`}
            title="Copy Short Link"
          >
            {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardDocumentIcon className="w-5 h-5" />}
            <span className="sm:hidden ml-1">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          
          <a 
            href={fullShortUrl}
            className="flex items-center gap-2 sm:gap-0 px-3 py-2 sm:p-2 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 rounded-lg transition-all w-full sm:w-auto justify-center"
            title="Test Redirect (Click to launch)"
          >
            <ArrowTopRightOnSquareIcon className="w-5 h-5" />
            <span className="sm:hidden ml-1">Test</span>
          </a>

          <button 
            onClick={() => onDelete(link.id)}
            className="flex items-center gap-2 sm:gap-0 px-3 py-2 sm:p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 rounded-lg transition-all w-full sm:w-auto justify-center"
            title="Delete"
          >
            <TrashIcon className="w-5 h-5" />
            <span className="sm:hidden ml-1">Delete</span>
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs">
          {gaConfigured ? (
             <a 
              href="https://analytics.google.com/" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-2 py-1 rounded-md transition-colors"
             >
                <ChartBarIcon className="w-4 h-4" />
                View Public Stats
             </a>
          ) : (
            <div className="flex items-center gap-1 text-slate-400" title="Add Analytics ID in Settings to track visitors">
                <ChartBarIcon className="w-4 h-4" />
                <span className="font-semibold">{link.clicks}</span> local clicks
            </div>
          )}
        </div>
        <div className="text-xs text-slate-400">
          Created {new Date(link.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};