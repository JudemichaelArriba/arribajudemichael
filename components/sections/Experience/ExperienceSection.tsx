import { getPublicExperiences } from '@/features/admin/experiences/queries';
import Experience from './Experience';

export default async function ExperienceSection() {
    let experiences: Awaited<ReturnType<typeof getPublicExperiences>> = [];
    let experiencesUnavailable = false;

    try {
        experiences = await getPublicExperiences();
    } catch {
        experiencesUnavailable = true;
    }

    return (
        <Experience
            experiences={experiences}
            experiencesUnavailable={experiencesUnavailable}
        />
    );
}
