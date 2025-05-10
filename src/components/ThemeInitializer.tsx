
import { useEffect } from 'react';

export const ThemeInitializer = () => {
  useEffect(() => {
    // Get saved theme from localStorage or default to "theme-blue"
    const savedTheme = localStorage.getItem('guild-theme') || 'theme-blue';
    
    // Remove all theme classes first to prevent conflicts
    document.documentElement.classList.remove(
      'theme-blue', 
      'theme-purple',
      'theme-green',
      'theme-red',
      'theme-orange',
      'theme-pink'
    );
    
    // Apply the theme
    document.documentElement.classList.add(savedTheme);
    
    // Update CSS variable for guild-primary in HTML root element
    const themeColor = {
      'theme-blue': '#1EAEDB',
      'theme-purple': '#9b87f5',
      'theme-green': '#10B981',
      'theme-red': '#ef4444',
      'theme-orange': '#F97316',
      'theme-pink': '#EC4899'
    }[savedTheme] || '#1EAEDB';
    
    // Update the guild.primary color in the CSS
    document.documentElement.style.setProperty('--guild-primary-color', themeColor);
  }, []);
  
  return null; // This component doesn't render anything
};
