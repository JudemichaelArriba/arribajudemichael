import { getPublishedCertificates } from '@/features/admin/certificates/queries';
import { getPublishedProjects } from '@/features/admin/projects/queries';
import Projects from './Projects';

export default async function ProjectsSection() {
    const [projectsResult, certificatesResult] = await Promise.allSettled([
        getPublishedProjects(),
        getPublishedCertificates(),
    ]);
    const projects = projectsResult.status === 'fulfilled' ? projectsResult.value : [];
    const certificates = certificatesResult.status === 'fulfilled'
        ? certificatesResult.value
        : [];

    return (
        <Projects
            projects={projects}
            certificates={certificates}
            projectsUnavailable={projectsResult.status === 'rejected'}
            certificatesUnavailable={certificatesResult.status === 'rejected'}
        />
    );
}
