'use client';

import ScrollFloat from '@/components/ui/ScrollFloat/ScrollFloat';
import styles from './WhatIDo.module.css';

interface WhatIDoProps {
    sentence?: string;
}

const DEFAULT_SENTENCE = 'I build scalable APIs, resilient backend infrastructure, and fluid digital experiences that bridge technical excellence with intuitive design.';

export default function WhatIDo({ sentence = DEFAULT_SENTENCE }: WhatIDoProps) {
    return (
        <section id="what-i-do" className={`${styles.section} isolate flex items-center justify-center px-5 py-24 text-center md:px-8 lg:py-28`}>
            <div className={styles.inner}>
                <p className={`${styles.eyebrow} font-mono`}>{'// what i do'}</p>
                <ScrollFloat
                    containerClassName={`${styles.statement} font-display`}
                    textClassName={styles.statementText}
                    animationDuration={0.56}
                    ease="power3.out"
                    settleEase="power2.out"
                    scrollStart="top 90%"
                    scrollEnd="bottom top"
                    charStagger={0.018}
                    wordStagger={0.045}
                    playOnce
                >
                    {sentence}
                </ScrollFloat>
            </div>
        </section>
    );
}

