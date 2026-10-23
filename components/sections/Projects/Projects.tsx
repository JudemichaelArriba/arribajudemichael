'use client';

import { useRef, useState } from 'react';

import { preloadPdfRuntime } from '@/components/ui/CertificatePdfPreview/CertificatePdfPreview';
import type { PublicCertificateDto } from '@/features/admin/certificates/types';
import type { PublicProjectDto } from '@/features/admin/projects/types';
import { DESKTOP_QUERY } from '@/lib/breakpoints';
import { useMediaQuery } from '@/lib/useMediaQuery';

import CertificateIndex from './CertificateIndex';
import ProjectIndex from './ProjectIndex';
import ShowcaseState from './ShowcaseState';
import ShowcaseTabs from './ShowcaseTabs';
import { SHOWCASE_PANEL_ID, showcaseTabId, type ShowcasePanel } from './showcase';
import { useShowcaseMotion } from './useShowcaseMotion';

export type { ShowcasePanel } from './showcase';

interface ProjectsProps {
    projects: PublicProjectDto[];
    certificates?: PublicCertificateDto[];
    projectsUnavailable?: boolean;
    certificatesUnavailable?: boolean;
}

const INTRO: Record<ShowcasePanel, string> = {
    projects: 'Systems built end to end, from the interface down to the database.',
    certificates: 'Courses completed and recognitions received, each with its original PDF.',
};

/**
 * Projects and certificates as an index (Option A). Desktop: the titles as a list beside a preview
 * that stays in view. Phones and tablets: projects as a readable list, certificates as a contact
 * sheet of their first pages. Only one layout is rendered at a time.
 */
export default function Projects({
    projects,
    certificates = [],
    projectsUnavailable = false,
    certificatesUnavailable = false,
}: ProjectsProps) {
    const sectionRef = useRef<HTMLElement>(null);
    const [panel, setPanel] = useState<ShowcasePanel>('projects');
    // False on the server and the first client render, so hydration matches; desktop then swaps in
    // below the fold, behind the preloader.
    const isDesktop = useMediaQuery(DESKTOP_QUERY);

    const showProjects = projects.length > 0 && !projectsUnavailable;
    const showCertificates = certificates.length > 0 && !certificatesUnavailable;
    const itemCount = panel === 'projects'
        ? (showProjects ? projects.length : 0)
        : (showCertificates ? certificates.length : 0);

    useShowcaseMotion(sectionRef, { panel, isDesktop, itemCount });

    return (
        <section
            id="projects"
            data-analytics-section="projects"
            ref={sectionRef}
            aria-labelledby="projects-heading"
            className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32 short:py-24"
        >
            <div className="mx-auto max-w-7xl">
                <div className="flex w-full items-center gap-4">
                    <p className="shrink-0 font-display text-xs font-bold uppercase leading-none tracking-[0.14em] text-[var(--text)]">
                        Projects
                    </p>
                    <span data-showcase-line aria-hidden="true" className="h-px min-w-8 flex-1 bg-[var(--hairline)]" />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
                        06 / Work
                    </span>
                </div>

                <h2 id="projects-heading" className="sr-only">Projects and certificates</h2>

                <div className="mt-11 grid gap-6 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-end lg:gap-12 short:mt-8">
                    <ShowcaseTabs
                        value={panel}
                        onChange={setPanel}
                        counts={{ projects: projects.length, certificates: certificates.length }}
                        onCertificatesIntent={showCertificates ? preloadPdfRuntime : undefined}
                    />
                    <p data-showcase-intro className="max-w-md text-[0.95rem] leading-[1.7] text-[var(--muted)] sm:text-base">
                        {INTRO[panel]}
                        {isDesktop && <span> Hover or select a title to preview it.</span>}
                    </p>
                </div>

                <div
                    id={SHOWCASE_PANEL_ID}
                    role="tabpanel"
                    aria-labelledby={showcaseTabId(panel)}
                    className="mt-11 lg:mt-14 short:mt-9"
                >
                    {panel === 'projects' && (showProjects
                        ? <ProjectIndex projects={projects} isDesktop={isDesktop} />
                        : <ShowcaseState panel="projects" unavailable={projectsUnavailable} />)}
                    {panel === 'certificates' && (showCertificates
                        ? <CertificateIndex certificates={certificates} isDesktop={isDesktop} />
                        : <ShowcaseState panel="certificates" unavailable={certificatesUnavailable} />)}
                </div>
            </div>
        </section>
    );
}
