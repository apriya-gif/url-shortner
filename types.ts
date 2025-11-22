export interface ShortLink {
  id: string;
  slug: string;
  originalUrl: string;
  description?: string;
  createdAt: number;
  clicks: number;
  tags?: string[];
}

export type LinkSortOption = 'date' | 'clicks' | 'alpha';

export interface GeminiSuggestion {
  description: string;
  tags: string[];
}