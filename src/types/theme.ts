export type ThemeMode = 'emerald-sage' | 'titanium-frost' | 'cyber-violet' | 'amber-noir';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  tagline: string;
  previewBg: string;
  previewAccent: string;
  isLight?: boolean;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'emerald-sage',
    name: 'Bioluminescent Sage',
    tagline: 'Deep Botanical Velvet & Electric Mint',
    previewBg: '#06140e',
    previewAccent: '#34d399',
  },
  {
    id: 'titanium-frost',
    name: 'Titanium Frost (Light)',
    tagline: 'Architectural Alabaster & Klein Cobalt',
    previewBg: '#f1f5f9',
    previewAccent: '#2563eb',
    isLight: true,
  },
  {
    id: 'cyber-violet',
    name: 'Velvet Orchid',
    tagline: 'Deep Royal Amethyst & Neon Coral',
    previewBg: '#12091c',
    previewAccent: '#f43f5e',
  },
  {
    id: 'amber-noir',
    name: 'Solar Bronze',
    tagline: 'Smoked Obsidian & Radiant Amber',
    previewBg: '#140e08',
    previewAccent: '#f59e0b',
  },
];
