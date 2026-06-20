import React from 'react';

export default function BrandLogo({ size = 28, className = '', style = {} }) {
  return (
    <div 
      className={`brand-mark-svg ${className}`} 
      style={{ 
        width: size, 
        height: size, 
        background: 'var(--text)', 
        color: 'var(--bg)', 
        borderRadius: `${Math.round(size * 0.25)}px`,
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexShrink: 0,
        ...style 
      }}
    >
      <svg 
        width={Math.round(size * 0.57)} 
        height={Math.round(size * 0.57)} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.75"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <rect x="4" y="13" width="4" height="8" rx="1" fill="currentColor" stroke="none"/>
        <rect x="10" y="9" width="4" height="12" rx="1" fill="currentColor" stroke="none"/>
        <rect x="16" y="5" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>
        <path d="M3 21h18" />
      </svg>
    </div>
  );
}
