import { Urbanist, Bricolage_Grotesque } from 'next/font/google';

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