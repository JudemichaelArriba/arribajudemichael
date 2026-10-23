// Shared by the Tech Stack section and the Ask assistant's profile context
// (features/chat/profile.ts), so the chat never lists skills the page doesn't show.

export interface Technology {
    name: string;
}

export interface TechCategory {
    name: string;
    technologies: Technology[];
}

export const TECH_CATEGORIES: readonly TechCategory[] = [
    {
        name: 'Frontend',
        technologies: [
            { name: 'Angular' },
            { name: 'Flutter' },
            { name: 'JavaScript' },
            { name: 'Tailwind CSS' },
            { name: 'CSS3' },
            { name: 'TypeScript' },
            { name: 'React' },
            { name: 'Next.js' },

            { name: 'Kotlin' },
        ],
    },
    {
        name: 'Backend',
        technologies: [
            { name: 'Laravel' },
            { name: 'Node.js' },
            { name: 'Python' },
            { name: 'Java' },
        ],
    },
    {
        name: 'Database',
        technologies: [
            { name: 'PostgreSQL' },
            { name: 'Supabase' },
            { name: 'MySQL' },
            { name: 'Firebase RTDB' },
        ],
    },
    {
        name: 'Tools',
        technologies: [
            { name: 'Git' },
            { name: 'Docker' },
            { name: 'Postman' },
            { name: 'Figma' },
            { name: 'Visual Studio Code' },
            { name: 'Android Studio' },
            { name: 'GitHub' },
        ],
    },
];
