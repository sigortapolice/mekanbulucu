import React, { useState, useEffect } from 'react';

const SunIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.95-4.243-1.59-1.59M3 12h2.25m.386-6.364 1.591 1.591M12 12a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
    </svg>
);

const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
);

const SystemIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
    </svg>
);

type Theme = 'light' | 'dark' | 'system';

const THEME_CONFIG: Record<Theme, { next: Theme; Icon: React.ElementType; label: string }> = {
    light: {
        next: 'dark',
        Icon: SunIcon,
        label: 'Açık Mod'
    },
    dark: {
        next: 'system',
        Icon: MoonIcon,
        label: 'Koyu Mod'
    },
    system: {
        next: 'light',
        Icon: SystemIcon,
        label: 'Sistem'
    }
};


const ThemeSwitcher: React.FC<{ className?: string }> = ({ className }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'light' || storedTheme === 'dark') {
            return storedTheme;
        }
        return 'system';
    });

    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = () => {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (theme === 'dark' || (theme === 'system' && systemPrefersDark)) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        applyTheme();

        if (theme === 'system') {
            localStorage.removeItem('theme');
        } else {
            localStorage.setItem('theme', theme);
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleSystemThemeChange = () => {
             // This handler is only active when theme is 'system', so we can just re-apply.
            applyTheme();
        };

        if (theme === 'system') {
            mediaQuery.addEventListener('change', handleSystemThemeChange);
        }

        return () => {
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }, [theme]);
    
    const handleThemeChange = () => {
        setTheme(currentTheme => THEME_CONFIG[currentTheme].next);
    };

    const { Icon, label } = THEME_CONFIG[theme];
    const baseClasses = "inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none transition-colors duration-200 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-600";

    return (
        <button
            onClick={handleThemeChange}
            className={`${baseClasses} ${className || ''}`}
            aria-label={`Geçerli tema: ${label}. Değiştirmek için tıklayın.`}
        >
            <Icon className="w-5 h-5 mr-2" />
            <span>{label}</span>
        </button>
    );
};

export default ThemeSwitcher;