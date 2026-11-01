import type { Metadata } from 'next';
import PapagedonApp from '@/components/papagedon/PapagedonApp';

export const metadata: Metadata = {
  title: 'PAPAGEDON AEI',
  description:
    'PAPAGEDON AEI: play a track, use the mic or share system audio, and watch the engine visuals react under a Meta-directed show.',
};

export default function AppPage() {
  return <PapagedonApp />;
}
