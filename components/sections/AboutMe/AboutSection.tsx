import { getGitHubContributions } from '@/features/github/contributions';
import AboutMe from './AboutMe';

export default async function AboutSection() {
    const contributions = await getGitHubContributions();

    return <AboutMe contributions={contributions} />;
}
