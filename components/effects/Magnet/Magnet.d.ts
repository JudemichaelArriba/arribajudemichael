import type { ComponentType, ReactNode, HTMLAttributes } from 'react';

export interface MagnetProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
    padding?: number;
    disabled?: boolean;
    magnetStrength?: number;
    activeTransition?: string;
    inactiveTransition?: string;
    wrapperClassName?: string;
    innerClassName?: string;
}

declare const Magnet: ComponentType<MagnetProps>;
export default Magnet;