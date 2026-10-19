// Shared by the Tech Stack section and the Ask assistant's profile context
// (features/chat/profile.ts), so the chat never lists skills the page doesn't show.

export interface Technology {
    name: string;
    icon: string;
    invertOnDark?: boolean;
}

export interface TechCategory {
    name: string;
    technologies: Technology[];
}

export const TECH_CATEGORIES: readonly TechCategory[] = [
    {
        name: 'Frontend',
        technologies: [
            { name: 'Angular', icon: '/tech/angular.svg' },
            { name: 'Flutter', icon: '/tech/flutter.svg' },
            { name: 'JavaScript', icon: '/tech/javascript.svg' },
            { name: 'Tailwind CSS', icon: '/tech/tailwindcss.svg' },
            { name: 'CSS3', icon: '/tech/css3.svg' },
            { name: 'TypeScript', icon: '/tech/typescript.svg' },
            { name: 'React', icon: '/tech/react.svg' },
            { name: 'Next.js', icon: '/tech/nextjs.svg' },

            { name: 'Kotlin', icon: '/tech/kotlin.svg' },
        ],
    },
    {
        name: 'Backend',
        technologies: [
            { name: 'Laravel', icon: '/tech/laravel.svg' },
            { name: 'Node.js', icon: '/tech/nodejs.svg' },
            { name: 'Python', icon: '/tech/python.svg' },
            { name: 'Java', icon: '/tech/java.svg' },
        ],
    },
    {
        name: 'Database',
        technologies: [
            { name: 'PostgreSQL', icon: '/tech/postgresql.svg' },
            { name: 'Supabase', icon: '/tech/supabase.svg' },
            { name: 'MySQL', icon: '/tech/mysql.svg' },
            { name: 'Firebase RTDB', icon: '/tech/firebase.svg' },
        ],
    },
    {
        name: 'Tools',
        technologies: [
            { name: 'Git', icon: '/tech/git.svg' },
            { name: 'Docker', icon: '/tech/docker.svg' },
            { name: 'Postman', icon: '/tech/postman.svg' },
            { name: 'Figma', icon: '/tech/figma.svg' },
            { name: 'Visual Studio Code', icon: '/tech/vscode.svg' },
            { name: 'Android Studio', icon: '/tech/androidstudio.svg' },
            { name: 'GitHub', icon: '/tech/github.svg', invertOnDark: true },
        ],
    },
];
