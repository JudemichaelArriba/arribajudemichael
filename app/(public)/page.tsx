import Home from '@/components/sections/home/Home';
import WhatIDo from '@/components/sections/WhatIDo/WhatIDo';
import AboutMe from '@/components/sections/AboutMe/AboutMe';
import Experience from '@/components/sections/Experience/Experience';
import TechStack from '@/components/sections/TechStack/TechStack';

export default function HomePage() {
    return (
        <>
            <Home />
            <WhatIDo />
            <AboutMe />
            <Experience />
            <TechStack />
        </>
    );
}
