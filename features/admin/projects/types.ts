import type { Database } from '@/lib/models/database.types';

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export interface PublicProjectDto {
    id: string;
    title: string;
    category: string;
    description: string;
    imageUrl: string | null;
    imageAlt: string | null;
    githubUrl: string | null;
    tags: string[];
}

export interface AdminProjectDto extends PublicProjectDto {
    slug: string;
    hasImage: boolean;
    isPublished: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
}

export type ProjectField =
    | 'title'
    | 'slug'
    | 'category'
    | 'description'
    | 'tags'
    | 'displayOrder'
    | 'image'
    | 'imageAlt'
    | 'githubUrl'
    | 'isPublished';

export type ProjectFieldErrors = Partial<Record<ProjectField, string>>;

export interface ProjectActionState {
    status: 'idle' | 'error' | 'success';
    message: string;
    attempt: number;
    fieldErrors: ProjectFieldErrors;
}
