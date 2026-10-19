import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';

import {
    listCertificatesForChat,
    listExperiencesForChat,
    listProjectsForChat,
} from './portfolioData';

// Every tool takes no arguments: there is nothing for the model (or a prompt injection) to steer.
// `.strict()` rejects any argument the model invents instead of silently ignoring it.
const noArguments = z.object({}).strict();

export const chatTools = {
    getProjects: tool({
        description:
            "List Jude's published portfolio projects (title, category, description, tags, GitHub link). Use for any question about his projects or what he has built.",
        inputSchema: noArguments,
        execute: () => listProjectsForChat(),
    }),
    getExperience: tool({
        description:
            "List Jude's published work and education experience (title, organisation/subtitle, date range, description, whether it is ongoing).",
        inputSchema: noArguments,
        execute: () => listExperiencesForChat(),
    }),
    getCertificates: tool({
        description: "List Jude's published certificates (title and issuer).",
        inputSchema: noArguments,
        execute: () => listCertificatesForChat(),
    }),
};

export type ChatToolName = keyof typeof chatTools;
