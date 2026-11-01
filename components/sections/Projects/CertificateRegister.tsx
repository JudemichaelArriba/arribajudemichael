'use client';

import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';

import CertificatePdfPreview from '@/components/ui/CertificatePdfPreview/CertificatePdfPreview';
import type { PublicCertificateDto } from '@/features/admin/certificates/types';
import { isPreloading } from '@/lib/animations/preloaderHold';
import { DESKTOP_QUERY, REDUCED_MOTION_QUERY } from '@/lib/breakpoints';

import ShowcaseState from './ShowcaseState';
import { FOCUS_RING, MONO_LABEL, certificateSummary } from './showcase';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const INTRO = 'Courses completed and recognitions received, each with its original PDF.';

/**
 * `any` always matches (matchMedia only runs its callback when at least one condition does). The
 * column breakpoints are listed so the motion is rebuilt whenever the number of columns changes.
 */
const MOTION_CONDITIONS = { any: 'all', reduce: REDUCED_MOTION_QUERY, twoColumns: '(min-width: 640px)', threeColumns: DESKTOP_QUERY };

/** The pages start loading a screen before the grid arrives, so they are usually painted by then. */
const PREVIEW_LOAD_MARGIN = '100% 0px';

/** Each column further right starts its wipe this much later, as a share of the screen height (%). */
const COLUMN_LAG = 3;

interface CertificateRegisterProps {
    certificates: PublicCertificateDto[];
    unavailable?: boolean;
}

/**
 * Certificates as a register, kept apart from the projects reel above. Built from the site's own
 * patterns: About's sub-block (hairline, faint label, a heading that states a fact), the reel's
 * header (heading left, lead right), hairline cells like the Tech Stack groups, and the Experience
 * row hover (a cell inverts). Every certificate shows whole on its paper (page 1 of its PDF).
 * Desktop: three cells per row. Tablet: two. Phones: rows with a small paper on the left.
 *
 * Motion, scrubbed like Experience: the rule draws, the header rises, then each cell wipes in from
 * the left as its top reaches the lower part of the screen, the cells of a row sweeping left to
 * right. Each cell has its own trigger, so the timing stays right after any resize or reflow.
 */
