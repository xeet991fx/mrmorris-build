/**
 * Theme Color System
 * Google Forms-style theme colors for personalization
 */

export interface ThemeColor {
    id: string;
    name: string;
    primary: string;
    secondary: string;
    gradient: string;
    icon: string;
}

export const themeColors: ThemeColor[] = [
    {
        id: 'ocean-blue',
        name: 'Ocean Blue',
        primary: '#3b82f6',
        secondary: '#2563eb',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        icon: '🌊',
    },
    {
        id: 'purple-dream',
        name: 'Purple Dream',
        primary: '#8b5cf6',
        secondary: '#7c3aed',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        icon: '💜',
    },
    {
        id: 'fresh-green',
        name: 'Fresh Green',
        primary: '#10b981',
        secondary: '#059669',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        icon: '🍃',
    },
    {
        id: 'coral-red',
        name: 'Coral Red',
        primary: '#ef4444',
        secondary: '#dc2626',
        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        icon: '🔴',
    },
    {
        id: 'sunset-orange',
        name: 'Sunset Orange',
        primary: '#f59e0b',
        secondary: '#d97706',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        icon: '🌅',
    },
    {
        id: 'pink-bliss',
        name: 'Pink Bliss',
        primary: '#ec4899',
        secondary: '#db2777',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
        icon: '🩷',
    },
    {
        id: 'teal-wave',
        name: 'Teal Wave',
        primary: '#14b8a6',
        secondary: '#0d9488',
        gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        icon: '🌴',
    },
];

export const defaultTheme = themeColors[0]; // Ocean Blue

// Get theme from localStorage
export const getStoredTheme = (): ThemeColor => {
    if (typeof window === 'undefined') return defaultTheme;

    const stored = localStorage.getItem('app-theme');
    if (stored) {
        const theme = themeColors.find(t => t.id === stored);
        if (theme) return theme;
    }
    return defaultTheme;
};

// Save theme to localStorage
export const saveTheme = (themeId: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('app-theme', themeId);
    }
};

// Apply theme CSS variables
export const applyTheme = (theme: ThemeColor) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-gradient', theme.gradient);
};
