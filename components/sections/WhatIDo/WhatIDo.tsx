'use client';

import ScrollFloat from '@/components/ui/ScrollFloat/ScrollFloat';
import styles from './WhatIDo.module.css';

interface WhatIDoProps {
    sentence?: string;
}

const DEFAULT_SENTENCE = 'I build scalable APIs, resilient systems, and fluid digital experiences.';

export default function WhatIDo({ sentence = DEFAULT_SENTENCE }: WhatIDoProps) {
    return (
        <section className={`${styles.section} isolate flex items-center justify-center px-5 py-28 text-center md:px-10`}>
            <div className={styles.inner}>
                <p className={`${styles.eyebrow} font-mono`}>What I do</p>
                <ScrollFloat
                    containerClassName={`${styles.statement} font-display`}
                    textClassName={styles.statementText}
                    animationDuration={0.82}
                    ease="power3.out"
                    scrollStart="top bottom-=18%"
                    scrollEnd="bottom top"
                    stagger={0.012}
                    playOnce
                >
                    {sentence}
                </ScrollFloat>
            </div>
        </section>
    );
}
