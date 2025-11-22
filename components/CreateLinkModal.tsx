import React, { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, CheckCircleIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { generateLinkMetadata } from '../services/gemini';
import { ShortLink } from '../types';
import { checkSlugExists } from '../services/storage';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (link: ShortLink) => void;
  baseUrl: string;
}

export const CreateLinkModal: React.FC<CreateLinkModalProps> = ({ isOpen, onClose, onSave, baseUrl }) => {
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [createdLink, setCreatedLink] = useState<ShortLink | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Generate a random 7-char alphanumeric slug
  const generateHashSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setSlug('');
      setDescription('');
      setError('');
      setIsGenerating(false);
      setCreatedLink(null);
      setHasCopied(false);
    } else {
      // Pre-fill slug on open if empty
      if (!slug) setSlug(generateHashSlug());
    }
  }, [isOpen]);

  const handleUrlBlur = () => {
    if (url && !slug) {
      setSlug(generateHashSlug());
    }
  };

  const regenerateSlug = () => {
    setSlug(generateHashSlug());
  };

  const handleAIAutoFill = async () => {
    if (!url) {
      setError("Please enter a URL first.");
      return;
    }
    
    try {
      setError('');
      setIsGenerating(true);
      const suggestion = await generateLinkMetadata(url);
      
      // We only use description and tags from AI now
      setDescription(suggestion.description);
      // If slug is somehow empty (user cleared it), fill it
      if (!slug) setSlug(generateHashSlug());
      
    } catch (e) {
      setError("Failed to generate suggestions. Try manual entry.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url || !slug) {
      setError("URL and Slug are required.");
      return;
    }

    if (checkSlugExists(slug)) {
      setError("This short code is already taken. Try regenerating.");
      return;
    }

    const newLink: ShortLink = {
      id: crypto.randomUUID(),
      originalUrl: url.startsWith('http') ? url : `https://${url}`,
      slug,
      description: description || 'No Description', // Provide fallback
      clicks: 0,
      createdAt: Date.now(),
      tags: [] 
    };

    onSave(newLink);
    setCreatedLink(newLink);
  };

  const handleCopy = () => {
    if (!createdLink) return;
    const fullShortUrl = `${baseUrl}#${createdLink.slug}`;
    navigator.clipboard.writeText(fullShortUrl);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  if (!isOpen) return null;

  const isBlob = baseUrl.startsWith('blob:');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
        
        {createdLink ? (
          // Success View
          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6 animate-fade-in">
              <CheckCircleIcon className="h-10 w-10 text-green-600" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Short Link Ready!</h3>
            <p className="text-slate-500 mb-8">
              Your compact shortcut has been created.
            </p>

            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 mb-8 group hover:border-indigo-300 transition-colors">
              <div className="flex-1 px-3 py-2 text-left overflow-hidden">
                <div className="text-xs text-slate-400 font-medium mb-0.5">Short URL</div>
                <div className="text-indigo-600 font-mono text-lg truncate font-bold tracking-tight">
                    {/* Visual check for cleaner display */}
                    {isBlob ? (
                        <span><span className="text-slate-400 text-sm font-normal">preview / </span>#{createdLink.slug}</span>
                    ) : (
                        <span>{baseUrl}#{createdLink.slug}</span>
                    )}
                </div>
              </div>
              <button 
                onClick={handleCopy}
                className="p-3 bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 shadow-sm transition-all active:scale-95"
                title="Copy to clipboard"
              >
                {hasCopied ? (
                  <ClipboardDocumentCheckIcon className="w-5 h-5 text-green-600" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5" />
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all active:scale-95"
            >
              Done
            </button>
          </div>
        ) : (
          // Creation Form
          <>
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">New Short Link</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destination URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="https://example.com/very/long/url..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAIAutoFill}
                    disabled={isGenerating || !url}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <SparklesIcon className="w-5 h-5" />
                    )}
                    <span className="hidden sm:inline">Auto-Fill</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Short Code (Hash)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400 select-none">#</span>
                    <input
                      type="text"
                      required
                      maxLength={7}
                      placeholder="x7y9z2a"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 7))}
                      className="w-full pl-7 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm tracking-wide"
                    />
                     <button
                        type="button"
                        onClick={regenerateSlug}
                        className="absolute right-2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Regenerate Hash"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">7-char alphanumeric code</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Work Docs..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 font-medium transition-all active:scale-95"
                >
                  Create Link
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};