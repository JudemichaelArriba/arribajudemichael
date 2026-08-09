import type { ProjectFieldErrors } from './types';

export const MAX_PROJECT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PROJECT_TAGS = 12;

const PROJECT_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ProjectImageMimeType = (typeof PROJECT_IMAGE_MIME_TYPES)[number];

export interface ValidatedProjectInput {
    title: string;
    slug: string;
    category: string;
    description: string;
    tags: string[];
    displayOrder: number;
    imageAlt: string | null;
    githubUrl: string | null;
    isPublished: boolean;
    image: File | null;
    imageExtension: 'png' | 'jpg' | 'webp' | null;
}

export type ProjectValidationResult =
    | { success: true; data: ValidatedProjectInput }
    | { success: false; fieldErrors: ProjectFieldErrors };

interface ProjectValidationOptions {
    hasExistingImage?: boolean;
    inspectImageSignature?: boolean;
}

function readText(formData: FormData, name: string): string {
    const value = formData.get(name);
    return typeof value === 'string' ? value.trim() : '';
}

function getSelectedImage(formData: FormData): File | null {
    const value = formData.get('image');
    return value instanceof File && value.size > 0 ? value : null;
}

function setLengthError(
    errors: ProjectFieldErrors,
    field: 'title' | 'category' | 'description',
    value: string,
    label: string,
    maximum: number,
) {
    if (!value) {
        errors[field] = `${label} is required.`;
    } else if (value.length > maximum) {
        errors[field] = `${label} must be ${maximum} characters or fewer.`;
    }
}

function parseTags(value: string, errors: ProjectFieldErrors): string[] {
    const tags: string[] = [];
    const seen = new Set<string>();

    for (const rawTag of value.split(',')) {
        const tag = rawTag.trim();
        if (!tag) continue;

        const key = tag.toLocaleLowerCase('en-US');
        if (!seen.has(key)) {
            seen.add(key);
            tags.push(tag);
        }
    }

    if (tags.length > MAX_PROJECT_TAGS) {
        errors.tags = `Use no more than ${MAX_PROJECT_TAGS} tags.`;
    }

    return tags;
}

function normalizeGithubUrl(value: string, errors: ProjectFieldErrors): string | null {
    if (!value) return null;

    try {
        const url = new URL(value);
        const hostname = url.hostname.toLocaleLowerCase('en-US');

        if (
            url.protocol !== 'https:' ||
            (hostname !== 'github.com' && hostname !== 'www.github.com') ||
            url.username ||
            url.password ||
            url.port ||
            url.pathname === '/'
        ) {
            throw new Error('Invalid GitHub URL');
        }

        url.hostname = 'github.com';
        url.hash = '';
        return url.toString();
    } catch {
        errors.githubUrl = 'Enter a valid HTTPS github.com URL.';
        return null;
    }
}

function getImageExtension(mimeType: string): ValidatedProjectInput['imageExtension'] {
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/webp') return 'webp';
    return null;
}

function hasMatchingImageSignature(bytes: Uint8Array, mimeType: ProjectImageMimeType): boolean {
    if (mimeType === 'image/png') {
        const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        return png.every((byte, index) => bytes[index] === byte);
    }

    if (mimeType === 'image/jpeg') {
        return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }

    return (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
    );
}

export function slugifyProjectTitle(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('en-US')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 120)
        .replace(/-+$/g, '');
}

export async function validateProjectFormData(
    formData: FormData,
    options: ProjectValidationOptions = {},
): Promise<ProjectValidationResult> {
    const fieldErrors: ProjectFieldErrors = {};
    const title = readText(formData, 'title');
    const slug = readText(formData, 'slug');
    const category = readText(formData, 'category');
    const description = readText(formData, 'description');
    const imageAltValue = readText(formData, 'imageAlt');
    const githubUrlValue = readText(formData, 'githubUrl');
    const tags = parseTags(readText(formData, 'tags'), fieldErrors);
    const displayOrderValue = readText(formData, 'displayOrder');
    const isPublished = formData.get('isPublished') === 'true';
    const image = getSelectedImage(formData);

    setLengthError(fieldErrors, 'title', title, 'Title', 120);
    setLengthError(fieldErrors, 'category', category, 'Category', 120);
    setLengthError(fieldErrors, 'description', description, 'Description', 2000);

    if (!slug) {
        fieldErrors.slug = 'Slug is required.';
    } else if (slug.length > 120 || !SLUG_PATTERN.test(slug)) {
        fieldErrors.slug = 'Use lowercase letters, numbers, and single hyphens only.';
    }

    if (imageAltValue.length > 255) {
        fieldErrors.imageAlt = 'Image alternative text must be 255 characters or fewer.';
    }

    const displayOrder = Number(displayOrderValue);
    if (
        displayOrderValue === '' ||
        !Number.isSafeInteger(displayOrder) ||
        displayOrder < 0 ||
        displayOrder > 2_147_483_647
    ) {
        fieldErrors.displayOrder = 'Display order must be a non-negative whole number.';
    }

    const githubUrl = normalizeGithubUrl(githubUrlValue, fieldErrors);
    let imageExtension: ValidatedProjectInput['imageExtension'] = null;

    if (image) {
        if (!PROJECT_IMAGE_MIME_TYPES.includes(image.type as ProjectImageMimeType)) {
            fieldErrors.image = 'Choose a PNG, JPEG, or WebP image.';
        } else if (image.size > MAX_PROJECT_IMAGE_BYTES) {
            fieldErrors.image = 'Image size must not exceed 5 MiB.';
        } else {
            imageExtension = getImageExtension(image.type);

            if (options.inspectImageSignature !== false) {
                try {
                    const header = new Uint8Array(await image.slice(0, 16).arrayBuffer());
                    if (!hasMatchingImageSignature(header, image.type as ProjectImageMimeType)) {
                        fieldErrors.image = 'The selected file does not match its image type.';
                        imageExtension = null;
                    }
                } catch {
                    fieldErrors.image = 'The selected image could not be inspected.';
                    imageExtension = null;
                }
            }
        }
    }

    if (isPublished) {
        if (!image && !options.hasExistingImage) {
            fieldErrors.image = 'A project image is required before publishing.';
        }
        if (!imageAltValue) {
            fieldErrors.imageAlt = 'Image alternative text is required before publishing.';
        }
        if (!githubUrlValue) {
            fieldErrors.githubUrl = 'A GitHub URL is required before publishing.';
        }
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { success: false, fieldErrors };
    }

    return {
        success: true,
        data: {
            title,
            slug,
            category,
            description,
            tags,
            displayOrder,
            imageAlt: imageAltValue || null,
            githubUrl,
            isPublished,
            image,
            imageExtension,
        },
    };
}
