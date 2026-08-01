import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AboutMe from '../AboutMe';
import type { AboutCardData } from '../AboutBento';

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

jest.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {},
}));

interface MockTiltedCardProps {
  altText?: string;
  imageSrc?: string;
  overlayContent?: React.ReactNode;
}

jest.mock('@/components/ui/TiltedCard/TiltedCard', () => {
  return function MockTiltedCard({ altText, imageSrc, overlayContent }: MockTiltedCardProps) {
    return (
      <figure data-testid="tilted-card">
        <span role="img" aria-label={altText} data-src={imageSrc} />
        {overlayContent}
      </figure>
    );
  };
});

interface MockAboutBentoProps {
  cards: AboutCardData[];
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  clickEffect?: boolean;
  disableAnimations?: boolean;
}

jest.mock('../AboutBento', () => {
  return function MockAboutBento({
    cards,
    enableStars,
    enableSpotlight,
    enableBorderGlow,
    clickEffect,
    disableAnimations,
  }: MockAboutBentoProps) {
    return (
      <div
        data-testid="about-bento"
        data-stars={String(enableStars)}
        data-spotlight={String(enableSpotlight)}
        data-border-glow={String(enableBorderGlow)}
        data-click-effect={String(clickEffect)}
        data-disable-animations={String(disableAnimations)}
      >
        {cards.map((card) => (
          <article key={card.code}>
            <p>{card.label}</p>
            <p>{card.value}</p>
          </article>
        ))}
      </div>
    );
  };
});

describe('AboutMe', () => {
  it('renders brief premium about content', () => {
    render(<AboutMe />);

    expect(screen.getByText('// about')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /reliable systems/i })).toBeInTheDocument();
    expect(screen.getByText(/backend APIs, IoT workflows/i)).toBeInTheDocument();
    expect(screen.getByText('Full-stack systems')).toBeInTheDocument();
    expect(screen.getByText('Backend + IoT')).toBeInTheDocument();
    expect(screen.getByText('Maintainable code')).toBeInTheDocument();
  });

  it('keeps the profile image and compact bento card details', () => {
    render(<AboutMe />);

    expect(screen.getByRole('img', { name: 'Jude Michael Arriba' })).toHaveAttribute('data-src', '/profile.jpeg');
    expect(screen.getAllByText('Jude Michael Arriba').length).toBeGreaterThan(0);
    expect(screen.getByText('Tagum City, Philippines')).toBeInTheDocument();
    expect(screen.getAllByText(/Open to opportunities/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Clean architecture/i)).toBeInTheDocument();
  });

  it('restores optimized bento hover effects while keeping heavy effects disabled', () => {
    render(<AboutMe />);

    const bento = screen.getByTestId('about-bento');
    expect(bento).toHaveAttribute('data-stars', 'false');
    expect(bento).toHaveAttribute('data-spotlight', 'true');
    expect(bento).toHaveAttribute('data-border-glow', 'true');
    expect(bento).toHaveAttribute('data-click-effect', 'false');
    expect(bento).toHaveAttribute('data-disable-animations', 'undefined');
  });
});
