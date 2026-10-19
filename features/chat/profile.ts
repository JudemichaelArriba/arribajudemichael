import 'server-only';

import { CONTACT_CHANNELS, SITE_NAVIGATION } from '@/lib/site';
import { TECH_CATEGORIES } from '@/lib/techStack';

// Static facts the assistant may state without a tool call. The prose mirrors the public copy in
// components/sections/AboutMe/AboutMe.tsx and components/sections/WhatIDo/WhatIDo.tsx — keep the
// two in sync, and never add anything here that the site itself does not say.
const BIO = [
    'Name: Jude Michael T. Arriba.',
    'Role: Full-Stack Software Engineer.',
    'Focus: backend APIs, web and mobile clients, and system architecture.',
    'What he builds: scalable APIs, resilient backend infrastructure, and fluid digital experiences that bridge technical excellence with intuitive design.',
    'Core capabilities: system architecture (scalable APIs and dependable data flows); backend engineering (resilient services and practical integrations); product delivery (responsive web and mobile experiences).',
    'How he works: cares about the parts nobody sees — migrations that run cleanly, error messages that explain themselves, code the next person can read. Works in small, steady steps, asks questions early, and leaves projects easier to change than he found them.',
    'Values: clean code, performance, maintainability, long-term reliability.',
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

export function buildProfileContext(): string {
    return [
        '## Profile',
        BIO.join('\n'),
        '## Skills (from the Tech Stack section)',
        formatSkills(),
        '## Public contact details',
        formatContact(),
        '## Site sections',
        formatSections(),
    ].join('\n\n');
}
