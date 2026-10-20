import { detectAnswerSections, formatPortfolioRecords, type PortfolioRecords } from '../records';

jest.mock('@/features/admin/projects/queries', () => ({ getPublishedProjects: jest.fn() }));
jest.mock('@/features/admin/experiences/queries', () => ({ getPublicExperiences: jest.fn() }));
jest.mock('@/features/admin/certificates/queries', () => ({ getPublishedCertificates: jest.fn() }));

const records: PortfolioRecords = {
  projects: {
    items: [
      {
        title: 'Admission System',
        category: 'Admission System',
        description: 'Admission website using Angular and Laravel.',
        tags: ['Angular', 'Laravel', 'MySQL'],
        githubUrl: 'https://github.com/JudemichaelArriba/admission-web',
      },
    ],
  },
  experiences: {
    items: [
      {
        title: 'Innovathon 2026 Grand Winner',
        subtitle: 'PARTICIPATED AND WON',
        dateLabel: 'September 2026',
        description: 'Our team pitched a concept and was named the winners.',
        status: 'complete',
      },
    ],
  },
  certificates: { items: [{ title: 'Python Essentials 1', issuer: 'Cisco Networking Academy' }] },
};

describe('formatPortfolioRecords', () => {
  it('lists every record with exact titles and states that each list is complete', () => {
    const block = formatPortfolioRecords(records);

    expect(block).toContain('## Projects (complete list: 1)');
    expect(block).toContain('Title: Admission System');
    expect(block).toContain('Technologies: Angular, Laravel, MySQL');
    expect(block).toContain('## Experience (complete list: 1)');
    expect(block).toContain('Title: Innovathon 2026 Grand Winner');
    expect(block).toContain('Date: September 2026');
    expect(block).toContain('Title: Python Essentials 1 | Issuer: Cisco Networking Academy');
  });

  it('tells the model not to describe a section that failed to load, and says when one is empty', () => {
    const block = formatPortfolioRecords({ ...records, projects: { unavailable: true }, certificates: { items: [] } });

    expect(block).toMatch(/## Projects\nUnavailable right now\..*Do not list or describe any projects\./);
    expect(block).not.toContain('Admission System');
    expect(block).toContain('## Certificates\nNone published yet.');
  });
});

describe('detectAnswerSections', () => {
  it('only returns sections whose real records the answer names', () => {
    expect(
      detectAnswerSections('A standout is the Innovathon 2026 Grand Winner title.', records),
    ).toEqual(['experience']);
    expect(detectAnswerSections('He built the Admission System.', records)).toEqual(['projects']);
    expect(detectAnswerSections('He holds Python Essentials 1 from Cisco.', records)).toEqual(['projects']);
  });

  it('adds Tech Stack only when several real technologies are named', () => {
    expect(detectAnswerSections('He works with React.', records)).toEqual([]);
    expect(detectAnswerSections('He works with React, Laravel and PostgreSQL.', records)).toEqual(['techstack']);
  });

  it('adds Contact when the answer gives his contact details or points to the Contact section', () => {
    expect(
      detectAnswerSections(
        'GitHub: https://github.com/JudemichaelArriba\nEmail: arribajudemichael@gmail.com\nOr use the Contact form on this site.',
        records,
      ),
    ).toEqual(['contact']);
    expect(detectAnswerSections("That isn't listed; you can ask him through the Contact section.", records)).toEqual([
      'contact',
    ]);
  });

  it('does not add Contact for a project repository link', () => {
    expect(
      detectAnswerSections('He built the Admission System: https://github.com/JudemichaelArriba/admission-web', records),
    ).toEqual(['projects']);
  });

  it('ignores invented records', () => {
    expect(detectAnswerSections('He built Kasalo and a Rust portfolio.', records)).toEqual([]);
  });

  it('matches whole names only', () => {
    // "Java" must not match inside "JavaScript".
    expect(detectAnswerSections('He uses JavaScript, React and Laravel.', records)).toEqual(['techstack']);
  });
});
