import {
  getCertificatePdfPath,
  hasPdfSignature,
  isCertificatePdfPath,
  validateCertificateFormData,
  validateCertificatePdf,
} from '@/features/admin/certificates/validation';
import { validateExperienceFormData } from '@/features/admin/experiences/validation';
import {
  MAX_PROJECT_IMAGE_BYTES,
  slugifyProjectTitle,
  validateProjectFormData,
} from '@/features/admin/projects/validation';

const VALID_ID = '123e4567-e89b-42d3-a456-426614174000';

function setFields(values: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

function validProjectForm(): FormData {
  return setFields({
    category: 'Web application',
    description: 'A production portfolio project.',
    displayOrder: '2',
    githubUrl: 'https://www.github.com/jude/project#readme',
    imageAlt: 'Project dashboard',
    isPublished: 'false',
    slug: 'portfolio-project',
    tags: 'Next.js, TypeScript, next.JS,  Supabase ',
    title: 'Portfolio Project',
  });
}

function validCertificateForm(): FormData {
  return setFields({
    displayOrder: '1',
    issuer: 'Cisco Networking Academy',
    isPublished: 'false',
    pdfChanged: 'false',
    slug: 'ai-fundamentals',
    title: 'AI Fundamentals',
  });
}

function validExperienceForm(): FormData {
  return setFields({
    dateLabel: '2025 - Present',
    description: 'Built and maintained production systems.',
    displayOrder: '0',
    isPublished: 'true',
    status: 'active',
    subtitle: 'Example Company',
    title: 'Software Engineer',
  });
}

describe('project validation', () => {
  it('normalizes valid data and deduplicates tags case-insensitively', async () => {
    await expect(validateProjectFormData(validProjectForm())).resolves.toEqual({
      data: expect.objectContaining({
        displayOrder: 2,
        githubUrl: 'https://github.com/jude/project',
        tags: ['Next.js', 'TypeScript', 'Supabase'],
      }),
      success: true,
    });
  });

  it('requires publication assets without requiring them for a draft', async () => {
    const published = validProjectForm();
    published.set('isPublished', 'true');
    published.delete('imageAlt');
    published.delete('githubUrl');

    const result = await validateProjectFormData(published);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toMatchObject({
        githubUrl: expect.any(String),
        image: expect.any(String),
        imageAlt: expect.any(String),
      });
    }
  });

  it.each([
    ['slug', 'Invalid Slug'],
    ['displayOrder', '-1'],
    ['githubUrl', 'https://github.com.evil.example/jude/project'],
  ])('rejects unsafe %s values', async (field, value) => {
    const formData = validProjectForm();
    formData.set(field, value);

    const result = await validateProjectFormData(formData);

    expect(result.success).toBe(false);
  });

  it('checks image MIME, size, and signature independently of the filename', async () => {
    const formData = validProjectForm();
    const file = new File([new Uint8Array(MAX_PROJECT_IMAGE_BYTES + 1)], 'project.png', {
      type: 'image/png',
    });
    formData.set('image', file);

    const oversized = await validateProjectFormData(formData);
    expect(oversized.success).toBe(false);

    const mismatched = validProjectForm();
    const invalidPng = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], 'project.png', {
      type: 'image/png',
    });
    mismatched.set('image', invalidPng);
    const invalid = await validateProjectFormData(mismatched);
    expect(invalid.success).toBe(false);
  });

  it('generates stable lowercase slugs from display titles', () => {
    expect(slugifyProjectTitle('  Déjà Vu: API + UI  ')).toBe('deja-vu-api-ui');
  });
});

describe('certificate validation', () => {
  it('accepts normalized draft metadata and rejects publishing without a verified PDF', () => {
    expect(validateCertificateFormData(validCertificateForm())).toMatchObject({ success: true });

    const published = validCertificateForm();
    published.set('isPublished', 'true');
    const result = validateCertificateFormData(published);
    expect(result).toEqual({
      fieldErrors: { pdf: 'A verified PDF is required before publishing.' },
      success: false,
    });
  });

  it('accepts only the canonical PDF path derived from the certificate UUID', () => {
    const canonical = getCertificatePdfPath(VALID_ID);

    expect(canonical).toBe(`certificates/${VALID_ID}/certificate.pdf`);
    expect(isCertificatePdfPath(canonical, VALID_ID)).toBe(true);
    expect(isCertificatePdfPath('certificates/other/certificate.pdf', VALID_ID)).toBe(false);
    expect(isCertificatePdfPath('../certificate.pdf', VALID_ID)).toBe(false);
  });

  it('validates both PDF MIME and file signature', async () => {
    const validHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    expect(hasPdfSignature(validHeader)).toBe(true);

    const wrongType = new File([validHeader], 'certificate.pdf', { type: 'text/plain' });
    await expect(validateCertificatePdf(wrongType)).resolves.toBe('Choose a PDF file.');

    const invalidPdf = new File([new Uint8Array([1, 2, 3, 4, 5])], 'certificate.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(invalidPdf, 'slice', {
      value: () => ({
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4, 5]).buffer,
      }),
    });
    await expect(validateCertificatePdf(invalidPdf)).resolves.toBe(
      'The selected file is not a valid PDF.',
    );
  });
});

describe('experience validation', () => {
  it('normalizes a complete experience payload', () => {
    expect(validateExperienceFormData(validExperienceForm())).toEqual({
      data: {
        dateLabel: '2025 - Present',
        description: 'Built and maintained production systems.',
        displayOrder: 0,
        isPublished: true,
        status: 'active',
        subtitle: 'Example Company',
        title: 'Software Engineer',
      },
      success: true,
    });
  });

  it.each([
    ['status', 'paused'],
    ['displayOrder', '1.5'],
    ['isPublished', 'yes'],
    ['title', ''],
  ])('rejects invalid %s input', (field, value) => {
    const formData = validExperienceForm();
    formData.set(field, value);

    expect(validateExperienceFormData(formData).success).toBe(false);
  });
});
