import styles from './HomeContinuation.module.css';

interface HomeContinuationProps {
    children: React.ReactNode;
}

export default function HomeContinuation({ children }: HomeContinuationProps) {
    return (
        <div
            className={`${styles.panelSkin} relative isolate min-h-[100svh] overflow-hidden text-[var(--text)]`}
            data-testid="home-continuation"
        >
            <div className={`${styles.bridgeSkin} pointer-events-none absolute inset-x-0 top-0 z-[1] h-[clamp(4rem,12vh,8rem)]`} aria-hidden="true" />
            <div className="relative z-[2]">{children}</div>
        </div>
    );
}