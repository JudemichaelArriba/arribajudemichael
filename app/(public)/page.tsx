import Home from '@/components/sections/home/Home';
import WhatIDo from '@/components/sections/WhatIDo/WhatIDo';
import AboutMe from '@/components/sections/AboutMe/AboutMe';
import Experience from '@/components/sections/Experience/Experience';
import TechStack from '@/components/sections/TechStack/TechStack';
import Projects from '@/components/sections/Projects/Projects';
import Contact from '@/components/sections/Contact/Contact';

export default function HomePage() {
    return (
        <>
            <Home />
            <WhatIDo />
            <AboutMe />
            <Experience />
            <TechStack />
            <Projects />
            <Contact />
        </>
    );
}
