import { Navigate } from 'react-router-dom';

/** Home page — redirects to the unified analyzer page. */
function HomePage(): React.ReactElement {
  return <Navigate to="/analyzer" replace />;
}

export default HomePage;
