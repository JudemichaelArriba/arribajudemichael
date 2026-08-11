import { revalidatePath, updateTag } from 'next/cache';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import { createProject, deleteProject } from '../actions';
import { validateProjectFormData } from '../validation';
import type { ProjectActionState } from '../types';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  unstable_cache: jest.fn((callback: unknown) => callback),
  updateTag: jest.fn(),
}));
jest.mock('@/lib/auth/requireUser', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('../validation', () => ({ validateProjectFormData: jest.fn() }));

const requireUserMock = jest.mocked(requireUser);
const createClientMock = jest.mocked(createClient);
const validationMock = jest.mocked(validateProjectFormData);
const INITIAL_STATE: ProjectActionState = {
  attempt: 0,
  fieldErrors: {},
  message: '',
  status: 'idle',
};
const PROJECT_ID = '123e4567-e89b-42d3-a456-426614174000';

describe('project actions', () => {
  beforeEach(() => {
    requireUserMock.mockResolvedValue({ claims: {}, userId: 'admin-id' } as never);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('authenticates before returning validation errors', async () => {
    validationMock.mockResolvedValue({
      fieldErrors: { title: 'Title is required.' },
      success: false,
    });

    const result = await createProject(INITIAL_STATE, new FormData());

    expect(requireUserMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'error', fieldErrors: { title: expect.any(String) } });
  });

  it('removes a newly uploaded image when the database insert fails', async () => {
    const image = new File(['image'], 'project.png', { type: 'image/png' });
    validationMock.mockResolvedValue({
      data: {
        category: 'Web',
        description: 'Description',
        displayOrder: 0,
        githubUrl: 'https://github.com/jude/project',
        image,
        imageAlt: 'Dashboard',
        imageExtension: 'png',
        isPublished: true,
        slug: 'project',
        tags: ['Next.js'],
        title: 'Project',
      },
      success: true,
    });
    const upload = jest.fn().mockResolvedValue({ error: null });
    const remove = jest.fn().mockResolvedValue({ error: null });
    const insert = jest.fn().mockResolvedValue({ error: { code: 'database_error' } });
    createClientMock.mockResolvedValue({
      from: jest.fn(() => ({ insert })),
      storage: { from: jest.fn(() => ({ remove, upload })) },
    } as never);

    const result = await createProject(INITIAL_STATE, new FormData());

    const uploadedPath = upload.mock.calls[0][0] as string;
    expect(remove).toHaveBeenCalledWith([uploadedPath]);
    expect(result).toMatchObject({ status: 'error' });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('deletes the row before best-effort canonical media cleanup', async () => {
    const read = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: PROJECT_ID, image_path: `${PROJECT_ID}/image.webp` },
        error: null,
      }),
    };
    const deleteCall = jest.fn().mockReturnThis();
    const deletion = {
      delete: deleteCall,
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: PROJECT_ID }, error: null }),
    };
    const remove = jest.fn().mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({
      from: jest.fn().mockReturnValueOnce(read).mockReturnValueOnce(deletion),
      storage: { from: jest.fn(() => ({ remove })) },
    } as never);

    const result = await deleteProject(PROJECT_ID, INITIAL_STATE, new FormData());

    expect(result.status).toBe('success');
    expect(remove).toHaveBeenCalledWith([`${PROJECT_ID}/image.webp`]);
    expect(deleteCall.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/projects');
  });
});
