import 'server-only';

import {
    createClient as createAnonymousClient,
    type SupabaseClient,
} from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

import type { Database } from '@/lib/models/database.types';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { AdminProjectDto, Project, PublicProjectDto } from './types';

export const PROJECT_MEDIA_BUCKET = 'project-media';
export const PROJECTS_CACHE_TAG = 'projects';

type PublicProjectRow = Pick<
    Project,
    | 'id'
    | 'title'
    | 'category'
    | 'description'
    | 'image_path'
    | 'image_alt'
    | 'github_url'
    | 'tags'
>;

function getProjectImageUrl(
    supabase: SupabaseClient<Database>,
    imagePath: string | null,
): string | null {
    if (!imagePath) return null;
    return supabase.storage.from(PROJECT_MEDIA_BUCKET).getPublicUrl(imagePath).data.publicUrl;
}

function toPublicProject(
    project: PublicProjectRow,
    supabase: SupabaseClient<Database>,
): PublicProjectDto {
    return {
        id: project.id,
        title: project.title,
        category: project.category,
        description: project.description,
        imageUrl: getProjectImageUrl(supabase, project.image_path),
        imageAlt: project.image_alt,
        githubUrl: project.github_url,
        tags: [...project.tags],
    };
}

function toAdminProject(
    project: Project,
    supabase: SupabaseClient<Database>,
): AdminProjectDto {
    return {
        ...toPublicProject(project, supabase),
        slug: project.slug,
        hasImage: Boolean(project.image_path),
        isPublished: project.is_published,
        displayOrder: project.display_order,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
    };
}

function logReadFailure(scope: 'public' | 'admin', error: { code?: string | null }) {
    console.error(`[projects/${scope}] Project query failed.`, {
        code: error.code ?? 'unknown',
    });
}

const getCachedPublishedProjects = unstable_cache(
    async (): Promise<PublicProjectDto[]> => {
        const { url, publishableKey } = getSupabasePublicConfig();
        const supabase = createAnonymousClient<Database>(url, publishableKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });

        const { data, error } = await supabase
            .from('projects')
            .select('id,title,category,description,image_path,image_alt,github_url,tags')
            .eq('is_published', true)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            logReadFailure('public', error);
            throw new Error('Published projects are unavailable.');
        }

        return data.map((project) => toPublicProject(project, supabase));
    },
    ['published-projects'],
    { revalidate: 3600, tags: [PROJECTS_CACHE_TAG] },
);

export async function getPublishedProjects(): Promise<PublicProjectDto[]> {
    return getCachedPublishedProjects();
}

export async function getAdminProjects(): Promise<AdminProjectDto[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        logReadFailure('admin', error);
        throw new Error('Admin projects are unavailable.');
    }

    return data.map((project) => toAdminProject(project, supabase));
}
