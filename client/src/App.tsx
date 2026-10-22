import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import AdminGallery from "./pages/AdminGallery";
import { useLocation } from "wouter";

export default function App() {
  const [location] = useLocation();
  return (
    <ErrorBoundary>
      {location === "/admin" || location === "/admin/" ? (
        <AdminGallery />
      ) : (
        <Home />
      )}
    </ErrorBoundary>
  );
}
