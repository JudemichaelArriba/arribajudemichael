import Experiences from '@/components/admin/experiences/Experiences';
import { getAdminExperiences } from '@/features/admin/experiences/queries';
import type { AdminExperienceDto } from '@/features/admin/experiences/types';
import { requireUser } from '@/lib/auth/requireUser';

export default async function ExperiencesPage() {
    await requireUser();
    let experiences: AdminExperienceDto[] = [];
    let unavailable = false;

    try {
        experiences = await getAdminExperiences();
    } catch {
        unavailable = true;
    }

    return <Experiences experiences={experiences} unavailable={unavailable} />;
}
