/** Single source of truth for personal details, reused by the layout, hero and contact. */
export const site = {
  name: 'Maciej Stempniak',
  role: 'Systems & Backend Engineer',
  url: 'https://ferrisofficial.github.io',
  location: 'Poland',
  description:
    'Systems and backend engineer working in C++ and Python. 5G RAN energy efficiency at Nokia, production backend systems since, and applied machine learning for medical imaging.',
  email: 'maciek.m.stempniak@gmail.com',
  github: 'https://github.com/FerrisOfficial',
  githubHandle: 'FerrisOfficial',
  linkedin: 'https://www.linkedin.com/in/stempniak-maciej/',
  linkedinHandle: 'stempniak-maciej',
} as const;

/** Deliberately excludes the phone number that appears on the CV. */
export const contactLinks = [
  { label: 'Email', value: site.email, href: `mailto:${site.email}`, icon: 'lucide:mail' },
  { label: 'GitHub', value: site.githubHandle, href: site.github, icon: 'lucide:github' },
  {
    label: 'LinkedIn',
    value: site.linkedinHandle,
    href: site.linkedin,
    icon: 'lucide:linkedin',
  },
] as const;
