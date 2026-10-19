import {
  containsBlockedTerm,
  containsCrisisSignal,
  containsSoftTerm,
  normalizeForModeration,
} from '../blocklist';

describe('normalizeForModeration', () => {
  it('undoes leetspeak, accents, zero-width characters and spelled-out letters', () => {
    expect(normalizeForModeration('T4NG1N4')).toContain('tangina');
    expect(normalizeForModeration('u1o1')).toContain('ulol');
    expect(normalizeForModeration('cáfé')).toContain('cafe');
    expect(normalizeForModeration('pu​ta')).toContain('puta');
    expect(normalizeForModeration('p.u.t.a ka')).toContain('puta ka');
    expect(normalizeForModeration('f u c k this')).toContain('fuck this');
  });

  it('keeps ordinary short words separate', () => {
    expect(normalizeForModeration('is a test')[0]).toBe('is a test');
  });
});

describe('containsBlockedTerm', () => {
  it.each([
    ['English profanity', 'fuck you'],
    ['English with inflection', 'this is fucking useless'],
    ['English slur', 'you are a f@ggot'],
    ['Tagalog', 'tangina mo'],
    ['Tagalog with spacing', 'tang ina nyo'],
    ['Tagalog stretched', 'putanginaaaa'],
    ['Tagalog leetspeak', 't@ng1n4'],
    ['Tagalog spelled out', 'p.u.t.a'],
    ['Cebuano', 'bilat'],
    ['Taglish', 'bro pakyu ka talaga'],
    ['Sexual Tagalog', 'kantot tayo'],
  ])('blocks %s', (_label, message) => {
    expect(containsBlockedTerm(message)).toBe(true);
  });

  it.each([
    ['putahe (a dish)', 'Ano ang paboritong putahe ni Jude?'],
    ['computer', 'What computer does he use?'],
    ['kompyuter', 'anong kompyuter gamit niya'],
    ['gagamba (spider)', 'May project ba siya tungkol sa gagamba?'],
    ['tangan (Malay/Cebuano hand)', 'tangan'],
    ['pakyaw (wholesale)', 'pakyaw na presyo'],
    ['shiitake', 'shiitake mushrooms'],
    ['Scunthorpe', 'Scunthorpe United'],
    ['analysis', 'Can you give an analysis of his projects?'],
    ['Bisaya question', 'Unsa iyang mga proyekto?'],
    ['self-deprecation (soft only)', 'bobo ako sa math, ano ginagawa niya?'],
  ])('allows %s', (_label, message) => {
    expect(containsBlockedTerm(message)).toBe(false);
  });
});

describe('containsSoftTerm', () => {
  it('flags ambiguous insults without blocking them', () => {
    expect(containsSoftTerm('gago ka')).toBe(true);
    expect(containsBlockedTerm('gago ka')).toBe(false);
    expect(containsSoftTerm('yawa')).toBe(true);
  });

  it('ignores plain questions', () => {
    expect(containsSoftTerm('What is his tech stack?')).toBe(false);
  });
});

describe('containsCrisisSignal', () => {
  it.each([
    'I want to kill myself',
    'thinking of ending it all tonight',
    'i dont want to live, i want to die',
    'gusto ko na mamatay',
    'ayoko nang mabuhay',
    'gusto na ko maghikog',
  ])('detects "%s"', (message) => {
    expect(containsCrisisSignal(message)).toBe(true);
  });

  it('does not fire on ordinary sentences', () => {
    expect(containsCrisisSignal('His deadline almost killed the project')).toBe(false);
  });
});
