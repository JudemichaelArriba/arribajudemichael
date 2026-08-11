import { revalidatePath, updateTag } from 'next/cache';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import { createExperience, deleteExperience } from '../actions';
import type { ExperienceActionState } from '../types';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  unstable_cache: jest.fn((callback: unknown) => callback),
  updateTag: jest.fn(),
}));
jest.mock('@/lib/auth/requireUser', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const requireUserMock = jest.mocked(requireUser);
const createClientMock = jest.mocked(createClient);
const INITIAL_STATE: ExperienceActionState = {
  attempt: 0,
  fieldErrors: {},
  message: '',
  status: 'idle',
};

function validExperienceForm(): FormData {
  const formData = new FormData();
  formData.set('title', 'Software Engineer');
  formData.set('subtitle', 'Example Company');
  formData.set('dateLabel', '2025 - Present');
  formData.set('description', 'Built production systems.');
  formData.set('status', 'active');
  formData.set('displayOrder', '2');
  formData.set('isPublished', 'true');
  return formData;
}

describe('experience actions', () => {
  beforeEach(() => {
    requireUserMock.mockResolvedValue({ claims: {}, userId: 'admin-id' } as never);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('authenticates before rejecting an invalid mutation identifier', async () => {
    const result = await deleteExperience('not-a-uuid', INITIAL_STATE, new FormData());

    expect(requireUserMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).not.toHaveBeenCalled();
    expect(result.status).toBe('error');
  });

  it('writes only validated fields and invalidates public and admin views', async () => {
    const insert = jest.fn().mockReturnThis();
    const select = jest.fn().mockReturnThis();
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'experience-id' }, error: null });
    createClientMock.mockResolvedValue({
      from: jest.fn(() => ({ insert, maybeSingle, select })),
    } as never);

    const result = await createExperience(INITIAL_STATE, validExperienceForm());

    expect(result.status).toBe('success');
    expect(insert).toHaveBeenCalledWith({
      date_label: '2025 - Present',
      description: 'Built production systems.',
      display_order: 2,
      is_published: true,
      status: 'active',
      subtitle: 'Example Company',
      title: 'Software Engineer',
    });
    expect(updateTag).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/experiences');
  });

  it('does not create a database client for invalid form data', async () => {
    const result = await createExperience(INITIAL_STATE, new FormData());

    expect(result.status).toBe('error');
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
