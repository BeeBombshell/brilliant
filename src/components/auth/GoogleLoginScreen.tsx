import { Button } from "@/components/ui/button";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { IconBrandGoogleFilled } from "@tabler/icons-react";

export function GoogleLoginScreen() {
    const { login, isLoading } = useGoogleAuth();

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <div className="flex w-full max-w-md flex-col items-center space-y-6 p-8 text-center">
                <img
                    src="/brilliant.svg"
                    alt="Brilliant Logo"
                    className="w-20 h-20"
                />
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome to Brilliant</h1>
                    <p className="text-muted-foreground">
                        Sign in with Google to sync your calendar and get started.
                    </p>
                </div>

                <div className="flex flex-col gap-4 w-full">
                    {isLoading ? (
                        <Button disabled className="w-full">
                            Loading...
                        </Button>
                    ) : (
                        <Button onClick={login} className="w-full" size="lg">
                            <IconBrandGoogleFilled size={16} className="mr-2" />
                            Sign in with Google
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
