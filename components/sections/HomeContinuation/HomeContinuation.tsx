import styles from './HomeContinuation.module.css';

interface HomeContinuationProps {
    children: React.ReactNode;
}

export default function HomeContinuation({ children }: HomeContinuationProps) {
    return (
        <div className={styles.panel} data-testid="home-continuation">
            <div className={styles.bridge} aria-hidden="true" />
            <div className={styles.content}>{children}</div>
        </div>
    );
}
