export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  glow: string;
  bgGradient: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
}

export const PRESET_COLORS: ColorOption[] = [
  {
    id: 'blue',
    name: 'Electric Blue',
    hex: '#38bdf8', // Sky 400
    glow: 'rgba(56, 189, 248, 0.65)',
    bgGradient: 'from-sky-400 to-blue-600',
    ring: 'ring-sky-400',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-300',
  },
  {
    id: 'red',
    name: 'Crimson Flame',
    hex: '#f43f5e', // Rose 500
    glow: 'rgba(244, 63, 94, 0.65)',
    bgGradient: 'from-rose-400 to-red-600',
    ring: 'ring-rose-500',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
  },
  {
    id: 'green',
    name: 'Emerald Green',
    hex: '#10b981', // Emerald 500
    glow: 'rgba(16, 185, 129, 0.65)',
    bgGradient: 'from-emerald-400 to-teal-600',
    ring: 'ring-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
  },
  {
    id: 'purple',
    name: 'Neon Violet',
    hex: '#a855f7', // Purple 500
    glow: 'rgba(168, 85, 247, 0.65)',
    bgGradient: 'from-purple-400 to-violet-600',
    ring: 'ring-purple-400',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
  },
  {
    id: 'orange',
    name: 'Solar Orange',
    hex: '#f97316', // Orange 500
    glow: 'rgba(249, 115, 22, 0.65)',
    bgGradient: 'from-amber-400 to-orange-600',
    ring: 'ring-orange-400',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-300',
  },
  {
    id: 'pink',
    name: 'Magenta Pulse',
    hex: '#ec4899', // Pink 500
    glow: 'rgba(236, 72, 153, 0.65)',
    bgGradient: 'from-pink-400 to-rose-600',
    ring: 'ring-pink-400',
    badgeBg: 'bg-pink-500/20',
    badgeText: 'text-pink-300',
  },
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    hex: '#06b6d4', // Cyan 500
    glow: 'rgba(6, 182, 212, 0.65)',
    bgGradient: 'from-cyan-400 to-teal-600',
    ring: 'ring-cyan-400',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
  },
  {
    id: 'yellow',
    name: 'Golden Spark',
    hex: '#eab308', // Yellow 500
    glow: 'rgba(234, 179, 8, 0.65)',
    bgGradient: 'from-yellow-300 to-amber-500',
    ring: 'ring-yellow-400',
    badgeBg: 'bg-yellow-500/20',
    badgeText: 'text-yellow-300',
  },
];

export function getColorById(id: string): ColorOption {
  return PRESET_COLORS.find(c => c.id === id) || PRESET_COLORS[0];
}
