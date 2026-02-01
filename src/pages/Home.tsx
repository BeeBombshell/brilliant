import { ComponentExample } from "@/components/component-example";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-4xl font-bold mb-4">Brilliant App</h1>
      <p className="text-muted-foreground mb-8">Welcome to your new React application with React Router.</p>
      <ComponentExample />
    </div>
  );
}
