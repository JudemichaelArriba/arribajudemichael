import type { PublicCertificateDto } from '@/features/admin/certificates/types';
import type { PublicProjectDto } from '@/features/admin/projects/types';

import CertificateRegister from './CertificateRegister';
import ProjectReel from './ProjectReel';

interface ProjectsProps {
    projects: PublicProjectDto[];
    certificates?: PublicCertificateDto[];
    projectsUnavailable?: boolean;
    certificatesUnavailable?: boolean;
}

/**
 * The Projects section: the projects as a reel on a pinned stage, then the certificates as a
 * register below it, kept out of the reel so they never compete with the projects.
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
            <CertificateRegister certificates={certificates} unavailable={certificatesUnavailable} />
        </section>
    );
}
