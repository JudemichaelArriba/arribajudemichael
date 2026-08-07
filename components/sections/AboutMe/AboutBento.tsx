'use client';

import { useRef } from 'react';
import {
  BentoCard,
  type BentoCardData,
  BENTO_CODE_CLASS,
  BENTO_LABEL_CLASS,
  BentoGrid,
  BENTO_META_CLASS,
  BentoSpotlight,
  BENTO_VALUE_CLASS,
  DEFAULT_GLOW_COLOR,
  DEFAULT_PARTICLE_COUNT,
  DEFAULT_SPOTLIGHT_RADIUS,
} from '@/components/ui/Bento/Bento';

export type AboutCardData = BentoCardData;

interface AboutBentoProps {
  cards: AboutCardData[];
  gridClassName?: string;
  cardClassNames?: readonly string[];
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  glowColor?: string;
  clickEffect?: boolean;
}

export default function AboutBento({
  cards,
  gridClassName = 'sm:grid-cols-2',
  cardClassNames,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
}: AboutBentoProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <BentoSpotlight
        gridRef={gridRef}
        disableAnimations={disableAnimations}
        enabled={enableSpotlight}
        spotlightRadius={spotlightRadius}
        glowColor={glowColor}
      />

      <BentoGrid ref={gridRef} className={gridClassName}>
        {cards.map((card, index) => (
          <BentoCard
            key={card.label}
            className={cardClassNames?.[index]}
            enableStars={enableStars}
            enableBorderGlow={enableBorderGlow}
            disableAnimations={disableAnimations}
            particleCount={particleCount}
            glowColor={glowColor}
            clickEffect={clickEffect}
          >
            <div className={BENTO_META_CLASS}>
              <span className={BENTO_CODE_CLASS}>{card.code}</span>
              <span className={BENTO_LABEL_CLASS}>{card.label}</span>
            </div>
            <div className={BENTO_VALUE_CLASS}>{card.value}</div>
          </BentoCard>
        ))}
      </BentoGrid>
    </>
  );
}
