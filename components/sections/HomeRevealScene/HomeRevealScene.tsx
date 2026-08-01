'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Home from '@/components/sections/home/Home';
import styles from './HomeRevealScene.module.css';

gsap.registerPlugin(ScrollTrigger);

interface HomeRevealSceneProps {
    children: React.ReactNode;
}

export default function HomeRevealScene({ children }: HomeRevealSceneProps) {
    const sceneRef = useRef<HTMLDivElement>(null);
    const continuationRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const scene = sceneRef.current;
            const continuation = continuationRef.current;
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!scene || !continuation || prefersReducedMotion) return;

            const tween = gsap.fromTo(
                continuation,
                { y: '100svh' },
                {
                    y: '0svh',
                    ease: 'none',
                    scrollTrigger: {
                        trigger: scene,
                        start: 'top top',
                        end: '+=150%',
                        scrub: 0.5,
                        invalidateOnRefresh: true,
                    },
                }
            );

            return () => {
                tween.scrollTrigger?.kill();
                tween.kill();
            };
        },
        { scope: sceneRef }
    );

    return (
        <div ref={sceneRef} className={styles.scene} data-testid="home-reveal-scene">
            <div className={styles.homeLayer}>
                <Home />
            </div>
            <div ref={continuationRef} className={styles.continuationLayer} data-testid="home-reveal-continuation">
                {children}
            </div>
        </div>
    );
}

