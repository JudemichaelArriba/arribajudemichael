import { Urbanist, Bricolage_Grotesque, Anton } from 'next/font/google';

export const urbanist = Urbanist({
    subsets: ['latin'],
    weight: ['700'],
    display: 'swap',
});

export const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-name',
});

/** Condensed poster face for the hero wordmark — it reads much larger than a
 *  normal grotesque at the same width. */
export const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-hero',
});
