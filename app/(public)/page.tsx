import HomeRevealScene from '@/components/sections/HomeRevealScene/HomeRevealScene';
import HomeContinuation from '@/components/sections/HomeContinuation/HomeContinuation';
import WhatIDo from '@/components/sections/WhatIDo/WhatIDo';
import AboutMe from '@/components/sections/AboutMe/AboutMe';

export default function HomePage() {
    return (
        <HomeRevealScene>
            <HomeContinuation>
                <WhatIDo />
                <AboutMe />
            </HomeContinuation>
        </HomeRevealScene>
    );
}
