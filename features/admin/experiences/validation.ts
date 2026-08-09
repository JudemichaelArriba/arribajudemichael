import type {
    ExperienceFieldErrors,
    ExperienceStatus,
} from './types';

export const EXPERIENCE_TITLE_MAX_LENGTH = 150;
export const EXPERIENCE_SUBTITLE_MAX_LENGTH = 120;
export const EXPERIENCE_DATE_LABEL_MAX_LENGTH = 50;
export const EXPERIENCE_DESCRIPTION_MAX_LENGTH = 1_000;
export const EXPERIENCE_DISPLAY_ORDER_MAX = 2_147_483_647;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ValidatedExperienceInput {
    title: string;
    subtitle: string;
    dateLabel: string;
    description: string;
    status: ExperienceStatus;
    displayOrder: number;
    isPublished: boolean;
}

export type ExperienceValidationResult =
    | { success: true; data: ValidatedExperienceInput }
    | { success: false; fieldErrors: ExperienceFieldErrors };

function readText(formData: FormData, name: string): string {
    const value = formData.get(name);
    return typeof value === 'string' ? value.trim() : '';
}

function validateRequiredText(
    errors: ExperienceFieldErrors,
    field: 'title' | 'subtitle' | 'dateLabel' | 'description',
    value: string,
    label: string,
    maximumLength: number,
) {
    if (!value) {
        errors[field] = `${label} is required.`;
    } else if (value.length > maximumLength) {
        errors[field] = `${label} must be ${maximumLength} characters or fewer.`;
    }
}

export function isExperienceId(value: string): boolean {
    return UUID_PATTERN.test(value);
}

export function isExperienceStatus(value: unknown): value is ExperienceStatus {
    return value === 'active' || value === 'complete';
}

export function validateExperienceFormData(
    formData: FormData,
): ExperienceValidationResult {
    const fieldErrors: ExperienceFieldErrors = {};
    const title = readText(formData, 'title');
    const subtitle = readText(formData, 'subtitle');
    const dateLabel = readText(formData, 'dateLabel');
    const description = readText(formData, 'description');
    const statusValue = readText(formData, 'status');
    const displayOrderValue = readText(formData, 'displayOrder');
    const publishedValue = readText(formData, 'isPublished');

    validateRequiredText(
        fieldErrors,
        'title',
        title,
        'Title',
        EXPERIENCE_TITLE_MAX_LENGTH,
    );
    validateRequiredText(
        fieldErrors,
        'subtitle',
        subtitle,
        'Subtitle',
        EXPERIENCE_SUBTITLE_MAX_LENGTH,
    );
    validateRequiredText(
        fieldErrors,
        'dateLabel',
        dateLabel,
        'Date label',
        EXPERIENCE_DATE_LABEL_MAX_LENGTH,
    );
    validateRequiredText(
        fieldErrors,
        'description',
        description,
        'Description',
        EXPERIENCE_DESCRIPTION_MAX_LENGTH,
    );

    const status = isExperienceStatus(statusValue) ? statusValue : null;
    if (!status) {
        fieldErrors.status = 'Choose either Active or Complete.';
    }

    const displayOrder = Number(displayOrderValue);
    if (
        displayOrderValue === '' ||
        !Number.isSafeInteger(displayOrder) ||
        displayOrder < 0 ||
        displayOrder > EXPERIENCE_DISPLAY_ORDER_MAX
    ) {
        fieldErrors.displayOrder = 'Display order must be a non-negative whole number.';
    }

    const isPublished = publishedValue === 'true';
    if (publishedValue !== 'true' && publishedValue !== 'false') {
        fieldErrors.isPublished = 'Choose whether this experience is published.';
    }

    if (Object.keys(fieldErrors).length > 0 || !status) {
        return { success: false, fieldErrors };
    }

    return {
        success: true,
        data: {
            title,
            subtitle,
            dateLabel,
            description,
            status,
            displayOrder,
            isPublished,
        },
    };
}
