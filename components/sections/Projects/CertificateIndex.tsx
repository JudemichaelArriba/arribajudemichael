'use client';

import { ArrowUpRight } from 'lucide-react';

import CertificatePdfPreview from '@/components/ui/CertificatePdfPreview/CertificatePdfPreview';
import type { PublicCertificateDto } from '@/features/admin/certificates/types';

import ShowcaseIndex, { type IndexItem } from './ShowcaseIndex';
import { PaperFrame, ShowcaseLink } from './ShowcaseParts';
import { FOCUS_RING, MONO_LABEL, issuedBy, padIndex } from './showcase';

const pdfLabel = (certificate: PublicCertificateDto) => `Open the ${certificate.title} certificate PDF (opens in a new tab)`;
const previewLabel = (certificate: PublicCertificateDto) => `${certificate.title} first-page preview`;

function CertificateCaption({ certificate }: { certificate: PublicCertificateDto }) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_13rem] gap-8 xl:gap-10">
            <p data-caption-part className="text-[0.95rem] leading-[1.75] text-[var(--muted)] short:text-sm">
                {issuedBy(certificate.issuer)}
            </p>
            <div data-caption-part className="flex flex-col items-start gap-5 short:gap-3.5">
                <dl>
                    <dt className={MONO_LABEL}>Format</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text)]">PDF certificate</dd>
                </dl>
                <ShowcaseLink href={certificate.pdfUrl} label={pdfLabel(certificate)} variant="button">
                    Open PDF
                </ShowcaseLink>
            </div>
        </div>
    );
}

/**
 * Phones and tablets: a contact sheet of the real first pages on paper. The whole card opens the
 * PDF. Previews load as they near the screen and paint one at a time (CertificatePdfPreview).
 */
function CertificateSheet({ certificates }: { certificates: PublicCertificateDto[] }) {
    return (
        <ol aria-label="Certificates" className="grid grid-cols-1 gap-x-7 gap-y-11 sm:grid-cols-2">
            {certificates.map((certificate, index) => (
                <li key={certificate.id} className="min-w-0">
                    <article data-sheet-card>
                        <a
                            href={certificate.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={pdfLabel(certificate)}
                            className={`group block ${FOCUS_RING}`}
                        >
                            <div className="relative aspect-[1.414/1] overflow-hidden border border-[var(--hairline)] transition-colors duration-300 group-hover:border-[var(--hairline-strong)] motion-reduce:transition-none">
                                <PaperFrame>
                                    <CertificatePdfPreview source={certificate.pdfUrl} label={previewLabel(certificate)} />
                                </PaperFrame>
                            </div>
                            <div className="mt-4 grid grid-cols-[2rem_minmax(0,1fr)_1rem] items-start gap-x-2.5">
                                <span className={`${MONO_LABEL} pt-[0.3em]`}>{padIndex(index + 1)}</span>
                                <div className="min-w-0">
                                    <h3 className="font-display text-[1.05rem] font-semibold leading-[1.25] tracking-[-0.015em] text-[var(--text)]">
                                        {certificate.title}
                                    </h3>
                                    <p className={`mt-1.5 ${MONO_LABEL}`}>{certificate.issuer}</p>
                                </div>
                                <ArrowUpRight
                                    aria-hidden="true"
                                    size={16}
                                    strokeWidth={1.8}
                                    className="mt-1 text-[var(--faint)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--text)] motion-reduce:transition-none"
                                />
                            </div>
                        </a>
                    </article>
                </li>
            ))}
        </ol>
    );
}

export default function CertificateIndex({ certificates, isDesktop }: { certificates: PublicCertificateDto[]; isDesktop: boolean }) {
    if (!isDesktop) return <CertificateSheet certificates={certificates} />;

    const items: IndexItem[] = certificates.map((certificate) => ({
        id: certificate.id,
        title: certificate.title,
        meta: certificate.issuer,
        visual: (
            <PaperFrame>
                <CertificatePdfPreview source={certificate.pdfUrl} label={previewLabel(certificate)} eager />
            </PaperFrame>
        ),
        caption: <CertificateCaption certificate={certificate} />,
    }));
    return <ShowcaseIndex items={items} listLabel="Certificates" />;
}
