import { getPublicExperiences } from '@/features/admin/experiences/queries';
import Experience from './Experience';

export default async function ExperienceSection() {
    try {
        const experiences = await getPublicExperiences();
        return <Experience experiences={experiences} />;
    } catch {
        return <Experience experiences={[]} experiencesUnavailable />;
    }
}
