import { Suspense } from 'react';

import Home from '@/components/sections/home/Home';
import WhatIDo from '@/components/sections/WhatIDo/WhatIDo';
import AboutMe from '@/components/sections/AboutMe/AboutMe';
import ExperienceSection from '@/components/sections/Experience/ExperienceSection';
import ExperienceSkeleton from '@/components/sections/Experience/ExperienceSkeleton';
import TechStack from '@/components/sections/TechStack/TechStack';
import ProjectsSection from '@/components/sections/Projects/ProjectsSection';
import ProjectsSkeleton from '@/components/sections/Projects/ProjectsSkeleton';
import Contact from '@/components/sections/Contact/Contact';

export default function HomePage() {
    return (
        <>
            <Home />
            <WhatIDo />
            <AboutMe />
            <Suspense fallback={<ExperienceSkeleton />}>
                <ExperienceSection />
            </Suspense>
            <TechStack />
            <Suspense fallback={<ProjectsSkeleton />}>
                <ProjectsSection />
            </Suspense>
            <Contact />
        </>
    );
}
