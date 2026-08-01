import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeRevealScene from '../HomeRevealScene';

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

jest.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {},
}));

jest.mock('@/components/sections/home/Home', () => {
  return function MockHome() {
    return <section id="home">Home hero</section>;
  };
});

describe('HomeRevealScene', () => {
  it('renders Home and continuation children', () => {
    render(
      <HomeRevealScene>
        <section>Below home content</section>
      </HomeRevealScene>
    );

    expect(screen.getByTestId('home-reveal-scene')).toBeInTheDocument();
    expect(screen.getByText('Home hero')).toBeInTheDocument();
    expect(screen.getByTestId('home-reveal-continuation')).toHaveTextContent('Below home content');
  });
});
