
import React, { useEffect } from 'react';

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
    const themeColors = {
      'theme-blue': { hex: '#ff9970', rgb: '255 153 112' },
      'theme-purple': { hex: '#ff9970', rgb: '255 153 112' },
      'theme-green': { hex: '#10B981', rgb: '16 185 129' },
      'theme-red': { hex: '#ef4444', rgb: '239 68 68' },
      'theme-orange': { hex: '#F97316', rgb: '249 115 22' },
      'theme-pink': { hex: '#EC4899', rgb: '236 72 153' }
    };
    
    const themeColor = themeColors[savedTheme] || themeColors['theme-blue'];
    
    // Update the guild primary color in the CSS
    document.documentElement.style.setProperty('--guild-primary-color', themeColor.hex);
    // Update the RGB values for use with opacity modifiers
    document.documentElement.style.setProperty('--guild-primary-rgb', themeColor.rgb);
  }, []);
  
  return null; // This component doesn't render anything
};
