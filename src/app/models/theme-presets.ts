export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  accent: string;
  heroBg: string;
  surface: string;
  textOnHero: string;
}

export const THEME_PRESETS: ColorTheme[] = [
  { id: 'ocean-summit', name: 'Ocean Summit (Athletic)', primary: '#0ea5e9', accent: '#f59e0b', heroBg: '#0f172a', surface: '#ffffff', textOnHero: '#ffffff' },
  { id: 'midnight-emerald', name: 'Midnight Emerald (Growth)', primary: '#10b981', accent: '#34d399', heroBg: '#064e3b', surface: '#ffffff', textOnHero: '#ecfdf5' },
  { id: 'royal-purple', name: 'Royal Purple (Leadership)', primary: '#8b5cf6', accent: '#ec4899', heroBg: '#2e1065', surface: '#ffffff', textOnHero: '#faf5ff' },
  { id: 'sunset-amber', name: 'Sunset Amber (Community)', primary: '#f97316', accent: '#fbbf24', heroBg: '#7c2d12', surface: '#ffffff', textOnHero: '#fff7ed' },
  { id: 'crimson-grit', name: 'Crimson Grit (Resilience)', primary: '#e11d48', accent: '#fb7185', heroBg: '#1e293b', surface: '#ffffff', textOnHero: '#ffffff' },
  { id: 'pacific-cyan', name: 'Pacific Cyan (Modern Tech)', primary: '#06b6d4', accent: '#3b82f6', heroBg: '#164e63', surface: '#ffffff', textOnHero: '#ecfeff' },
  { id: 'slate-minimalist', name: 'Slate Minimal (Corporate)', primary: '#475569', accent: '#38bdf8', heroBg: '#0f172a', surface: '#f8fafc', textOnHero: '#ffffff' },
  { id: 'golden-horizon', name: 'Golden Horizon (Inspiration)', primary: '#d97706', accent: '#6366f1', heroBg: '#1c1917', surface: '#ffffff', textOnHero: '#fef3c7' },
];
