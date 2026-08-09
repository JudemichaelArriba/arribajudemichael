import { BriefcaseBusiness, CalendarDays } from 'lucide-react';

import {
    ManagementPage,
    ManagementPageChrome,
    StaticItemActions,
} from '@/components/admin/layout/ManagementPage';

interface AdminExperience {
    id: string;
    title: string;
    subtitle: string;
    date: string;
    description: string;
    status: 'active' | 'complete';
}

const EXPERIENCES: readonly AdminExperience[] = [
    {
        id: 'capstone-project-deployment',
        title: 'Capstone Project Deployment',
        subtitle: 'Production release',
        date: '2025 - Present',
        description:
            'Deployed full-stack capstone and facility intelligence platforms into production-ready environments.',
        status: 'active',
    },
    {
        id: 'first-tagum-city-hackathon',
        title: 'First Tagum City Hackathon',
        subtitle: 'Participant and pitch',
        date: '2026',
        description:
            "Competed in Tagum City's inaugural hackathon, shaping and pitching a practical technology solution.",
        status: 'complete',
    },
    {
        id: 'started-building',
        title: 'Started Building',
        subtitle: 'Self-taught foundations',
        date: '2023',
        description:
            'The first lines of code, bugs, and shipped sites that formed a lasting engineering practice.',
        status: 'complete',
    },
    {
        id: 'bachelor-of-science-information-technology',
        title: 'Bachelor of Science in Information Technology',
        subtitle: 'Aces Tagum College, Inc.',
        date: '2023',
        description:
            'Focused study in software engineering, systems design, and database architecture.',
        status: 'complete',
    },
] as const;

const NOTICE_ID = 'experiences-static-preview-notice';

export default function Experiences() {
    return (
        <ManagementPage>
            <ManagementPageChrome
                eyebrow="Content / Experiences"
                title="Experiences"
                description="Review the ordered milestones currently displayed on the public experience timeline."
                count={EXPERIENCES.length}
                countLabel="milestones"
                actionLabel="Add experience"
                noticeId={NOTICE_ID}
            />

            <section aria-labelledby="experience-list-heading" className="mt-8 sm:mt-10">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <BriefcaseBusiness
                            aria-hidden="true"
                            size={17}
                            strokeWidth={1.8}
                            className="shrink-0 text-[var(--signal)]/72"
                        />
                        <h2
                            id="experience-list-heading"
                            className="text-sm font-bold tracking-normal text-[var(--text)]"
                        >
                            Timeline entries
                        </h2>
                    </div>
                    <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/40">
                        Display order
                    </span>
                </div>

                <ol className="relative space-y-4 before:absolute before:bottom-8 before:left-[1.3125rem] before:top-8 before:w-px before:bg-white/[0.08]">
                    {EXPERIENCES.map((experience, index) => (
                        <li
                            key={experience.id}
                            className="relative grid min-w-0 grid-cols-[2.625rem_minmax(0,1fr)] gap-3 sm:gap-4"
                        >
                            <div className="relative z-[1] mt-5 flex size-[2.625rem] items-center justify-center rounded-lg border border-white/[0.09] bg-black font-mono text-[10px] font-bold tabular-nums text-[var(--signal)]/72">
                                {String(index + 1).padStart(2, '0')}
                            </div>

                            <article className="grid min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.025] xl:grid-cols-[minmax(0,1fr)_auto]">
                                <div className="min-w-0 p-4 sm:p-5 lg:p-6">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                        <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--signal)]/75">
                                            <CalendarDays
                                                aria-hidden="true"
                                                size={14}
                                                strokeWidth={1.8}
                                            />
                                            {experience.date}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.11em] ${experience.status === 'active' ? 'text-emerald-300/68' : 'text-[var(--muted)]/45'}`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`size-1.5 rounded-full ${experience.status === 'active' ? 'bg-emerald-300/75' : 'bg-white/25'}`}
                                            />
                                            {experience.status === 'active' ? 'Currently active' : 'Completed'}
                                        </span>
                                    </div>

                                    <p className="mt-4 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/48">
                                        {experience.subtitle}
                                    </p>
                                    <h3 className="mt-1.5 text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-2xl">
                                        {experience.title}
                                    </h3>
                                    <p className="mt-2 max-w-3xl text-sm leading-[1.65] text-[var(--muted)]/64 sm:text-[0.95rem]">
                                        {experience.description}
                                    </p>
                                </div>

                                <div className="flex items-center border-t border-white/[0.07] p-4 xl:min-w-40 xl:items-end xl:border-l xl:border-t-0 xl:p-5">
                                    <StaticItemActions
                                        itemLabel={experience.title}
                                        noticeId={NOTICE_ID}
                                        className="w-full xl:flex-col xl:items-stretch"
                                    />
                                </div>
                            </article>
                        </li>
                    ))}
                </ol>
            </section>
        </ManagementPage>
    );
}
