import Image, { type StaticImageData } from 'next/image';
import { ArrowUpRight, Award, FileText } from 'lucide-react';

import {
    ManagementPage,
    ManagementPageChrome,
    StaticItemActions,
} from '@/components/admin/layout/ManagementPage';
import aiFoundationsCertificate from '@/public/certsTemporary/previews/ai-foundations-certificate.png';
import aiLanguageVisionCertificate from '@/public/certsTemporary/previews/ai-language-vision-certificate.png';
import pythonEssentialsCertificate from '@/public/certsTemporary/previews/python-essentials-1-certificate.png';

interface AdminCertificate {
    id: string;
    title: string;
    issuer: string;
    pdfHref: string;
    preview: StaticImageData;
    previewAlt: string;
}

const CERTIFICATES: readonly AdminCertificate[] = [
    {
        id: 'ai-foundations',
        title: 'AI Fundamentals: Foundations for Understanding AI',
        issuer: 'Cisco Networking Academy / IBM SkillsBuild',
        pdfHref:
            '/certsTemporary/AIFundamentalsFoundationsforUnderstandingAIv120260803-8-hp8dx8.pdf',
        preview: aiFoundationsCertificate,
        previewAlt: 'AI Foundations statement of achievement awarded to Jude Michael T. Arriba',
    },
    {
        id: 'ai-language-vision',
        title: 'AI Fundamentals: Language and Vision in AI',
        issuer: 'IBM SkillsBuild',
        pdfHref:
            '/certsTemporary/AIFundamentalsLanguageandVisioninAIv120260803-8-gerxad.pdf',
        preview: aiLanguageVisionCertificate,
        previewAlt: 'AI Language and Vision statement of achievement awarded to Jude Michael T. Arriba',
    },
    {
        id: 'python-essentials-one',
        title: 'Python Essentials 1',
        issuer: 'Cisco Networking Academy',
        pdfHref:
            '/certsTemporary/Python_Essentials_1_certificate_arribajudemichael-gmail-com_94750f5c-913e-4c00-8480-eab9ef65f7f1.pdf',
        preview: pythonEssentialsCertificate,
        previewAlt: 'Python Essentials 1 certificate awarded to Jude Michael T. Arriba',
    },
] as const;

const NOTICE_ID = 'certificates-static-preview-notice';

export default function Certificates() {
    return (
        <ManagementPage>
            <ManagementPageChrome
                eyebrow="Content / Certificates"
                title="Certificates"
                description="Review the credentials and source PDFs currently available through the public portfolio."
                count={CERTIFICATES.length}
                countLabel="credentials"
                actionLabel="Add certificate"
                noticeId={NOTICE_ID}
            />

            <section aria-labelledby="certificate-list-heading" className="mt-8 sm:mt-10">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <Award
                            aria-hidden="true"
                            size={17}
                            strokeWidth={1.8}
                            className="shrink-0 text-[var(--signal)]/72"
                        />
                        <h2
                            id="certificate-list-heading"
                            className="text-sm font-bold tracking-normal text-[var(--text)]"
                        >
                            Published credentials
                        </h2>
                    </div>
                    <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/40">
                        PDF archive
                    </span>
                </div>

                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {CERTIFICATES.map((certificate, index) => (
                        <li
                            key={certificate.id}
                            className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025]"
                        >
                            <div className="relative aspect-[1.3/1] w-full overflow-hidden border-b border-white/[0.07] bg-white">
                                <Image
                                    src={certificate.preview}
                                    alt={certificate.previewAlt}
                                    fill
                                    placeholder="blur"
                                    sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1279px) calc(50vw - 3rem), 390px"
                                    className="object-contain"
                                />
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[9px] font-bold uppercase tracking-[0.11em]">
                                    <span className="tabular-nums text-[var(--signal)]/75">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span aria-hidden="true" className="h-px w-4 bg-white/10" />
                                    <span className="inline-flex items-center gap-1.5 text-[var(--muted)]/48">
                                        <FileText aria-hidden="true" size={12} strokeWidth={1.8} />
                                        PDF credential
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-emerald-300/62">
                                        <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-300/70" />
                                        Published
                                    </span>
                                </div>

                                <h3 className="mt-3 text-lg font-extrabold leading-snug tracking-normal text-[var(--text)] sm:text-xl">
                                    {certificate.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]/60">
                                    {certificate.issuer}
                                </p>

                                <a
                                    href={certificate.pdfHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Open ${certificate.title} certificate PDF in a new tab`}
                                    className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.025] px-3 text-xs font-bold text-[var(--muted)]/68 transition-[color,border-color,background-color] duration-200 hover:border-[var(--signal)]/25 hover:bg-[var(--signal)]/[0.05] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                                >
                                    Open PDF
                                    <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} />
                                </a>

                                <StaticItemActions
                                    itemLabel={certificate.title}
                                    noticeId={NOTICE_ID}
                                    className="mt-auto border-t border-white/[0.07] pt-4"
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        </ManagementPage>
    );
}
