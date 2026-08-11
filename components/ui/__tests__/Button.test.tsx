import type { FormEvent, MouseEventHandler, PropsWithChildren } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import Button from '../Button';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

jest.mock('@/components/effects/SpecularButton/SpecularButton', () => ({
  __esModule: true,
  default: ({
    children,
    className,
    onClick,
    type,
  }: PropsWithChildren<{
    className?: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit';
  }>) => (
    <button className={className} onClick={onClick} type={type}>{children}</button>
  ),
}));

jest.mock('@/components/effects/Magnet/Magnet', () => ({
  __esModule: true,
  default: ({ children }: PropsWithChildren) => <>{children}</>,
}));

jest.mock('@/components/ui/RollingText', () => ({
  __esModule: true,
  default: ({ children }: PropsWithChildren) => <>{children}</>,
}));

describe('Button', () => {
  beforeEach(() => {
    push.mockReset();
  });

  it('runs the click callback and performs internal navigation', () => {
    const onClick = jest.fn();
    render(<Button href="/dashboard" onClick={onClick}>Open dashboard</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Open dashboard' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('uses a secure anchor for an external destination', () => {
    render(<Button href="https://github.com/example/repository">Repository</Button>);

    expect(screen.getByRole('link', { name: 'Repository' })).toMatchObject({
      href: 'https://github.com/example/repository',
      rel: 'noopener noreferrer',
      target: '_blank',
    });
    expect(push).not.toHaveBeenCalled();
  });

  it('preserves submit semantics through the specular implementation', () => {
    const onSubmit = jest.fn((event: FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button variant="specular" type="submit">Send message</Button>
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
