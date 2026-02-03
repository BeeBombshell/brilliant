import { Button } from "@/components/ui/button";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";

export function GoogleLoginScreen() {
    const { login, isLoading } = useGoogleAuth();

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <div className="flex w-full max-w-md flex-col items-center space-y-6 p-8 text-center">
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
                            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Sign in with Google
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
