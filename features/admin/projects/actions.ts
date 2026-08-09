'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, updateTag } from 'next/cache';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import type {
    ProjectActionState,
    ProjectFieldErrors,
    ProjectInsert,
    ProjectUpdate,
} from './types';
import { PROJECT_MEDIA_BUCKET, PROJECTS_CACHE_TAG } from './queries';
import { validateProjectFormData } from './validation';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nextState(
    previousState: ProjectActionState,
    status: ProjectActionState['status'],
    message: string,
    fieldErrors: ProjectFieldErrors = {},
): ProjectActionState {
    return {
        status,
        message,
        fieldErrors,
        attempt: previousState.attempt + 1,
    };
}

function getErrorCode(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('code' in error)) return 'unknown';
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : 'unknown';
}

function logMutationFailure(
    operation: 'create' | 'update' | 'delete' | 'upload' | 'cleanup',
    error: unknown,
) {
    console.error(`[projects/${operation}] Operation failed.`, {
        code: getErrorCode(error),
    });
}

function invalidateProjectViews() {
    updateTag(PROJECTS_CACHE_TAG);
    revalidatePath('/');
    revalidatePath('/dashboard/projects');
}

async function removeProjectImage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    imagePath: string | null,
) {
    if (!imagePath) return;
    const { error } = await supabase.storage.from(PROJECT_MEDIA_BUCKET).remove([imagePath]);
    if (error) logMutationFailure('cleanup', error);
}

