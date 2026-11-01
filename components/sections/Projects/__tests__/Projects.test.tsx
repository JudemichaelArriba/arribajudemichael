import { act, fireEvent, render, screen, within } from '@testing-library/react';

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
  { id: 'p3', title: 'Clinic Queue', category: 'Queue System', description: 'Queues.', imageUrl: 'https://cdn.example/p3.png', imageAlt: 'Clinic screenshot', githubUrl: 'https://github.com/example/clinic', tags: ['React'] },
];
const CERTIFICATES: PublicCertificateDto[] = [
  { id: 'c1', title: 'Python Essentials 1', issuer: 'Cisco Networking Academy', pdfUrl: 'https://cdn.example/c1.pdf', updatedAt: '2026-10-01T00:00:00Z' },
  { id: 'c2', title: 'Programmer of the Year', issuer: 'Aces Tagum College, Inc.', pdfUrl: 'https://cdn.example/c2.pdf', updatedAt: '2026-10-01T00:00:00Z' },
];

function expectNewTab(link: HTMLElement) {
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
}

const projectList = () => screen.getByRole('list', { name: 'Projects' });
const projectItem = (title: string) => within(projectList()).getByRole('heading', { name: title }).closest('li') as HTMLElement;

describe('Projects reel', () => {
  it('labels the section with its heading and lists every project for assistive technology', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    expect(screen.getByRole('region', { name: 'Projects' })).toHaveAttribute('id', 'projects');
    const items = within(projectList()).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('Angular · Laravel · MySQL')).toBeInTheDocument();
    expect(within(items[0]).getByText('Admissions.')).toBeInTheDocument();
    // The strip only repeats the screenshots, so it stays out of the accessibility tree.
    expect(document.querySelector('[data-reel-viewport]')).toHaveAttribute('aria-hidden', 'true');
    expect(document.querySelectorAll('[data-reel-frame]')).toHaveLength(3);
  });

  it('describes the first project under the playhead until another is chosen on the ruler', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    expect(projectItem('Admission System')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Show Admission System' })).toHaveAttribute('aria-current', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Show Clinic Queue' }));
    expect(projectItem('Clinic Queue')).toHaveAttribute('aria-current', 'true');
    expect(projectItem('Admission System')).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Show Clinic Queue' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Show Admission System' })).not.toHaveAttribute('aria-current');
  });

  it('brings a project under the playhead when keyboard focus reaches its link', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    const link = screen.getByRole('link', { name: /clinic queue repository/i });
    act(() => link.focus());
    expect(projectItem('Clinic Queue')).toHaveAttribute('aria-current', 'true');
  });

  it('opens repositories in a new tab and shows no dead link for a project without one', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    const repo = screen.getByRole('link', { name: /admission system repository/i });
    expect(repo).toHaveAttribute('href', 'https://github.com/example/admission');
    expectNewTab(repo);
    expect(within(projectItem('Lodgify')).queryByRole('link')).not.toBeInTheDocument();
    // An empty stack is left out instead of showing an empty label.
    expect(within(projectItem('Lodgify')).queryByText('Stack')).not.toBeInTheDocument();
  });

  it('numbers every frame against the total', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    expect(screen.getByText('Project 01 / 03')).toBeInTheDocument();
    expect(screen.getByText('Project 03 / 03')).toBeInTheDocument();
  });

  it('does not set up a scrolling reel for a single project', () => {
    render(<Projects projects={PROJECTS.slice(0, 1)} certificates={CERTIFICATES} />);

    expect(within(projectList()).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText(/scroll or drag the strip/i)).not.toBeInTheDocument();
    expect(document.querySelector('[data-reel-viewport]')?.className).not.toMatch(/reel-pin:/);
  });

  it('shows explicit empty and unavailable states instead of the reel', () => {
    const { rerender } = render(<Projects projects={[]} certificates={CERTIFICATES} />);
    expect(screen.getByText('Projects are being prepared.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Projects' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Projects' })).toBeInTheDocument();

    rerender(<Projects projects={PROJECTS} certificates={CERTIFICATES} projectsUnavailable />);
    expect(screen.getByText('Projects are temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Projects' })).not.toBeInTheDocument();
  });
});

describe('Certificates below the reel', () => {
  it('shows certificates as a contact sheet on phones and tablets, each opening its PDF', () => {
    render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

    const pdf = screen.getByRole('link', { name: /python essentials 1 certificate pdf/i });
    expect(pdf).toHaveAttribute('href', 'https://cdn.example/c1.pdf');
    expectNewTab(pdf);
    expect(within(pdf).getByRole('heading', { name: 'Python Essentials 1' })).toBeInTheDocument();
    expect(within(pdf).getByRole('img', { name: 'Python Essentials 1 first-page preview' })).toBeInTheDocument();
  });

  it('keeps the projects visible when certificates are unavailable', () => {
    render(<Projects projects={PROJECTS} certificates={[]} certificatesUnavailable />);

    expect(screen.getByText('Certificates are temporarily unavailable.')).toBeInTheDocument();
    expect(within(projectList()).getAllByRole('listitem')).toHaveLength(3);
  });

  describe('on desktop', () => {
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

    it('previews the selected certificate with its issuer and PDF link', () => {
      render(<Projects projects={PROJECTS} certificates={CERTIFICATES} />);

      fireEvent.click(screen.getByRole('button', { name: /programmer of the year/i }));
      // The issuer already ends with a full stop; the sentence keeps exactly one.
      expect(screen.getAllByText('Issued by Aces Tagum College, Inc.').length).toBeGreaterThan(0);
      const pdf = screen.getByRole('link', { name: /programmer of the year certificate pdf/i });
      expect(pdf).toHaveAttribute('href', 'https://cdn.example/c2.pdf');
      expectNewTab(pdf);
    });
  });
});
