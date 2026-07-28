'use client';

import dynamic from 'next/dynamic';
import styles from './Home.module.css';

const LightPillar = dynamic(() => import('@/components/effects/LightPillar/LightPillar'), {
    ssr: false,
});

const ROLE_LINE = 'Full-Stack Developer - Mobile & Web';

export default function Home() {
    return (
        <section
            id="home"
            className={`${styles.hero} relative flex flex-col items-center justify-center overflow-hidden px-8 text-center md:px-16`}
        >
            <div className="absolute inset-0 -z-10">
                <LightPillar
                    topColor="#5227FF"
                    bottomColor="#FF9FFC"
                    intensity={1}
                    rotationSpeed={0.3}
                    glowAmount={0.002}
                    pillarWidth={3}
                    pillarHeight={0.4}
                    noiseIntensity={0.5}
                    pillarRotation={25}
                    interactive={false}
                    mixBlendMode="normal"
                />
            </div>

            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
                Jude Michael Arriba
            </h1>

            <p className={`${styles.roleLine} font-display mt-5 max-w-2xl text-sm font-bold uppercase tracking-[0.15em] md:text-base`}>
                {ROLE_LINE}
            </p>

            <p className={`${styles.description} mx-auto mt-6 max-w-xl text-base leading-relaxed md:text-lg`}>
                I design and build clean, scalable applications, from efficient backend APIs to refined mobile experiences, with a focus on performance, maintainability, and long-term reliability.
            </p>

            <a
                href="#projects"
                className={`${styles.cta} font-mono mt-10 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90`}
            >
                Projects
            </a>
        </section>
    );
}