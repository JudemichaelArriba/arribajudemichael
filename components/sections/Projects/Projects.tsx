import type { PublicCertificateDto } from '@/features/admin/certificates/types';
import type { PublicProjectDto } from '@/features/admin/projects/types';

import CertificateRegister from './CertificateRegister';
import ProjectScreens from './ProjectScreens';

interface ProjectsProps {
    projects: PublicProjectDto[];
    certificates?: PublicCertificateDto[];
    projectsUnavailable?: boolean;
    certificatesUnavailable?: boolean;
}

/**
 * The Projects section: the projects as browser windows that alternate sides, then the
 * certificates as a register below them, kept apart so they never compete with the projects.
 *
 * The section clips sideways at the page edge, not at the content column: the windows reach past
 * the column and turn in 3D, and the windows on the right slide in from beyond the page.
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
            className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] overflow-x-clip"
        >
            <ProjectScreens projects={projects} unavailable={projectsUnavailable} />
            <CertificateRegister certificates={certificates} unavailable={certificatesUnavailable} />
        </section>
    );
}
