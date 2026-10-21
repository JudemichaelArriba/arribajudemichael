import { fireEvent, render, screen } from '@testing-library/react';

import Projects from '../Projects';
import type { PublicCertificateDto } from '@/features/admin/certificates/types';
import type { PublicProjectDto } from '@/features/admin/projects/types';

// Motion and PDF rendering are out of scope here; only structure and behaviour are tested.
jest.mock('@gsap/react', () => ({ useGSAP: jest.fn() }));
jest.mock('@/components/ui/CertificatePdfPreview/CertificatePdfPreview', () => ({
  __esModule: true,
  default: ({ label }: { label: string }) => <div role="img" aria-label={label} />,
  preloadPdfRuntime: jest.fn(),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const PROJECTS: PublicProjectDto[] = [
  { id: 'p1', title: 'Admission System', category: 'Admission System', description: 'Admissions.', imageUrl: 'https://cdn.example/p1.png', imageAlt: 'Admission screenshot', githubUrl: 'https://github.com/example/admission', tags: ['Angular', 'Laravel', 'MySQL'] },
  { id: 'p2', title: 'Lodgify', category: 'Hotel Booking System', description: 'Bookings.', imageUrl: null, imageAlt: null, githubUrl: null, tags: [] },
];
const CERTIFICATES: PublicCertificateDto[] = [
  { id: 'c1', title: 'Python Essentials 1', issuer: 'Cisco Networking Academy', pdfUrl: 'https://cdn.example/c1.pdf', updatedAt: '2026-10-01T00:00:00Z' },
  { id: 'c2', title: 'Programmer of the Year', issuer: 'Aces Tagum College, Inc.', pdfUrl: 'https://cdn.example/c2.pdf', updatedAt: '2026-10-01T00:00:00Z' },
];

describe('Projects (Direction B)', () => {
  it('shows only projects until the Certificates tab is clicked', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Admission System' })).toBeInTheDocument();
    expect(screen.getByText('Angular · Laravel · MySQL')).toBeInTheDocument();
    expect(screen.queryByText('Python Essentials 1')).not.toBeInTheDocument();

    const projectsButton = screen.getByRole('button', { name: /projects/i });
    const certificatesButton = screen.getByRole('button', { name: /certificates/i });
    expect(projectsButton).toHaveAttribute('aria-pressed', 'true');
    expect(certificatesButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(certificatesButton);
    expect(certificatesButton).toHaveAttribute('aria-pressed', 'true');
    expect(projectsButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: 'Python Essentials 1' })).toBeInTheDocument();
    expect(screen.getByText('Issued by Aces Tagum College, Inc.')).toBeInTheDocument();
    expect(screen.queryByText('Admission System')).not.toBeInTheDocument();
  });

  it('opens repositories and PDFs in a new tab without exposing the opener', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    const repo = screen.getByRole('link', { name: /admission system repository/i });
    expect(repo).toHaveAttribute('href', 'https://github.com/example/admission');
    // A project without a repository shows no dead link.
    expect(screen.queryByRole('link', { name: /lodgify repository/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /certificates/i }));
    const pdf = screen.getByRole('link', { name: /python essentials 1 certificate pdf/i });
    expect(pdf).toHaveAttribute('href', 'https://cdn.example/c1.pdf');
    for (const link of [repo, pdf]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('shows explicit empty and unavailable states', () => {
    render(<Projects projects={[]} certificates={[]} certificatesUnavailable />);

    expect(screen.getByText('Projects are being prepared.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /certificates/i }));
    expect(screen.getByText('Certificates are temporarily unavailable.')).toBeInTheDocument();
  });
});
