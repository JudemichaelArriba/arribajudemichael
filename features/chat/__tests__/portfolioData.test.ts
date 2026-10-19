import { getPublishedCertificates } from '@/features/admin/certificates/queries';
import { getPublicExperiences } from '@/features/admin/experiences/queries';
import { getPublishedProjects } from '@/features/admin/projects/queries';
import {
  MAX_TOOL_PROJECTS,
  listCertificatesForChat,
  listExperiencesForChat,
  listProjectsForChat,
} from '../portfolioData';

jest.mock('@/features/admin/projects/queries', () => ({ getPublishedProjects: jest.fn() }));
jest.mock('@/features/admin/experiences/queries', () => ({ getPublicExperiences: jest.fn() }));
jest.mock('@/features/admin/certificates/queries', () => ({ getPublishedCertificates: jest.fn() }));
jest.mock('@/lib/supabase/system', () => {
  throw new Error('The chat must never load the secret-key Supabase client.');
});

const projectsMock = jest.mocked(getPublishedProjects);
const experiencesMock = jest.mocked(getPublicExperiences);
const certificatesMock = jest.mocked(getPublishedCertificates);

const STORAGE_URL = 'https://abcdefgh.supabase.co/storage/v1/object/public/project-media/a.webp';

describe('portfolio data for the assistant', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exposes only public project fields, without ids or storage URLs, capped in count', async () => {
    projectsMock.mockResolvedValue(
      Array.from({ length: MAX_TOOL_PROJECTS + 5 }, (_, index) => ({
        id: `id-${index}`,
        title: `Project ${index}`,
        category: 'Web',
        description: 'A project.',
        imageUrl: STORAGE_URL,
        imageAlt: 'Screenshot',
        githubUrl: index === 0 ? 'https://github.com/JudemichaelArriba/portfolio' : 'https://evil.example/repo',
        tags: ['Next.js'],
      })),
    );

    const result = await listProjectsForChat();

    expect('items' in result && result.items).toHaveLength(MAX_TOOL_PROJECTS);
    expect(JSON.stringify(result)).not.toMatch(/supabase|id-0|Screenshot/);
    if ('items' in result) {
      expect(result.items[0]).toEqual({
        title: 'Project 0',
        category: 'Web',
        description: 'A project.',
        tags: ['Next.js'],
        githubUrl: 'https://github.com/JudemichaelArriba/portfolio',
      });
      expect(result.items[1].githubUrl).toBeNull();
    }
  });

  it('strips certificate PDF URLs and experience ids', async () => {
    certificatesMock.mockResolvedValue([
      { id: 'c1', title: 'Cert', issuer: 'Issuer', pdfUrl: STORAGE_URL, updatedAt: '2026-01-01' },
    ]);
    experiencesMock.mockResolvedValue([
      { id: 'e1', title: 'Engineer', subtitle: 'Company', dateLabel: '2025', description: 'Work.', status: 'active' },
    ]);

    await expect(listCertificatesForChat()).resolves.toEqual({ items: [{ title: 'Cert', issuer: 'Issuer' }] });
    await expect(listExperiencesForChat()).resolves.toEqual({
      items: [{ title: 'Engineer', subtitle: 'Company', dateLabel: '2025', description: 'Work.', status: 'active' }],
    });
  });

  it('reports unavailable data instead of throwing', async () => {
    projectsMock.mockRejectedValue(new Error('db down'));

    await expect(listProjectsForChat()).resolves.toEqual({ unavailable: true });
  });
});
