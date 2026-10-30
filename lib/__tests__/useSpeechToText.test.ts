import { act, renderHook, waitFor } from '@testing-library/react';

import type {
  SpeechRecognitionErrorCode,
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from '../speechRecognition';
import { useSpeechToText } from '../useSpeechToText';

type SpeechGlobals = {
  webkitSpeechRecognition?: unknown;
  SpeechRecognition?: unknown;
  opr?: unknown;
};

class FakeRecognition extends EventTarget implements SpeechRecognitionLike {
  static instances: FakeRecognition[] = [];

  lang = '';
  continuous = true;
  interimResults = false;
  maxAlternatives = 0;
  onresult: SpeechRecognitionLike['onresult'] = null;
  onerror: SpeechRecognitionLike['onerror'] = null;
  onaudiostart: SpeechRecognitionLike['onaudiostart'] = null;
  onspeechstart: SpeechRecognitionLike['onspeechstart'] = null;
  onend: SpeechRecognitionLike['onend'] = null;
  start = jest.fn();
  stop = jest.fn(() => this.end());
  abort = jest.fn();

  constructor() {
    super();
    FakeRecognition.instances.push(this);
  }

  openMic(): void {
    this.onaudiostart?.(new Event('audiostart'));
  }

  detectSpeech(): void {
    this.onspeechstart?.(new Event('speechstart'));
  }

  hear(...phrases: Array<{ text: string; isFinal: boolean }>): void {
    const results = phrases.map(({ text, isFinal }) => Object.assign([{ transcript: text, confidence: 1 }], { isFinal }));
    this.onresult?.({ resultIndex: 0, results } as unknown as SpeechRecognitionEventLike);
  }

  fail(error: SpeechRecognitionErrorCode): void {
    this.onerror?.({ error, message: '' } as SpeechRecognitionErrorEventLike);
    this.end();
  }

  end(): void {
    this.onend?.(new Event('end'));
  }
}

const speechWindow = window as unknown as SpeechGlobals;
const originalUserAgent = navigator.userAgent;

function setUserAgent(value: string): void {
  Object.defineProperty(window.navigator, 'userAgent', { value, configurable: true });
}

function latest(): FakeRecognition {
  return FakeRecognition.instances[FakeRecognition.instances.length - 1];
}

async function renderSupported(onTranscript?: (text: string) => void) {
  const hook = renderHook(() => useSpeechToText({ onTranscript }));
  await waitFor(() => expect(hook.result.current.supported).toBe(true));
  return hook;
}

describe('useSpeechToText', () => {
  beforeEach(() => {
    FakeRecognition.instances = [];
    speechWindow.webkitSpeechRecognition = FakeRecognition;
  });

  afterEach(() => {
    delete speechWindow.webkitSpeechRecognition;
    delete speechWindow.SpeechRecognition;
    delete speechWindow.opr;
    delete (navigator as Navigator & { brave?: unknown }).brave;
    setUserAgent(originalUserAgent);
  });

  it('starts unsupported and turns supported after detection', async () => {
    const { result } = renderHook(() => useSpeechToText());
    expect(result.current.supported).toBe(false);
    await waitFor(() => expect(result.current.supported).toBe(true));
  });

  it('stays unsupported without the API (Firefox)', async () => {
    delete speechWindow.webkitSpeechRecognition;
    const { result } = renderHook(() => useSpeechToText());
    await act(async () => {});
    expect(result.current.supported).toBe(false);
  });

  it('treats Brave as unsupported', async () => {
    Object.defineProperty(navigator, 'brave', {
      value: { isBrave: () => Promise.resolve(true) },
      configurable: true,
    });
    const { result } = renderHook(() => useSpeechToText());
    await act(async () => {});
    expect(result.current.supported).toBe(false);
  });

  it('treats Opera as unsupported', async () => {
    setUserAgent('Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0');
    const { result } = renderHook(() => useSpeechToText());
    await act(async () => {});
    expect(result.current.supported).toBe(false);
  });

  it('configures one-shot recognition with interim results', async () => {
    const { result } = await renderSupported();
    act(() => result.current.start());

    expect(latest()).toMatchObject({ lang: 'en-US', continuous: false, interimResults: true });
    expect(latest().start).toHaveBeenCalledTimes(1);
    expect(result.current.listening).toBe(true);
  });

  it('reports final and interim text without doing anything else', async () => {
    const onTranscript = jest.fn();
    const { result } = await renderSupported(onTranscript);
    act(() => result.current.start());

    act(() => latest().hear({ text: 'what does', isFinal: true }, { text: ' Jude build', isFinal: false }));

    expect(result.current.transcript).toBe('what does Jude build');
    expect(onTranscript).toHaveBeenLastCalledWith('what does Jude build');

    act(() => result.current.stop());
    expect(result.current.listening).toBe(false);
  });

  it('signals detected speech before any words are recognized', async () => {
    const { result } = await renderSupported();
    act(() => result.current.start());
    expect(result.current.hearing).toBe(false);

    act(() => latest().detectSpeech());
    expect(result.current.hearing).toBe(true);
    expect(result.current.transcript).toBe('');

    act(() => latest().end());
    expect(result.current.hearing).toBe(false);
  });

  it.each<SpeechRecognitionErrorCode>(['network', 'service-not-allowed'])(
    'withdraws support after a %s error',
    async (code) => {
      const { result } = await renderSupported();
      act(() => result.current.start());
      act(() => latest().fail(code));

      expect(result.current.supported).toBe(false);
      expect(result.current.error).toBe('unavailable');
      expect(result.current.listening).toBe(false);
    },
  );

  it('keeps voice input available when mic access is blocked', async () => {
    const { result } = await renderSupported();
    act(() => result.current.start());
    act(() => latest().fail('not-allowed'));

    expect(result.current.supported).toBe(true);
    expect(result.current.error).toBe('not-allowed');

    act(() => result.current.start());
    expect(result.current.error).toBeNull();
  });

  it('reports when the browser has opened the microphone', async () => {
    const { result } = await renderSupported();
    act(() => result.current.start());
    expect(result.current.micOpen).toBe(false);

    act(() => latest().openMic());
    expect(result.current.micOpen).toBe(true);
  });

  it('treats detected speech as an open mic when audiostart never came', async () => {
    const { result } = await renderSupported();
    act(() => result.current.start());
    act(() => latest().detectSpeech());

    expect(result.current.micOpen).toBe(true);
  });

  it('says nothing was caught when the session times out in silence', async () => {
    const { result } = await renderSupported();
    act(() => result.current.start());
    act(() => latest().fail('no-speech'));

    expect(result.current.error).toBe('no-speech');
    expect(result.current.supported).toBe(true);
  });

  it('stays quiet about no-speech after the visitor stopped', async () => {
    const { result } = await renderSupported();
    act(() => result.current.start());
    const recognition = latest();
    recognition.stop.mockImplementation(() => undefined);

    act(() => result.current.stop());
    act(() => recognition.fail('no-speech'));

    expect(result.current.error).toBeNull();
  });

  it('turns off at once on stop and still delivers the last result', async () => {
    const onTranscript = jest.fn();
    const { result } = await renderSupported(onTranscript);
    act(() => result.current.start());
    const recognition = latest();
    recognition.stop.mockImplementation(() => undefined);

    act(() => result.current.stop());
    expect(result.current.listening).toBe(false);

    act(() => recognition.hear({ text: 'hello', isFinal: true }));
    expect(onTranscript).toHaveBeenLastCalledWith('hello');
  });

  it('drops a stopped session the speech service never ends', async () => {
    const { result } = await renderSupported();
    act(() => result.current.start());
    const recognition = latest();
    recognition.stop.mockImplementation(() => undefined);

    jest.useFakeTimers();
    try {
      act(() => result.current.stop());
      expect(recognition.abort).not.toHaveBeenCalled();

      act(() => jest.advanceTimersByTime(1_500));
      expect(recognition.abort).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('lets a new session replace one that is still finishing', async () => {
    const onTranscript = jest.fn();
    const { result } = await renderSupported(onTranscript);
    act(() => result.current.start());
    const first = latest();
    first.stop.mockImplementation(() => undefined);

    act(() => result.current.stop());
    act(() => result.current.start());

    expect(first.abort).toHaveBeenCalledTimes(1);
    expect(FakeRecognition.instances).toHaveLength(2);
    expect(result.current.listening).toBe(true);

    act(() => first.hear({ text: 'stale', isFinal: true }));
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it('aborts recognition on unmount', async () => {
    const { result, unmount } = await renderSupported();
    act(() => result.current.start());
    const recognition = latest();

    unmount();

    expect(recognition.abort).toHaveBeenCalledTimes(1);
  });
});
