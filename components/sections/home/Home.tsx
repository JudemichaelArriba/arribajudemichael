'use client';

import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import { Download } from 'lucide-react';

const LightPillar = dynamic(() => import('@/components/effects/LightPillar/LightPillar'), {
    ssr: false,
});

const ROLE_LINE = 'Full-Stack Software Engineer Robust Backend APIs & Fluid Mobile/Web Clients';

export default function Home() {
    return (
        <section
            id="home"
            className="isolate relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-8 pb-12 pt-[calc(var(--nav-height,80px)+env(safe-area-inset-top)+clamp(1.5rem,4vh,3rem))] text-center md:px-16 md:pb-24"
        >
            <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
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
                    quality="medium"
                />
            </div>

            <h1 className="font-name text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
                Jude Michael Arriba
            </h1>

            <p className="font-display mt-5 max-w-2xl text-sm font-bold uppercase tracking-[0.15em] text-[var(--signal)] md:text-base">
                {ROLE_LINE}
            </p>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] md:text-lg">
                I architect and deploy scalable backend APIs, high-availability data layers, and polished mobile experiences driven by an unyielding commitment to performance optimization, long-term maintainability, and clean architecture.
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
                    <span className="inline-flex items-center gap-2">
                        Download CV
                        <Download size={18} strokeWidth={2.5} />
                    </span>
                </Button>
            </div>
        </section>
    );
}


