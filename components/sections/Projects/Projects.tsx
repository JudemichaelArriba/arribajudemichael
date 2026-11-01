'use client';

import { useRef } from 'react';

import type { PublicCertificateDto } from '@/features/admin/certificates/types';
import type { PublicProjectDto } from '@/features/admin/projects/types';
import { DESKTOP_QUERY } from '@/lib/breakpoints';
import { useMediaQuery } from '@/lib/useMediaQuery';

import CertificateIndex from './CertificateIndex';
import ProjectReel from './ProjectReel';
import ShowcaseState from './ShowcaseState';
import { padIndex } from './showcase';
import { useShowcaseMotion } from './useShowcaseMotion';

interface ProjectsProps {
    projects: PublicProjectDto[];
    certificates?: PublicCertificateDto[];
    projectsUnavailable?: boolean;
    certificatesUnavailable?: boolean;
}

function Certificates({ certificates, unavailable }: { certificates: PublicCertificateDto[]; unavailable: boolean }) {
    const blockRef = useRef<HTMLDivElement>(null);
    // False on the server and the first client render, so hydration matches; desktop then swaps in
    // below the fold, behind the preloader.
    const isDesktop = useMediaQuery(DESKTOP_QUERY);
    const showCertificates = certificates.length > 0 && !unavailable;
    useShowcaseMotion(blockRef, { panel: 'certificates', isDesktop, itemCount: showCertificates ? certificates.length : 0 });

    return (
        <div ref={blockRef} className="mx-auto max-w-7xl px-5 pb-24 pt-14 md:px-8 md:pb-32">
            <div className="flex w-full items-center gap-4">
                <h3 data-showcase-word className="shrink-0 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text)]">
                    Certificates
                </h3>
                <span data-showcase-line aria-hidden="true" className="h-px min-w-8 flex-1 bg-[var(--hairline)]" />
                <span aria-hidden="true" className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--faint)]">
                    {padIndex(showCertificates ? certificates.length : 0)}
                </span>
            </div>
            <p data-showcase-intro className="mt-4 max-w-[52ch] text-[0.95rem] leading-[1.7] text-[var(--muted)]">
                Courses completed and recognitions received, each with its original PDF.
            </p>
            <div className="mt-11 lg:mt-14">
                {showCertificates
                    ? <CertificateIndex certificates={certificates} isDesktop={isDesktop} />
                    : <ShowcaseState panel="certificates" unavailable={unavailable} />}
            </div>
        </div>
    );
}

/**
 * The Projects section: the projects as a reel on a pinned stage, then the certificates below it,
 * kept out of the reel so they never compete with the projects.
 *
 * The stage reserves the navbar's height itself, so a jump to #projects (navbar, Ask) cancels the
 * page's scroll padding and lands exactly where the pin begins.
 */
export default function Projects({
    projects,
    certificates = [],
    projectsUnavailable = false,
    certificatesUnavailable = false,
}: ProjectsProps) {
    return (
        <section
            id="projects"
            data-analytics-section="projects"
            aria-labelledby="projects-heading"
            className="relative w-full scroll-mt-[calc(-1*(var(--nav-height,80px)+env(safe-area-inset-top)+2rem))]"
        >
            <ProjectReel projects={projects} unavailable={projectsUnavailable} />
            <Certificates certificates={certificates} unavailable={certificatesUnavailable} />
        </section>
    );
}
