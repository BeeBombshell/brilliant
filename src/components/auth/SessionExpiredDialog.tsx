import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { IconRefresh } from "@tabler/icons-react";

/**
 * Dialog shown when the user's session has expired.
 * Prompts the user to re-authenticate with Google.
 */
export function SessionExpiredDialog() {
    const { sessionExpired, login, clearSessionExpired } = useGoogleAuth();

    const handleReauthenticate = () => {
        clearSessionExpired();
        login();
    };

    return (
        <AlertDialog open={sessionExpired} onOpenChange={(open) => !open && clearSessionExpired()}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <IconRefresh size={20} />
                        Session Expired
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Your session has expired. Please sign in again to continue using the calendar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button onClick={handleReauthenticate}>
                        Sign in with Google
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
