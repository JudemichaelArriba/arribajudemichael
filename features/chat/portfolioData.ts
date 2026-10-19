import 'server-only';

import { getPublishedCertificates } from '@/features/admin/certificates/queries';
import { getPublicExperiences } from '@/features/admin/experiences/queries';
import { getPublishedProjects } from '@/features/admin/projects/queries';

// Read-only views of the published portfolio for the assistant's tools. Everything goes through
// the existing cached public queries (publishable key + RLS, `is_published = true`, whitelisted
// columns); this module never creates a Supabase client of its own. Ids, storage URLs, image data
// and timestamps are dropped so no internal detail reaches the model.

export const MAX_TOOL_PROJECTS = 20;
export const MAX_TOOL_EXPERIENCES = 20;
export const MAX_TOOL_CERTIFICATES = 30;

export interface ChatProject {
    title: string;
    category: string;
    description: string;
    tags: string[];
    githubUrl: string | null;
}

export interface ChatExperience {
    title: string;
    subtitle: string;
    dateLabel: string;
    description: string;
    status: 'active' | 'complete';
}

export interface ChatCertificate {
    title: string;
    issuer: string;
}

export type ChatToolResult<T> = { items: T[] } | { unavailable: true };

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+(?:\/[\w.-]+)?\/?$/;

function logUnavailable(source: string, error: unknown) {
    console.error('[chat/tools] Portfolio data is unavailable.', {
        source,
        name: error instanceof Error ? error.name : 'UnknownError',
    });
}

export async function listProjectsForChat(): Promise<ChatToolResult<ChatProject>> {
    try {
        const projects = await getPublishedProjects();
        return {
            items: projects.slice(0, MAX_TOOL_PROJECTS).map((project) => ({
                title: project.title,
                category: project.category,
                description: project.description,
                tags: project.tags.slice(0, 12),
                githubUrl:
                    project.githubUrl && GITHUB_URL_PATTERN.test(project.githubUrl) ? project.githubUrl : null,
            })),
        };
    } catch (error) {
        logUnavailable('projects', error);
        return { unavailable: true };
    }
}

export async function listExperiencesForChat(): Promise<ChatToolResult<ChatExperience>> {
    try {
        const experiences = await getPublicExperiences();
        return {
            items: experiences.slice(0, MAX_TOOL_EXPERIENCES).map((experience) => ({
                title: experience.title,
                subtitle: experience.subtitle,
                dateLabel: experience.dateLabel,
                description: experience.description,
                status: experience.status,
            })),
        };
    } catch (error) {
        logUnavailable('experiences', error);
        return { unavailable: true };
    }
}

export async function listCertificatesForChat(): Promise<ChatToolResult<ChatCertificate>> {
    try {
        const certificates = await getPublishedCertificates();
        return {
            items: certificates.slice(0, MAX_TOOL_CERTIFICATES).map((certificate) => ({
                title: certificate.title,
                issuer: certificate.issuer,
            })),
        };
    } catch (error) {
        logUnavailable('certificates', error);
        return { unavailable: true };
    }
}
