import { createStreamingRedactor, REDACTION, redactSecrets } from '../chatOutputFilter';

describe('redactSecrets', () => {
  it.each([
    ['Groq key', 'key: gsk_abcdEFGH12345678ijklMNOP'],
    ['Supabase secret key', 'sb_secret_AbCdEf123456_xyz'],
    ['Supabase publishable key', 'sb_publishable_AbCdEf123456'],
    ['JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturepart'],
    ['bearer token', 'Authorization: Bearer abcdef1234567890abcdef'],
    ['GitHub token', 'ghp_abcdefghijklmnopqrstuvwxyz0123'],
    ['GitHub fine-grained token', 'github_pat_11ABCDEFG0123456789_abcdefghijk'],
    ['Resend key', 're_123456789_abcdefghijklmnopqrst'],
    ['AWS key', 'AKIAIOSFODNN7EXAMPLE'],
    ['Turnstile key', '0x4AAAAAAAabcdefghijk'],
    ['project env var', 'It is stored in SUPABASE_SECRET_KEY.'],
    ['generic secret name', 'Set STRIPE_API_KEY first'],
    ['Supabase host', 'https://abcdefghijkl.supabase.co/rest/v1/projects'],
    ['Groq endpoint', 'api.groq.com/openai/v1'],
    ['Cloudflare endpoint', 'https://api.cloudflare.com/client/v4/accounts/x/ai/v1'],
    ['Upstash host', 'https://eu1-cool-cat-12345.upstash.io'],
  ])('redacts a %s', (_label, text) => {
    const result = redactSecrets(text);
    expect(result).toContain(REDACTION);
    expect(result).not.toMatch(/gsk_|sb_secret|sb_publishable|eyJhbGci|ghp_|github_pat_|AKIA|0x4AAAA|supabase\.co|groq\.com|cloudflare\.com|upstash\.io|SECRET_KEY|API_KEY/);
  });

  it('leaves ordinary answers untouched', () => {
    const answer =
      'Jude builds APIs with Next.js and Laravel. See https://github.com/JudemichaelArriba or email arribajudemichael@gmail.com. Key skills: TypeScript, PostgreSQL.';
    expect(redactSecrets(answer)).toBe(answer);
  });
});

describe('createStreamingRedactor', () => {
  function streamThrough(chunks: string[]): string {
    const redactor = createStreamingRedactor();
    return chunks.map((chunk) => redactor.push(chunk)).join('') + redactor.flush();
  }

  it('catches a secret split across many chunks', () => {
    const output = streamThrough(['Here: g', 'sk_abcd', 'EFGH1234', '5678ijkl', 'MNOP and more text after it.']);
    expect(output).toBe(`Here: ${REDACTION} and more text after it.`);
  });

  it('never releases a fragment of a long token before it is complete', () => {
    const redactor = createStreamingRedactor();
    const token = `eyJ${'a'.repeat(60)}.${'b'.repeat(60)}`;
    let released = redactor.push(`Token ${token.slice(0, 70)}`);
    released += redactor.push(`${token.slice(70)} done and a little more padding text here.`);
    released += redactor.flush();

    expect(released).not.toContain('aaaa');
    expect(released).not.toContain('bbbb');
    expect(released).toContain(REDACTION);
  });

  it('passes normal text through unchanged', () => {
    const text = 'Jude has worked on backend APIs, mobile clients and system architecture for several projects.';
    expect(streamThrough(text.match(/.{1,7}/g) ?? [])).toBe(text);
  });
});
