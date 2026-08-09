import 'server-only';

import { createClient as createAnonymousClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

import type { Database } from '@/lib/models/database.types';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type {
    AdminExperienceDto,
    Experience,
    PublicExperienceDto,
} from './types';
import { isExperienceStatus } from './validation';

export const EXPERIENCES_CACHE_TAG = 'experiences';

type PublicExperienceRow = Pick<
    Experience,
    'id' | 'title' | 'subtitle' | 'date_label' | 'description' | 'status'
>;

function logReadFailure(scope: 'public' | 'admin', error: { code?: string | null }) {
    console.error(`[experiences/${scope}] Experience query failed.`, {
        code: error.code ?? 'unknown',
    });
}

function toPublicExperience(
    experience: PublicExperienceRow,
): PublicExperienceDto | null {
    if (!isExperienceStatus(experience.status)) {
        console.error('[experiences/public] Experience has an invalid status.', {
            code: 'invalid_status',
        });
        return null;
    }

    return {
        id: experience.id,
        title: experience.title,
        subtitle: experience.subtitle,
        dateLabel: experience.date_label,
        description: experience.description,
        status: experience.status,
    };
}

function toAdminExperience(experience: Experience): AdminExperienceDto {
    if (!isExperienceStatus(experience.status)) {
        console.error('[experiences/admin] Experience has an invalid status.', {
            code: 'invalid_status',
        });
        throw new Error('Admin experiences are unavailable.');
    }

    return {
        id: experience.id,
        title: experience.title,
        subtitle: experience.subtitle,
        dateLabel: experience.date_label,
        description: experience.description,
        status: experience.status,
        isPublished: experience.is_published,
        displayOrder: experience.display_order,
        createdAt: experience.created_at,
        updatedAt: experience.updated_at,
    };
}

const getCachedPublicExperiences = unstable_cache(
    async (): Promise<PublicExperienceDto[]> => {
        const { url, publishableKey } = getSupabasePublicConfig();
        const supabase = createAnonymousClient<Database>(url, publishableKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });

        const { data, error } = await supabase
            .from('experiences')
            .select('id,title,subtitle,date_label,description,status')
            .eq('is_published', true)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            logReadFailure('public', error);
            throw new Error('Published experiences are unavailable.');
        }

        return data.flatMap((experience) => {
            const mapped = toPublicExperience(experience);
            return mapped ? [mapped] : [];
        });
    },
    ['published-experiences'],
    { revalidate: 3600, tags: [EXPERIENCES_CACHE_TAG] },
);

export async function getPublicExperiences(): Promise<PublicExperienceDto[]> {
    return getCachedPublicExperiences();
}

export async function getAdminExperiences(): Promise<AdminExperienceDto[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        logReadFailure('admin', error);
        throw new Error('Admin experiences are unavailable.');
    }

    return data.map(toAdminExperience);
}
