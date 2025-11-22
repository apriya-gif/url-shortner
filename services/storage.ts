import { ShortLink, AppSettings } from '../types';

const STORAGE_KEY = 'macshorty_links_v1';
const SETTINGS_KEY = 'macshorty_settings_v1';

export const getLinks = (): ShortLink[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load links", e);
    return [];
  }
};

export const saveLink = (link: ShortLink): void => {
  const links = getLinks();
  const existingIndex = links.findIndex(l => l.id === link.id);
  
  if (existingIndex >= 0) {
    links[existingIndex] = link;
  } else {
    links.unshift(link);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
};

export const deleteLink = (id: string): void => {
  const links = getLinks().filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
};

export const incrementClicks = (id: string): void => {
  const links = getLinks();
  const link = links.find(l => l.id === id);
  if (link) {
    link.clicks += 1;
    saveLink(link);
  }
};

export const checkSlugExists = (slug: string, excludeId?: string): boolean => {
  const links = getLinks();
  return links.some(l => l.slug === slug && l.id !== excludeId);
};

export const getSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};