'use client';

import { useRouter } from 'next/navigation';
import type { MouseEventHandler, ReactNode } from 'react';
import SpecularButton from '@/components/effects/SpecularButton/SpecularButton';
import Magnet from '@/components/effects/Magnet/Magnet';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'primary' | 'outline' | 'specular';

interface ButtonProps {
    children: ReactNode;
    variant?: Variant;
    size?: Size;
    radius?: number;
    magnetic?: boolean;
    magnetStrength?: number;
    magnetPadding?: number;
    glowProximity?: number;
    href?: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit';
    className?: string;
}

const SOLID_STYLES: Record<'primary' | 'outline', string> = {
    primary: 'bg-white text-black hover:opacity-90',
    outline: 'border border-white/20 text-[var(--text)] hover:border-white/40',
};

const SIZE_STYLES: Record<Size, string> = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    radius = 12,
    magnetic = false,
    magnetStrength = 25,
    magnetPadding = 20,
    glowProximity = 80,
    href,
    onClick,
    type = 'button',
    className = '',
}: ButtonProps) {
    const router = useRouter();

    const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
        onClick?.(e);
        if (href) router.push(href);
    };

    const content =
        variant === 'specular' ? (
            <SpecularButton
                size={size}
                radius={radius}
                tint="#000000"
                tintOpacity={0.50}
                baseColor="#37035a"
                lineColor="#c300ff"
                textColor="#ffffff"
                intensity={3}
                shineSize={12}
                shineFade={45}
                thickness={1.2}
                speed={0.3}
                followMouse
                proximity={glowProximity}
                onClick={handleClick}
                type={type}
                className={className}
            >
                {children}
            </SpecularButton>
        ) : (
            <button
                type={type}
                onClick={handleClick}
                style={{ borderRadius: `${radius}px` }}
                className={`font-mono inline-flex items-center gap-2 font-semibold transition-opacity ${SOLID_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
            >
                {children}
            </button>
        );

    return magnetic ? (
        <Magnet padding={magnetPadding} magnetStrength={magnetStrength} wrapperClassName="inline-block">
            {content}
        </Magnet>
    ) : (
        content
    );
}