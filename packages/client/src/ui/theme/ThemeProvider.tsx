import React from 'react';
import './theme.css';

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="neon-theme">{children}</div>
);
