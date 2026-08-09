import type {
    Tables,
    TablesInsert,
    TablesUpdate,
} from '@/lib/models/database.types';

export type Experience = Tables<'experiences'>;
export type ExperienceInsert = TablesInsert<'experiences'>;
export type ExperienceUpdate = TablesUpdate<'experiences'>;

export type ExperienceStatus = 'active' | 'complete';

export interface PublicExperienceDto {
    id: string;
    title: string;
    subtitle: string;
    dateLabel: string;
    description: string;
    status: ExperienceStatus;
}

export interface AdminExperienceDto extends PublicExperienceDto {
    isPublished: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
}

export type ExperienceField =
    | 'title'
    | 'subtitle'
    | 'dateLabel'
    | 'description'
    | 'status'
    | 'displayOrder'
    | 'isPublished';

export type ExperienceFieldErrors = Partial<Record<ExperienceField, string>>;

export interface ExperienceActionState {
    status: 'idle' | 'error' | 'success';
    message: string;
    attempt: number;
    fieldErrors: ExperienceFieldErrors;
}
