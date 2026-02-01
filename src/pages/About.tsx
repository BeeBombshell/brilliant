import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-4xl font-bold mb-4">About Brilliant</h1>
      <p className="text-muted-foreground mb-8">This is a brilliant application built with React, Vite, and React Router.</p>
      <Link to="/" className="text-primary hover:underline">Go back Home</Link>
    </div>
  );
}
