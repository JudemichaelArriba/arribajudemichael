import { fireEvent, render, screen, within } from '@testing-library/react';

import Projects from '../Projects';
import type { PublicCertificateDto } from '@/features/admin/certificates/types';
import type { PublicProjectDto } from '@/features/admin/projects/types';
import { DESKTOP_QUERY } from '@/lib/breakpoints';

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

function expectNewTab(link: HTMLElement) {
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
}

describe('Projects showcase tabs', () => {
  it('shows one panel at a time and switches with a click or the arrow keys', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    const projectsTab = screen.getByRole('tab', { name: /projects/i });
    const certificatesTab = screen.getByRole('tab', { name: /certificates/i });
    expect(projectsTab).toHaveAttribute('aria-selected', 'true');
    expect(certificatesTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', projectsTab.id);
    expect(screen.queryByText('Python Essentials 1')).not.toBeInTheDocument();

    fireEvent.click(certificatesTab);
    expect(certificatesTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Python Essentials 1' })).toBeInTheDocument();
    expect(screen.queryByText('Lodgify')).not.toBeInTheDocument();

    fireEvent.keyDown(certificatesTab, { key: 'ArrowRight' });
    expect(projectsTab).toHaveAttribute('aria-selected', 'true');
    expect(projectsTab).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Lodgify' })).toBeInTheDocument();
  });

  it('shows explicit empty and unavailable states', () => {
    render(<Projects projects={[]} certificates={[]} certificatesUnavailable />);

    expect(screen.getByText('Projects are being prepared.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /certificates/i }));
    expect(screen.getByText('Certificates are temporarily unavailable.')).toBeInTheDocument();
  });
});

describe('Projects showcase on phones and tablets', () => {
  it('lists every project in full, with its stack and repository', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Admission System' })).toBeInTheDocument();
    expect(screen.getByText('Angular · Laravel · MySQL')).toBeInTheDocument();
    expect(screen.getByText('Bookings.')).toBeInTheDocument();

    const repo = screen.getByRole('link', { name: /admission system repository/i });
    expect(repo).toHaveAttribute('href', 'https://github.com/example/admission');
    expectNewTab(repo);
    // A project without a repository shows no dead link.
    expect(screen.queryByRole('link', { name: /lodgify repository/i })).not.toBeInTheDocument();
  });

  it('shows certificates as a contact sheet whose cards open the PDF', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);
    fireEvent.click(screen.getByRole('tab', { name: /certificates/i }));

    expect(screen.getAllByRole('article')).toHaveLength(2);
    const pdf = screen.getByRole('link', { name: /python essentials 1 certificate pdf/i });
    expect(pdf).toHaveAttribute('href', 'https://cdn.example/c1.pdf');
    expectNewTab(pdf);
    expect(within(pdf).getByRole('heading', { name: 'Python Essentials 1' })).toBeInTheDocument();
    expect(within(pdf).getByRole('img', { name: 'Python Essentials 1 first-page preview' })).toBeInTheDocument();
  });
});

describe('Projects showcase on desktop', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === DESKTOP_QUERY,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('previews the selected project and moves the selection with click and arrow keys', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    const admission = screen.getByRole('button', { name: /admission system/i });
    const lodgify = screen.getByRole('button', { name: /lodgify/i });
    expect(admission).toHaveAttribute('aria-current', 'true');
    expect(lodgify).not.toHaveAttribute('aria-current');
    // Only the selected item's caption is exposed, so there is exactly one action to reach.
    expect(screen.getByRole('link', { name: /admission system repository/i })).toHaveAttribute('href', 'https://github.com/example/admission');

    fireEvent.click(lodgify);
    expect(lodgify).toHaveAttribute('aria-current', 'true');
    expect(admission).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('link', { name: /repository/i })).not.toBeInTheDocument();

    fireEvent.keyDown(lodgify, { key: 'ArrowUp' });
    expect(admission).toHaveFocus();
    expect(admission).toHaveAttribute('aria-current', 'true');
    expectNewTab(screen.getByRole('link', { name: /admission system repository/i }));
  });

  it('previews certificates with their issuer and PDF link', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);
    fireEvent.click(screen.getByRole('tab', { name: /certificates/i }));

    fireEvent.click(screen.getByRole('button', { name: /programmer of the year/i }));
    // The issuer already ends with a full stop; the sentence keeps exactly one.
    expect(screen.getAllByText('Issued by Aces Tagum College, Inc.').length).toBeGreaterThan(0);
    const pdf = screen.getByRole('link', { name: /programmer of the year certificate pdf/i });
    expect(pdf).toHaveAttribute('href', 'https://cdn.example/c2.pdf');
    expectNewTab(pdf);
    expect(screen.getByRole('img', { name: 'Programmer of the Year first-page preview' })).toBeInTheDocument();
  });
});