export default function CertificateRegister({ certificates, unavailable = false }: CertificateRegisterProps) {
    const blockRef = useRef<HTMLDivElement>(null);
    const showCertificates = certificates.length > 0 && !unavailable;
    const itemsKey = showCertificates ? certificates.map((certificate) => certificate.id).join('|') : '';
    const gridRef = useRef<HTMLUListElement>(null);
    const [loadPreviews, setLoadPreviews] = useState(false);

    // The cells stay clipped shut until their wipe plays, and IntersectionObserver treats clipped
    // content as off screen, so each preview's own lazy loading would wait for its wipe. The grid
    // is never clipped: it decides when every page starts loading.
    useEffect(() => {
        const grid = gridRef.current;
        // Without IntersectionObserver each preview already loads straight away by itself.
        if (loadPreviews || !grid || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            setLoadPreviews(true);
            observer.disconnect();
        }, { rootMargin: PREVIEW_LOAD_MARGIN });
        observer.observe(grid);
        return () => observer.disconnect();
    }, [loadPreviews, showCertificates]);

    useGSAP(
        () => {
            const block = blockRef.current;
            if (!block) return;
            const mm = gsap.matchMedia();
            mm.add(MOTION_CONDITIONS, (context) => {
                if (context.conditions?.reduce) return;

                gsap.timeline({
                    defaults: { ease: 'none' },
                    scrollTrigger: { trigger: block, start: 'top 85%', end: 'top 40%', scrub: 0.6, invalidateOnRefresh: true },
                })
                    .fromTo('[data-register-line]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.4 }, 0)
                    .fromTo('[data-register-title]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.6 }, 0.1)
                    .fromTo('[data-register-lead]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.35);

                const grid = block.querySelector('[data-register-grid]');
                if (!grid) return;
                const gridLeft = grid.getBoundingClientRect().left;
                gsap.utils.toArray<HTMLElement>('[data-register-cell]', block).forEach((cell) => {
                    const box = cell.getBoundingClientRect();
                    const lag = Math.round((box.left - gridLeft) / Math.max(1, box.width)) * COLUMN_LAG;
                    gsap.fromTo(
                        cell,
                        { clipPath: 'inset(0% 100% 0% 0%)', x: -24 },
                        {
                            clipPath: 'inset(0% 0% 0% 0%)',
                            x: 0,
                            ease: 'power2.out',
                            scrollTrigger: { trigger: cell, start: `top ${88 - lag}%`, end: `top ${74 - lag}%`, scrub: 0.6, invalidateOnRefresh: true },
                        },
                    );
                });
            }, block);
            // Streams in after the sections below were set up, and its height moves them: re-sort
            // triggers into document order and re-measure (the preloader does it on the first load).
            const refreshFrame = window.requestAnimationFrame(() => {
                ScrollTrigger.sort();
                if (!isPreloading()) ScrollTrigger.refresh();
            });
            return () => {
                window.cancelAnimationFrame(refreshFrame);
                mm.revert();
            };
        },
        { scope: blockRef, dependencies: [itemsKey], revertOnUpdate: true },
    );

    return (
        <div ref={blockRef} className="mx-auto w-full max-w-7xl px-5 pb-[clamp(3.5rem,7vw,6.5rem)] pt-[clamp(3.5rem,7vw,6rem)] md:px-8">
            <span data-register-line aria-hidden="true" className="block h-px bg-[var(--hairline)]" />

            <div className="flex flex-col gap-[1.125rem] pt-[clamp(3rem,6vw,5rem)] lg:flex-row lg:items-end lg:justify-between lg:gap-12">
                <div data-register-title>
                    <p className={`mb-3.5 ${MONO_LABEL}`}>Certificates</p>
                    {showCertificates && (
                        <h3 className="font-display text-[clamp(1.9rem,3.2vw,2.75rem)] font-bold leading-[1.06] tracking-[-0.025em] text-[var(--text)] [text-wrap:balance]">
                            {certificateSummary(certificates)}
                        </h3>
                    )}
                </div>
                <p data-register-lead className="max-w-[34ch] text-[0.95rem] leading-[1.7] text-[var(--muted)] lg:text-right">
                    {INTRO}
                </p>
            </div>

            {showCertificates ? (
                <ul
                    ref={gridRef}
                    data-register-grid
                    aria-label="Certificates"
                    className="mt-[clamp(2.25rem,4.5vw,3.5rem)] grid grid-cols-1 border-b border-[var(--hairline)] sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-0"
                >
                    {certificates.map((certificate) => (
                        <li
                            key={certificate.id}
                            data-register-cell
                            className="min-w-0 border-t border-[var(--hairline)] lg:border-l lg:[&:nth-child(3n+1)]:border-l-0"
                        >
                            <a
                                href={certificate.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`group grid h-full grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-[1.125rem] px-3 py-[1.125rem] text-[var(--text)] transition-colors duration-300 ease-out hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] focus-visible:bg-[var(--inverse-bg)] focus-visible:text-[var(--inverse-text)] motion-reduce:transition-none lg:grid-cols-1 lg:content-start lg:gap-5 lg:px-6 lg:py-7 ${FOCUS_RING}`}
                            >
                                {/* Page 1 of the PDF, whole on white paper in both themes. It repeats
                                    the title below, so it is hidden from screen readers. */}
                                <span
                                    aria-hidden="true"
                                    className="relative block aspect-[1.414/1] bg-white shadow-[0_0_0_1px_var(--hairline)]"
                                >
                                    <span className="absolute inset-[4%] block">
                                        <CertificatePdfPreview source={certificate.pdfUrl} label={`${certificate.title} first page`} eager={loadPreviews} compact />
                                    </span>
                                </span>
                                <span className="grid min-w-0 justify-items-start gap-1.5">
                                    <span className="font-mono text-[10.5px] uppercase leading-[1.5] tracking-[0.12em] text-[var(--faint)] transition-colors duration-300 ease-out group-hover:text-[var(--inverse-text)]/60 group-focus-visible:text-[var(--inverse-text)]/60 motion-reduce:transition-none">
                                        {certificate.issuer}
                                    </span>
                                    <h4 className="font-display text-[1.05rem] font-bold leading-[1.25] tracking-[-0.015em] lg:text-[1.2rem]">
                                        {certificate.title}
                                    </h4>
                                    <span className="mt-1 inline-flex items-center gap-2 border-b border-current py-[5px] font-mono text-[11px] font-bold uppercase leading-none tracking-[0.12em] opacity-70 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                                        Open PDF
                                        <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} />
                                    </span>
                                    <span className="sr-only">(opens in a new tab)</span>
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="mt-[clamp(2.25rem,4.5vw,3.5rem)]">
                    <ShowcaseState panel="certificates" unavailable={unavailable} />
                </div>
            )}
        </div>
    );
}
