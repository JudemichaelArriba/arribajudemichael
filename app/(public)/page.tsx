import Home from '@/components/sections/home/Home';
import HomeContinuation from '@/components/sections/HomeContinuation/HomeContinuation';
import WhatIDo from '@/components/sections/WhatIDo/WhatIDo';
import AboutMe from '@/components/sections/AboutMe/AboutMe';

export default function HomePage() {
    return (
        <>
            <Home />
            <HomeContinuation>
                <WhatIDo />
                <AboutMe />
            </HomeContinuation>
        </>
    );
}
