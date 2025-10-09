import React from 'react';
import type { FC } from 'react';

interface LogoProps {
    className?: string;
}

export const Logo: FC<LogoProps> = ({ className }) => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className || "w-10 h-10 md:w-12 md:h-12"}>
        <defs>
            <linearGradient id="logo-gradient" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
             <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        <path d="M24 6L10 42H16L19 32H29L32 42H38L24 6ZM21.5 26L24 18L26.5 26H21.5Z" fill="url(#logo-gradient)" filter="url(#glow)" />
    </svg>
);