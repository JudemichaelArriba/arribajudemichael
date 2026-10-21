import { Suspense } from 'react';

import Home from '@/components/sections/home/Home';
import WhatIDo from '@/components/sections/WhatIDo/WhatIDo';
import AboutMe from '@/components/sections/AboutMe/AboutMe';
import AboutSection from '@/components/sections/AboutMe/AboutSection';
import ExperienceSection from '@/components/sections/Experience/ExperienceSection';
import ExperienceSkeleton from '@/components/sections/Experience/ExperienceSkeleton';
import TechStack from '@/components/sections/TechStack/TechStack';
import ProjectsSection from '@/components/sections/Projects/ProjectsSection';
import ProjectsSkeleton from '@/components/sections/Projects/ProjectsSkeleton';
import Contact from '@/components/sections/Contact/Contact';

export default function HomePage() {
    return (
        <>
            {/* Link target for the very top: Home is pinned, so #home lands where its pin ends
                and the name has already scrolled away. */}
            <span id="top" aria-hidden="true" />
            <Home />
            <WhatIDo />
            <Suspense fallback={<AboutMe contributions={null} />}>
                <AboutSection />
            </Suspense>
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