async function uploadProjectImage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    projectId: string,
    image: File,
    extension: 'png' | 'jpg' | 'webp',
): Promise<{ imagePath: string | null; error: unknown | null }> {
    const imagePath = `${projectId}/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage
        .from(PROJECT_MEDIA_BUCKET)
        .upload(imagePath, image, {
            cacheControl: '3600',
            contentType: image.type,
            upsert: false,
        });

    if (error) {
        logMutationFailure('upload', error);
        return { imagePath: null, error };
    }

    return { imagePath, error: null };
}

function writeFailureState(
    previousState: ProjectActionState,
    operation: 'create' | 'update',
    error: unknown,
): ProjectActionState {
    logMutationFailure(operation, error);

    if (getErrorCode(error) === '23505') {
        return nextState(previousState, 'error', 'Review the highlighted field.', {
            slug: 'This slug is already in use.',
        });
    }

    return nextState(
        previousState,
        'error',
        `Unable to ${operation} the project right now. Please try again.`,
    );
}

export async function createProject(
    previousState: ProjectActionState,
    formData: FormData,
): Promise<ProjectActionState> {
    await requireUser();
    const validation = await validateProjectFormData(formData);

    if (!validation.success) {
        return nextState(previousState, 'error', 'Review the highlighted fields.', validation.fieldErrors);
    }

    const supabase = await createClient();
    const projectId = randomUUID();
    let imagePath: string | null = null;

    if (validation.data.image && validation.data.imageExtension) {
        const upload = await uploadProjectImage(
            supabase,
            projectId,
            validation.data.image,
            validation.data.imageExtension,
        );

        if (upload.error || !upload.imagePath) {
            return nextState(
                previousState,
                'error',
                'Unable to upload the project image right now. Please try again.',
                { image: 'The image could not be uploaded.' },
            );
        }
        imagePath = upload.imagePath;
    }

    const insert: ProjectInsert = {
        id: projectId,
        title: validation.data.title,
        slug: validation.data.slug,
        category: validation.data.category,
        description: validation.data.description,
        tags: validation.data.tags,
        display_order: validation.data.displayOrder,
        image_alt: validation.data.imageAlt,
        image_path: imagePath,
        github_url: validation.data.githubUrl,
        is_published: validation.data.isPublished,
    };

    const { error } = await supabase.from('projects').insert(insert);
    if (error) {
        await removeProjectImage(supabase, imagePath);
        return writeFailureState(previousState, 'create', error);
    }

    invalidateProjectViews();
    return nextState(previousState, 'success', 'Project created successfully.');
}

export async function updateProject(
    projectId: string,
    previousState: ProjectActionState,
    formData: FormData,
): Promise<ProjectActionState> {
    await requireUser();

    if (!UUID_PATTERN.test(projectId)) {
        return nextState(previousState, 'error', 'Unable to identify this project.');
    }

    const supabase = await createClient();
    const { data: existingProject, error: readError } = await supabase
        .from('projects')
        .select('id,image_path')
        .eq('id', projectId)
        .maybeSingle();

    if (readError || !existingProject) {
        if (readError) logMutationFailure('update', readError);
        return nextState(previousState, 'error', 'This project could not be found. Refresh and try again.');
    }

    const validation = await validateProjectFormData(formData, {
        hasExistingImage: Boolean(existingProject.image_path),
    });

    if (!validation.success) {
        return nextState(previousState, 'error', 'Review the highlighted fields.', validation.fieldErrors);
    }

    let nextImagePath = existingProject.image_path;
    let uploadedImagePath: string | null = null;

    if (validation.data.image && validation.data.imageExtension) {
        const upload = await uploadProjectImage(
            supabase,
            projectId,
            validation.data.image,
            validation.data.imageExtension,
        );

        if (upload.error || !upload.imagePath) {
            return nextState(
                previousState,
                'error',
                'Unable to upload the project image right now. Please try again.',
                { image: 'The image could not be uploaded.' },
            );
        }

        nextImagePath = upload.imagePath;
        uploadedImagePath = upload.imagePath;
    }

    const update: ProjectUpdate = {
        title: validation.data.title,
        slug: validation.data.slug,
        category: validation.data.category,
        description: validation.data.description,
        tags: validation.data.tags,
        display_order: validation.data.displayOrder,
        image_alt: validation.data.imageAlt,
        image_path: nextImagePath,
        github_url: validation.data.githubUrl,
        is_published: validation.data.isPublished,
    };

    const { data: updatedProject, error } = await supabase
        .from('projects')
        .update(update)
        .eq('id', projectId)
        .select('id')
        .maybeSingle();
    if (error) {
        await removeProjectImage(supabase, uploadedImagePath);
        return writeFailureState(previousState, 'update', error);
    }

    if (!updatedProject) {
        await removeProjectImage(supabase, uploadedImagePath);
        logMutationFailure('update', { code: 'no_row_updated' });
        return nextState(previousState, 'error', 'This project could not be found. Refresh and try again.');
    }

    if (uploadedImagePath && existingProject.image_path !== uploadedImagePath) {
        await removeProjectImage(supabase, existingProject.image_path);
    }

    invalidateProjectViews();
    return nextState(previousState, 'success', 'Project updated successfully.');
}

export async function deleteProject(
    projectId: string,
    previousState: ProjectActionState,
    _formData: FormData,
): Promise<ProjectActionState> {
    await requireUser();

    if (!UUID_PATTERN.test(projectId)) {
        return nextState(previousState, 'error', 'Unable to identify this project.');
    }

    const supabase = await createClient();
    const { data: existingProject, error: readError } = await supabase
        .from('projects')
        .select('id,image_path')
        .eq('id', projectId)
        .maybeSingle();

    if (readError || !existingProject) {
        if (readError) logMutationFailure('delete', readError);
        return nextState(previousState, 'error', 'This project could not be found. Refresh and try again.');
    }

    const { data: deletedProject, error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .select('id')
        .maybeSingle();
    if (error) {
        logMutationFailure('delete', error);
        return nextState(
            previousState,
            'error',
            'Unable to delete the project right now. Please try again.',
        );
    }


    if (!deletedProject) {
        logMutationFailure('delete', { code: 'no_row_deleted' });
        return nextState(previousState, 'error', 'This project could not be found. Refresh and try again.');
    }

    await removeProjectImage(supabase, existingProject.image_path);
    invalidateProjectViews();
    return nextState(previousState, 'success', 'Project deleted successfully.');
}
