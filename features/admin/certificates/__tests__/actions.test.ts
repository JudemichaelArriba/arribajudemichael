import { revalidatePath, updateTag } from 'next/cache';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import { deleteCertificate } from '../actions';
import type { CertificateActionState } from '../types';
import { getCertificatePdfPath } from '../validation';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  unstable_cache: jest.fn((callback: unknown) => callback),
  updateTag: jest.fn(),
}));
jest.mock('@/lib/auth/requireUser', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const requireUserMock = jest.mocked(requireUser);
const createClientMock = jest.mocked(createClient);
const INITIAL_STATE: CertificateActionState = {
  attempt: 0,
  fieldErrors: {},
  message: '',
  status: 'idle',
};
const CERTIFICATE_ID = '123e4567-e89b-42d3-a456-426614174000';

function certificateDeleteClient(pdfPath: string | null) {
  const read = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { id: CERTIFICATE_ID, pdf_path: pdfPath },
      error: null,
    }),
  };
  const deleteCall = jest.fn().mockReturnThis();
  const deletion = {
    delete: deleteCall,
    eq: jest.fn().mockResolvedValue({ error: null }),
  };
  const remove = jest.fn().mockResolvedValue({ error: null });
  const client = {
    from: jest.fn().mockReturnValueOnce(read).mockReturnValueOnce(deletion),
    storage: { from: jest.fn(() => ({ remove })) },
  };
  return { client, deleteCall, remove };
}

describe('certificate actions', () => {
  beforeEach(() => {
    requireUserMock.mockResolvedValue({ claims: {}, userId: 'admin-id' } as never);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('authenticates before rejecting an invalid certificate identifier', async () => {
    const result = await deleteCertificate('../certificate.pdf', INITIAL_STATE, new FormData());

    expect(requireUserMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).not.toHaveBeenCalled();
    expect(result.status).toBe('error');
  });

  it('never deletes a browser- or row-supplied noncanonical storage path', async () => {
    const { client, remove } = certificateDeleteClient('certificates/another-id/certificate.pdf');
    createClientMock.mockResolvedValue(client as never);

    const result = await deleteCertificate(CERTIFICATE_ID, INITIAL_STATE, new FormData());

    expect(result.status).toBe('success');
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes the database row before removing the derived canonical PDF', async () => {
    const path = getCertificatePdfPath(CERTIFICATE_ID);
    const { client, deleteCall, remove } = certificateDeleteClient(path);
    createClientMock.mockResolvedValue(client as never);

    const result = await deleteCertificate(CERTIFICATE_ID, INITIAL_STATE, new FormData());

    expect(result.status).toBe('success');
    expect(remove).toHaveBeenCalledWith([path]);
    expect(deleteCall.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
    expect(updateTag).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/certificates');
  });
});
