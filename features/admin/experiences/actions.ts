'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import { EXPERIENCES_CACHE_TAG } from './queries';
import type {
    ExperienceActionState,
    ExperienceFieldErrors,
    ExperienceInsert,
    ExperienceUpdate,
} from './types';
import {
    isExperienceId,
    validateExperienceFormData,
} from './validation';

function nextState(
    previousState: ExperienceActionState,
    status: ExperienceActionState['status'],
    message: string,
    fieldErrors: ExperienceFieldErrors = {},
): ExperienceActionState {
    return {
        status,
        message,
        fieldErrors,
        attempt: previousState.attempt + 1,
    };
}

function getErrorCode(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return 'unknown';
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : 'unknown';
}

function logMutationFailure(
    operation: 'create' | 'update' | 'delete',
    error: unknown,
) {
    console.error(`[experiences/${operation}] Operation failed.`, {
        code: getErrorCode(error),
    });
}

function invalidateExperienceViews() {
    updateTag(EXPERIENCES_CACHE_TAG);
    revalidatePath('/');
    revalidatePath('/dashboard/experiences');
}

export async function createExperience(
    previousState: ExperienceActionState,
    formData: FormData,
): Promise<ExperienceActionState> {
    await requireUser();
    const validation = validateExperienceFormData(formData);

    if (!validation.success) {
        return nextState(
            previousState,
            'error',
            'Review the highlighted fields.',
            validation.fieldErrors,
        );
    }

    const insert: ExperienceInsert = {
        title: validation.data.title,
        subtitle: validation.data.subtitle,
        date_label: validation.data.dateLabel,
        description: validation.data.description,
        status: validation.data.status,
        display_order: validation.data.displayOrder,
        is_published: validation.data.isPublished,
    };
    const supabase = await createClient();
    const { data: createdExperience, error } = await supabase
        .from('experiences')
        .insert(insert)
        .select('id')
        .maybeSingle();

    if (error || !createdExperience) {
        logMutationFailure('create', error ?? { code: 'no_row_created' });
        return nextState(
            previousState,
            'error',
            'Unable to create the experience right now. Please try again.',
        );
    }

    invalidateExperienceViews();
    return nextState(previousState, 'success', 'Experience created successfully.');
}

export async function updateExperience(
    experienceId: string,
    previousState: ExperienceActionState,
    formData: FormData,
): Promise<ExperienceActionState> {
    await requireUser();

    if (!isExperienceId(experienceId)) {
        return nextState(previousState, 'error', 'Unable to identify this experience.');
    }

    const validation = validateExperienceFormData(formData);
    if (!validation.success) {
        return nextState(
            previousState,
            'error',
            'Review the highlighted fields.',
            validation.fieldErrors,
        );
    }

    const supabase = await createClient();
    const { data: existingExperience, error: readError } = await supabase
        .from('experiences')
        .select('id')
        .eq('id', experienceId)
        .maybeSingle();

    if (readError || !existingExperience) {
        if (readError) logMutationFailure('update', readError);
        return nextState(
            previousState,
            'error',
            'This experience could not be found. Refresh and try again.',
        );
    }

    const update: ExperienceUpdate = {
        title: validation.data.title,
        subtitle: validation.data.subtitle,
        date_label: validation.data.dateLabel,
        description: validation.data.description,
        status: validation.data.status,
        display_order: validation.data.displayOrder,
        is_published: validation.data.isPublished,
    };
    const { data: updatedExperience, error } = await supabase
        .from('experiences')
        .update(update)
        .eq('id', experienceId)
        .select('id')
        .maybeSingle();

    if (error || !updatedExperience) {
        logMutationFailure('update', error ?? { code: 'no_row_updated' });
        return nextState(
            previousState,
            'error',
            'Unable to update the experience right now. Please try again.',
        );
    }

    invalidateExperienceViews();
    return nextState(previousState, 'success', 'Experience updated successfully.');
}

export async function deleteExperience(
    experienceId: string,
    previousState: ExperienceActionState,
    _formData: FormData,
): Promise<ExperienceActionState> {
    await requireUser();

    if (!isExperienceId(experienceId)) {
        return nextState(previousState, 'error', 'Unable to identify this experience.');
    }

    const supabase = await createClient();
    const { data: existingExperience, error: readError } = await supabase
        .from('experiences')
        .select('id')
        .eq('id', experienceId)
        .maybeSingle();

    if (readError || !existingExperience) {
        if (readError) logMutationFailure('delete', readError);
        return nextState(
            previousState,
            'error',
            'This experience could not be found. Refresh and try again.',
        );
    }

    const { data: deletedExperience, error } = await supabase
        .from('experiences')
        .delete()
        .eq('id', experienceId)
        .select('id')
        .maybeSingle();

    if (error || !deletedExperience) {
        logMutationFailure('delete', error ?? { code: 'no_row_deleted' });
        return nextState(
            previousState,
            'error',
            'Unable to delete the experience right now. Please try again.',
        );
    }

    invalidateExperienceViews();
    return nextState(previousState, 'success', 'Experience deleted successfully.');
}
