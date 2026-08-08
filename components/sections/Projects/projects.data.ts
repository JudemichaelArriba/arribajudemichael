import type { StaticImageData } from 'next/image';
import admissionSystemImage from '@/public/projectsTemporary/AdmissionSystem.png';
import ocutempImage from '@/public/projectsTemporary/Ocutmep.png';
import aiFoundationsCertificate from '@/public/certsTemporary/previews/ai-foundations-certificate.png';
import aiLanguageVisionCertificate from '@/public/certsTemporary/previews/ai-language-vision-certificate.png';
import pythonEssentialsCertificate from '@/public/certsTemporary/previews/python-essentials-1-certificate.png';

export interface ProjectItem {
    id: string;
    title: string;
    category: string;
    description: string;
    image: StaticImageData;
    imageAlt: string;
    previewHref: string;
    tags: readonly string[];
}

export interface CertificateItem {
    id: string;
    title: string;
    issuer: string;
    pdfHref: string;
    preview: StaticImageData;
    previewAlt: string;
}

export const PROJECTS: readonly ProjectItem[] = [
    {
        id: 'aces-admission-system',
        title: 'Aces Admission System',
        category: 'Academic admissions portal',
        description:
            'A responsive admissions experience for Aces Tagum College that guides prospective students from course discovery to application.',
        image: admissionSystemImage,
        imageAlt: 'Aces Admission System landing page and application entry point',
        previewHref: '/projectsTemporary/AdmissionSystem.png',
        tags: ['Application flow', 'Course discovery', 'Responsive UI'],
    },
    {
        id: 'ocutemp',
        title: 'OCUTEMP',
        category: 'IoT administration panel',
        description:
            'A facility dashboard for monitoring room status, occupancy, climate, energy use, and real-time building telemetry.',
        image: ocutempImage,
        imageAlt: 'OCUTEMP room status dashboard with live facility telemetry',
        previewHref: '/projectsTemporary/Ocutmep.png',
        tags: ['IoT telemetry', 'Facility monitoring', 'Operations dashboard'],
    },
] as const;

export const CERTIFICATES: readonly CertificateItem[] = [
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
