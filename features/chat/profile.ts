import 'server-only';

import { CONTACT_CHANNELS, SITE_NAVIGATION } from '@/lib/site';
import { TECH_CATEGORIES } from '@/lib/techStack';

// Static facts sent with every chat request. The prose mirrors the public copy in
// components/sections/AboutMe/AboutMe.tsx and components/sections/WhatIDo/WhatIDo.tsx — keep the
// two in sync, and never add anything here that the site itself does not say.
const BIO = [
    'Name: Jude Michael T. Arriba.',
    'Role: Full-Stack Developer.',
    'Titles he uses: full-stack developer, web developer, backend developer, mobile developer. He is not a software engineer and does not hold any engineer title.',
    'Focus: backend APIs, web and mobile clients, and system architecture.',
    'What he builds: scalable APIs, resilient backend infrastructure, and fluid digital experiences that bridge technical excellence with intuitive design.',
    'Core capabilities: system architecture (scalable APIs and dependable data flows); backend development (resilient services and practical integrations); product delivery (responsive web and mobile experiences).',
    // Achievements (capstone, competitions, awards) deliberately live only in the Experience
    // records, so the assistant always reads the current, owner-written wording.
    'About: a current IT (BSIT) student at ACES Tagum College in Tagum, Davao del Norte, Philippines. Teaching himself to code since 2023. Always looking for the next real problem to build for.',
    'Values: clean code, performance, maintainability, long-term reliability.',
];

// Personal details Jude supplied for the assistant only; they are not shown on the site.
// The birth date stays here: only the age computed from it is ever sent to the model.
const BIRTH_DATE = { year: 2005, month: 1, day: 26 } as const;
const HOME_TIME_ZONE = 'Asia/Manila';

const PERSONAL = [
    'Based in: Tagum City, Davao del Norte, Philippines.',
    'Hobbies: watching anime, reading manga and manhwa, scrolling TikTok, and learning new technologies.',
];

function formatSkills(): string {
    return TECH_CATEGORIES.map(
        (category) => `${category.name}: ${category.technologies.map((tech) => tech.name).join(', ')}`,
    ).join('\n');
}

function formatContact(): string {
    const channels = CONTACT_CHANNELS.map((channel) => {
        const destination = channel.href.startsWith('mailto:')
            ? channel.href.slice('mailto:'.length)
            : channel.href;
        return `${channel.label}: ${destination}`;
    });

    return [...channels, 'Contact form: the Contact section of this site (messages go straight to his inbox).'].join(
        '\n',
    );
}

function formatSections(): string {
    return SITE_NAVIGATION.map((item) => item.label).join(', ');
}

function getHomeDate(now: Date): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: HOME_TIME_ZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
    return { year: part('year'), month: part('month'), day: part('day') };
}

/** Jude's age on the given instant, with the birthday turning over at midnight Philippine time. */
export function getAgeOn(now: Date): number {
    const today = getHomeDate(now);
    const hadBirthdayThisYear =
        today.month > BIRTH_DATE.month || (today.month === BIRTH_DATE.month && today.day >= BIRTH_DATE.day);
    return today.year - BIRTH_DATE.year - (hadBirthdayThisYear ? 0 : 1);
}

/** Built per request so the age is always current, even on a long-lived server. */
export function buildProfileContext(now: Date = new Date()): string {
    return [
        '## Profile',
        BIO.join('\n'),
        '## Personal',
        [`Age: ${getAgeOn(now)}.`, ...PERSONAL].join('\n'),
        '## Skills (from the Tech Stack section)',
        formatSkills(),
        '## Public contact details',
        formatContact(),
        '## Site sections',
        formatSections(),
    ].join('\n\n');
}
