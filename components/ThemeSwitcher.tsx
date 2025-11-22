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

const ThemeSwitcher: React.FC<{ className?: string }> = ({ className }) => {
    // Initialize state from the class on the <html> element, which is set by the inline script.
    // This ensures consistency and avoids a flash of incorrect theme.
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false; // Default for SSR or other environments
    });

    // Effect to apply changes to the DOM and localStorage when the state changes.
    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        // The 'system' value is no longer stored, simplifying logic.
    }, [isDarkMode]);
    
    // Toggle the theme state on button click.
    const handleThemeChange = () => {
        setIsDarkMode(prevMode => !prevMode);
    };

    // Determine the current icon and label to display.
    const Icon = isDarkMode ? MoonIcon : SunIcon;
    const label = isDarkMode ? 'Koyu Mod' : 'Açık Mod';

    const baseClasses = "inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none transition-colors duration-200 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-600";

    return (
        <button
            onClick={handleThemeChange}
            className={`${baseClasses} ${className || ''}`}
            aria-label={`Geçerli tema: ${label}. Diğer moda geçmek için tıklayın.`}
        >
            <Icon className="w-5 h-5 mr-2" />
            <span>{label}</span>
        </button>
    );
};

export default ThemeSwitcher;
