import 'server-only';

import type { SiteSectionId } from '@/lib/site';
import { TECH_CATEGORIES } from '@/lib/techStack';
import {
    listCertificatesForChat,
    listExperiencesForChat,
    listProjectsForChat,
    type ChatCertificate,
    type ChatExperience,
    type ChatProject,
    type ChatToolResult,
} from './portfolioData';

// Every answer is grounded in the complete published records, given to the model up front on
// each request. (Tool calls were optional, and smaller fallback models sometimes skipped them and
// invented projects or jobs.) The data comes from the same cached public queries.

export interface PortfolioRecords {
    projects: ChatToolResult<ChatProject>;
    experiences: ChatToolResult<ChatExperience>;
    certificates: ChatToolResult<ChatCertificate>;
}

export async function loadPortfolioRecords(): Promise<PortfolioRecords> {
    const [projects, experiences, certificates] = await Promise.all([
        listProjectsForChat(),
        listExperiencesForChat(),
        listCertificatesForChat(),
    ]);
    return { projects, experiences, certificates };
}

function formatList<T>(
    heading: string,
    noun: string,
    result: ChatToolResult<T>,
    formatItem: (item: T, index: number) => string,
): string {
    if ('unavailable' in result) {
        return `## ${heading}\nUnavailable right now. Say you can't load his ${noun} at the moment and suggest trying again later. Do not list or describe any ${noun}.`;
    }
    if (result.items.length === 0) {
        return `## ${heading}\nNone published yet.`;
    }
    return `## ${heading} (complete list: ${result.items.length})\n${result.items.map(formatItem).join('\n')}`;
}

/** The records block of the instructions. Plain, labelled fields the model can quote exactly. */
export function formatPortfolioRecords(records: PortfolioRecords): string {
    return [
        formatList('Projects', 'projects', records.projects, (project, index) =>
            [
                `${index + 1}. Title: ${project.title}`,
                `   Category: ${project.category}`,
                `   Technologies: ${project.tags.length ? project.tags.join(', ') : 'not listed'}`,
                `   GitHub: ${project.githubUrl ?? 'not listed'}`,
                `   Description: ${project.description}`,
            ].join('\n'),
        ),
        formatList('Experience', 'experience', records.experiences, (experience, index) =>
            [
                `${index + 1}. Title: ${experience.title}`,
                `   Subtitle: ${experience.subtitle}`,
                `   Date: ${experience.dateLabel}`,
                `   Status: ${experience.status === 'active' ? 'ongoing' : 'completed'}`,
                `   Description: ${experience.description}`,
            ].join('\n'),
        ),
        formatList('Certificates', 'certificates', records.certificates, (certificate, index) =>
            `${index + 1}. Title: ${certificate.title} | Issuer: ${certificate.issuer}`,
        ),
    ].join('\n\n');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentions(text: string, phrase: string): boolean {
    const trimmed = phrase.trim();
    if (trimmed.length < 3) return false;
    return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}])`, 'iu').test(text);
}

const TECH_NAMES = TECH_CATEGORIES.flatMap((category) => category.technologies.map((tech) => tech.name));
const TECH_MENTIONS_FOR_SECTION = 3;

/**
 * Which site sections an answer actually talks about, for the "Jump to" buttons. Deterministic:
 * a section counts only when the answer names one of its real records (or several technologies).
 */
export function detectAnswerSections(answer: string, records: PortfolioRecords): SiteSectionId[] {
    const sections = new Set<SiteSectionId>();
    const items = <T>(result: ChatToolResult<T>): T[] => ('items' in result ? result.items : []);

    if (items(records.experiences).some((experience) => mentions(answer, experience.title))) {
        sections.add('experience');
    }
    if (TECH_NAMES.filter((name) => mentions(answer, name)).length >= TECH_MENTIONS_FOR_SECTION) {
        sections.add('techstack');
    }
    if (
        items(records.projects).some((project) => mentions(answer, project.title)) ||
        items(records.certificates).some((certificate) => mentions(answer, certificate.title))
    ) {
        sections.add('projects');
    }

    return [...sections];
}
