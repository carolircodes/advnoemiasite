import Header from '@/components/site/header';
import Hero from '@/components/site/hero';
import QuickAccess from '@/components/site/quick-access';
import About from '@/components/site/about';
import PracticeAreas from '@/components/site/practice-areas';
import ProcessFlow from '@/components/site/process-flow';
import Footer from '@/components/site/footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <QuickAccess />
      <About />
      <PracticeAreas />
      <ProcessFlow />
      <Footer />
    </div>
  );
}
