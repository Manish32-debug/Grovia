import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <section className="mt-16 text-center">
      <h1 className="text-display">This page has not been built yet</h1>
      <p className="mx-auto mt-2 max-w-[50ch] text-text-2">
        Grovia is under construction, one phase at a time. Head back to the home page.
      </p>
      <Link to="/" className="mt-6 inline-block">
        <Button>Back to home</Button>
      </Link>
    </section>
  );
}
