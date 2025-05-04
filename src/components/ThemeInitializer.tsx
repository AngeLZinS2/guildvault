
import { useEffect } from 'react';

export const ThemeInitializer = () => {
  useEffect(() => {
    // Get saved theme from localStorage or default to "theme-blue"
    const savedTheme = localStorage.getItem('guild-theme') || 'theme-blue';
    
    // Apply the theme
    document.documentElement.classList.add(savedTheme);
  }, []);
  
  return null; // This component doesn't render anything
};
