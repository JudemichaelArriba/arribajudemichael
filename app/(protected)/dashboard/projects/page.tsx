import Projects from '@/components/admin/projects/Projects';
import { getAdminProjects } from '@/features/admin/projects/queries';
import type { AdminProjectDto } from '@/features/admin/projects/types';
import { requireUser } from '@/lib/auth/requireUser';

export default async function ProjectsPage() {
    await requireUser();
    let projects: AdminProjectDto[] = [];
    let unavailable = false;

    try {
        projects = await getAdminProjects();
    } catch {
        unavailable = true;
    }

    return <Projects projects={projects} unavailable={unavailable} />;
}
