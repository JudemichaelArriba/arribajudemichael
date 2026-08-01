import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeContinuation from '../HomeContinuation';

describe('HomeContinuation', () => {
  it('renders a plain shared continuation panel', () => {
    render(
      <HomeContinuation>
        <section>What I do content</section>
        <section>About me content</section>
      </HomeContinuation>
    );

    expect(screen.getByTestId('home-continuation')).toBeInTheDocument();
    expect(screen.getByText('What I do content')).toBeInTheDocument();
    expect(screen.getByText('About me content')).toBeInTheDocument();
  });

  it('does not render sheet edge or handle UI', () => {
    const { container } = render(<HomeContinuation>Content</HomeContinuation>);

    expect(container.querySelector('.sheetEdge')).not.toBeInTheDocument();
    expect(container.querySelector('.handle')).not.toBeInTheDocument();
  });
});
