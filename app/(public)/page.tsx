import Home from '@/components/sections/home/Home';
import WhatIDo from '@/components/sections/WhatIDo/WhatIDo';
import AboutMe from '@/components/sections/AboutMe/AboutMe';
import Experience from '@/components/sections/Experience/Experience';
import TechStack from '@/components/sections/TechStack/TechStack';
import Projects from '@/components/sections/Projects/Projects';
import Contact from '@/components/sections/Contact/Contact';
import { getPublishedProjects } from '@/features/admin/projects/queries';
import type { PublicProjectDto } from '@/features/admin/projects/types';

export default async function HomePage() {
    let projects: PublicProjectDto[] = [];
    let projectsUnavailable = false;

    try {
        projects = await getPublishedProjects();
    } catch {
        projectsUnavailable = true;
    }

    return (
        <>
            <Home />
            <WhatIDo />
            <AboutMe />
            <Experience />
            <TechStack />
            <Projects projects={projects} projectsUnavailable={projectsUnavailable} />
            <Contact />
        </>
    );
}
