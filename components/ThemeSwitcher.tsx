import React, { useState, useEffect } from 'react';
import Button from './Button';

const ThemeSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  // State is initialized once from the DOM, which is set correctly by index.html
  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  );

  // This effect keeps the DOM and localStorage in sync with the state
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Simple toggle function for the state
  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  return (
    // Using the consistent Button component for styling and behavior,
    // but without any icons as requested.
    <Button
      onClick={toggleTheme}
      variant="secondary"
      className={className}
      aria-label={isDarkMode ? 'Açık moda geç' : 'Koyu moda geç'}
    >
      {isDarkMode ? 'Açık Mod' : 'Koyu Mod'}
    </Button>
  );
};

export default ThemeSwitcher;
