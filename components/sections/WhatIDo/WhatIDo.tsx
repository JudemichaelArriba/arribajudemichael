'use client';

import ScrollFloat from '@/components/ui/ScrollFloat/ScrollFloat';
import styles from './WhatIDo.module.css';

interface WhatIDoProps {
    sentence?: string;
}

const DEFAULT_SENTENCE = 'I build scalable APIs, resilient systems, and fluid digital experiences.';

export default function WhatIDo({ sentence = DEFAULT_SENTENCE }: WhatIDoProps) {
    return (
        <section className={`${styles.section} isolate flex items-center justify-center px-6 py-24 text-center md:px-12`}>
            <div className={styles.inner}>
                <p className={`${styles.eyebrow} font-mono`}>What I do</p>
                <ScrollFloat
                    containerClassName={`${styles.statement} font-display`}
                    textClassName={styles.statementText}
                    animationDuration={0.72}
                    ease="back.out(1.35)"
                    scrollStart="top bottom-=15%"
                    scrollEnd="center center"
                    stagger={0.012}
                >
                    {sentence}
                </ScrollFloat>
            </div>
        </section>
    );
}
