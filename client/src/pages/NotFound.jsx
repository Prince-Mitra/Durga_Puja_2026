import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';

export default function NotFound() {
  return (
    <EmptyState icon="🧭" title="Page not found" action={<Link to="/" className="btn btn-primary">Back to games</Link>}>
      That link does not lead anywhere.
    </EmptyState>
  );
}
