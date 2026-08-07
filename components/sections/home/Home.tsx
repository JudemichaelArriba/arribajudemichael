'use client';

import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import { Download, GitFork } from 'lucide-react';

const FloatingLines = dynamic(() => import('@/components/effects/FloatingLines/FloatingLines'), {
    ssr: false,
});

const ROLE_LINE = 'Full-Stack Software Engineer Robust Backend APIs & Fluid Mobile/Web Clients';
const GITHUB_REPO_URL = 'https://github.com/JudemichaelArriba';
const FLOATING_LINES_GRADIENT = ['#e945f5', '#7C3AED', '#760068'] as const;

export default function Home() {
    return (
        <section
            id="home"
            className="isolate relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-8 pb-12 pt-[calc(var(--nav-height,80px)+env(safe-area-inset-top)+clamp(1.5rem,4vh,3rem))] text-center md:px-16 md:pb-24"
        >
            <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
                <FloatingLines
                    linesGradient={FLOATING_LINES_GRADIENT}
                    lineCount={4}
                    bendRadius={8}
                    animationSpeed={1}
                    bendStrength={-2}
                    lineDistance={8}
                    interactive={false}
                    parallax={false}
                />
            </div>

            <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-56 bg-gradient-to-b from-transparent via-[var(--site-bg)]/64 to-[var(--site-bg)] md:h-72"
                aria-hidden="true"
            />

            <h1 className="font-name relative z-10 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
                Jude Michael Arriba
            </h1>

            <p className="font-display relative z-10 mt-5 max-w-2xl text-sm font-bold uppercase tracking-[0.15em] text-[var(--signal)] md:text-base">
                {ROLE_LINE}
            </p>

            <p className="relative z-10 mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] md:text-lg">
                I architect and deploy scalable backend APIs, high-availability data layers, and polished mobile experiences driven by an unyielding commitment to performance optimization, long-term maintainability, and clean architecture.
            </p>

            <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-4">


                <Button
                    href={GITHUB_REPO_URL}
                    variant="specular"
                    size="lg"
                    radius={999}
                    magnetic
                    magnetPadding={15}
                    glowProximity={60}

                    baseColor="#37035a"
                    lineColor="#c300ff"
                >
                    <span className="inline-flex items-center gap-2">
                        GitHub Repo
                        <GitFork size={18} strokeWidth={2.5} />
                    </span>
                </Button>


                <Button
                    href="/cv.pdf"
                    variant="specular"
                    size="lg"
                    radius={999}
                    magnetic
                    tint="#6D28D9"
                    baseColor="#7C3AED"
                    lineColor="#E945F5"
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
