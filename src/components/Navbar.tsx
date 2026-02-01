import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <nav className="border-b bg-card px-8 py-4 flex gap-6">
      <Link to="/" className="font-semibold hover:text-primary transition-colors">Home</Link>
      <Link to="/about" className="font-semibold hover:text-primary transition-colors">About</Link>
    </nav>
  );
}
