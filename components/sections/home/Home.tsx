'use client';

import dynamic from 'next/dynamic';
import styles from './Home.module.css';
import Button from '@/components/ui/Button';

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
                    intensity={0.6}
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

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button
                    href="/cv.pdf"
                    variant="specular"
                    size="lg"
                    radius={999}
                    magnetic
                    magnetPadding={15}
                    glowProximity={60}
                >
                    Download CV
                </Button>
            </div>
        </section>
    );
}