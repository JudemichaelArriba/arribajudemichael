import {
  MAX_QUESTION_LENGTH,
  MAX_SENT_MESSAGES,
  toAnswerSegments,
  toTurns,
  toWireMessages,
  type ChatMessageLike,
} from '../chatMessages';

function message(id: string, role: ChatMessageLike['role'], text: string, extraParts: ChatMessageLike['parts'] = []): ChatMessageLike {
  return { id, role, parts: [{ type: 'text', text }, ...extraParts] };
}

describe('toWireMessages', () => {
  it('sends text only — tool parts never travel back to the server', () => {
    const wire = toWireMessages([
      message('1', 'user', 'Projects?'),
      message('2', 'assistant', 'Here they are.', [{ type: 'data-sections', data: ['projects'] }]),
      message('3', 'user', 'Thanks'),
    ]);

    expect(wire).toEqual([
      { role: 'user', content: 'Projects?' },
      { role: 'assistant', content: 'Here they are.' },
      { role: 'user', content: 'Thanks' },
    ]);
  });

  it('keeps only the newest messages, trims oversized questions and ends on the visitor', () => {
    const many = Array.from({ length: 15 }, (_, index) =>
      message(String(index), index % 2 === 0 ? 'user' : 'assistant', `m${index}`),
    );
    many.push(message('long', 'user', 'x'.repeat(MAX_QUESTION_LENGTH + 50)));

    const wire = toWireMessages(many);

    expect(wire.length).toBeLessThanOrEqual(MAX_SENT_MESSAGES);
    expect(wire.at(-1)).toEqual({ role: 'user', content: 'x'.repeat(MAX_QUESTION_LENGTH) });
  });
});

describe('toTurns', () => {
  it('pairs questions with answers and reads the sections the server matched, ignoring unknown ids', () => {
    const turns = toTurns([
      message('1', 'user', 'Where did he work?'),
      message('2', 'assistant', 'At ...', [{ type: 'data-sections', data: ['experience', 'projects', 'javascript:alert(1)', 42] }]),
      message('3', 'user', 'And projects?'),
    ]);

    expect(turns).toEqual([
      { id: '1', question: 'Where did he work?', answer: 'At ...', sections: ['experience', 'projects'], hasAnswer: true },
      { id: '3', question: 'And projects?', answer: '', sections: [], hasAnswer: false },
    ]);
  });

  it('shows answers without markdown emphasis markers', () => {
    const [turn] = toTurns([message('1', 'user', 'Projects?'), message('2', 'assistant', '- **Admission System** – a web app')]);
    expect(turn.answer).toBe('- Admission System – a web app');
  });
});

describe('toAnswerSegments', () => {
  it('links only GitHub, LinkedIn and the public email', () => {
    const segments = toAnswerSegments(
      'Code: https://github.com/JudemichaelArriba. Mail arribajudemichael@gmail.com or visit https://evil.example/x and javascript:alert(1).',
    );

    expect(segments.filter((segment) => segment.kind === 'link')).toEqual([
      { kind: 'link', text: 'https://github.com/JudemichaelArriba', href: 'https://github.com/JudemichaelArriba' },
      { kind: 'link', text: 'arribajudemichael@gmail.com', href: 'mailto:arribajudemichael@gmail.com' },
    ]);
    expect(segments.map((segment) => segment.text).join('')).toContain('https://evil.example/x and javascript:alert(1).');
  });

  it('does not link plain-http or other email addresses', () => {
    const segments = toAnswerSegments('http://github.com/x someone@else.com');
    expect(segments).toEqual([{ kind: 'text', text: 'http://github.com/x someone@else.com' }]);
  });
});
