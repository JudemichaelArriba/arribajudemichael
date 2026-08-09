import Home from '@/components/sections/home/Home';
import WhatIDo from '@/components/sections/WhatIDo/WhatIDo';
import AboutMe from '@/components/sections/AboutMe/AboutMe';
import Experience from '@/components/sections/Experience/Experience';
import TechStack from '@/components/sections/TechStack/TechStack';
import Projects from '@/components/sections/Projects/Projects';
import Contact from '@/components/sections/Contact/Contact';
import { getPublishedCertificates } from '@/features/admin/certificates/queries';
import { getPublicExperiences } from '@/features/admin/experiences/queries';
import { getPublishedProjects } from '@/features/admin/projects/queries';

export default async function HomePage() {
    const [projectsResult, certificatesResult, experiencesResult] = await Promise.allSettled([
        getPublishedProjects(),
        getPublishedCertificates(),
        getPublicExperiences(),
    ]);
    const projects = projectsResult.status === 'fulfilled' ? projectsResult.value : [];
    const certificates = certificatesResult.status === 'fulfilled'
        ? certificatesResult.value
        : [];
    const projectsUnavailable = projectsResult.status === 'rejected';
    const certificatesUnavailable = certificatesResult.status === 'rejected';
    const experiences = experiencesResult.status === 'fulfilled'
        ? experiencesResult.value
        : [];
    const experiencesUnavailable = experiencesResult.status === 'rejected';

    return (
        <>
            <Home />
            <WhatIDo />
            <AboutMe />
            <Experience
                experiences={experiences}
                experiencesUnavailable={experiencesUnavailable}
            />
            <TechStack />
            <Projects
                projects={projects}
                certificates={certificates}
                projectsUnavailable={projectsUnavailable}
                certificatesUnavailable={certificatesUnavailable}
            />
            <Contact />
        </>
    );
}
