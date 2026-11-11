export type SiteSectionId =
    | 'home'
    | 'about'
    | 'experience'
    | 'techstack'
    | 'projects'
    | 'contact';

export interface SiteNavigationItem {
    id: SiteSectionId;
    label: string;
}

export type ContactChannelId = 'github' | 'linkedin' | 'email';

export interface ContactChannel {
    id: ContactChannelId;
    label: string;
    href: string;
}

export interface DownloadableFile {
    /** Where the file is served from (a file in `public/`). */
    href: string;
    /** The name the visitor's browser saves it under. */
    fileName: string;
}

export const GITHUB_USERNAME = 'JudemichaelArriba';

/** The CV behind the navbar's CV button. Replace `public/cv.pdf` to update it; the URL stays the same. */
export const CV_DOWNLOAD: DownloadableFile = {
    href: '/cv.pdf',
    fileName: 'Jude_Arriba_CV_2026.pdf',
};

export const SITE_NAVIGATION: readonly SiteNavigationItem[] = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'experience', label: 'Experience' },
    { id: 'techstack', label: 'Tech Stack' },
    { id: 'projects', label: 'Projects' },
    { id: 'contact', label: 'Contact' },
];


export const CONTACT_CHANNELS: readonly ContactChannel[] = [
    { id: 'github', label: 'GitHub', href: `https://github.com/${GITHUB_USERNAME}` },
    { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/jude-michael-t-arriba-a70b103b9' },
    { id: 'email', label: 'Email', href: 'mailto:arribajudemichael@gmail.com' },
];
