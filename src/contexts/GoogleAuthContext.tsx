import { createContext, useContext, useEffect, useState, useCallback } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";

/**
 * AUTHENTICATION LIMITATION:
 * This app uses Google's OAuth2 Implicit Grant Flow via Google Identity Services.
 * The implicit flow only provides short-lived access tokens (~1 hour) and does NOT
 * provide refresh tokens. True refresh tokens require:
 *   1. A backend server to handle the Authorization Code flow
 *   2. The `access_type=offline` parameter
 *   3. Secure server-side storage of refresh tokens
 *
 * Current behavior: When the access token expires, users are prompted to re-authenticate
 * rather than silently refreshing (which would fail or cause UX issues).
 */

interface GoogleAuthContextType {
    isAuthenticated: boolean;
    user: GoogleUser | null;
    accessToken: string | null;
    login: () => void;
    logout: () => void;
    isLoading: boolean;
    tokenClient: google.accounts.oauth2.TokenClient | null;
    /** True when the session has expired and the user needs to re-authenticate */
    sessionExpired: boolean;
    /** Clear the sessionExpired flag (call after showing re-auth prompt) */
    clearSessionExpired: () => void;
}

interface GoogleUser {
    email?: string;
    name?: string;
    picture?: string;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [tokenExpiration, setTokenExpiration] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tokenClient, setTokenClient] = useState<google.accounts.oauth2.TokenClient | null>(null);
    const [sessionExpired, setSessionExpired] = useState(false);

    useEffect(() => {
        setIsAuthenticated(Boolean(accessToken));
    }, [accessToken]);

    // Initialize Google Identity Services and GAPI
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn("VITE_GOOGLE_CLIENT_ID is not set.");
            setIsLoading(false);
            return;
        }

        const loadScripts = async () => {
            try {
                // 1. Load GAPI
                await new Promise<void>((resolve, reject) => {
                    if (window.gapi) {
                        resolve();
                        return;
                    }
                    const script = document.createElement("script");
                    script.src = "https://apis.google.com/js/api.js";
                    script.async = true;
                    script.defer = true;
                    script.onload = () => resolve();
                    script.onerror = (e) => reject(e);
                    document.body.appendChild(script);
                });

                // 2. Initialize GAPI Client
                await new Promise<void>((resolve) => {
                    gapi.load("client", {
                        callback: resolve,
                        onerror: () => console.error("GAPI load error"),
                    });
                });

                await gapi.client.init({
                    // apiKey: import.meta.env.VITE_GOOGLE_API_KEY, 
                    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
                });

                // 3. Load GIS
                await new Promise<void>((resolve, reject) => {
                    if (window.google?.accounts?.oauth2) {
                        resolve();
                        return;
                    }
                    const script = document.createElement("script");
                    script.src = "https://accounts.google.com/gsi/client";
                    script.async = true;
                    script.defer = true;
                    script.onload = () => resolve();
                    script.onerror = (e) => reject(e);
                    document.body.appendChild(script);
                });

                // 4. Initialize Token Client
                const client = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    callback: (response: google.accounts.oauth2.TokenResponse) => {
                        if (response.access_token) {
                            handleLoginSuccess(response);
                        }
                    },
                });
                setTokenClient(client);

                // 5. Check LocalStorage
                const storedToken = localStorage.getItem("google_access_token");
                const storedUser = localStorage.getItem("google_user_profile");
                const expiration = localStorage.getItem("google_token_expiration");

                if (storedToken && expiration && Date.now() < parseInt(expiration)) {
                    // Restore session
                    gapi.client.setToken({ access_token: storedToken });
                    setAccessToken(storedToken);
                    setTokenExpiration(parseInt(expiration));

                    if (storedUser) {
                        try {
                            setUser(JSON.parse(storedUser));
                        } catch {
                            // Invalid JSON, re-fetch
                            fetchAndSetUser(storedToken);
                        }
                    } else {
                        // Token exists but no profile (migration or error), fetch it
                        fetchAndSetUser(storedToken);
                    }
                } else {
                    // Clear invalid/expired session
                    localStorage.removeItem("google_access_token");
                    localStorage.removeItem("google_token_expiration");
                    localStorage.removeItem("google_user_profile");
                    gapi.client.setToken(null);
                    setAccessToken(null);
                    setTokenExpiration(null);
                }

            } catch (error) {
                console.error("Error initializing Google scripts", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadScripts();

        // Cleanup isn't strict here as scripts persist, but good practice to clear state
        return () => {
            // no-op
        };
        // NOTE: handleLoginSuccess is intentionally excluded from deps.
        // It's used in the tokenClient initialization callback which only runs once during script loading.
        // Adding it would cause unnecessary re-initialization of the Google scripts on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAndSetUser = async (accessToken: string) => {
        try {
            const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userData = await userInfoResponse.json();
            const googleUser: GoogleUser = {
                name: userData.name,
                email: userData.email,
                picture: userData.picture,
            };
            setUser(googleUser);
            localStorage.setItem("google_user_profile", JSON.stringify(googleUser));
        } catch (error) {
            console.error("Failed to fetch user info", error);
        }
    };

    const handleLoginSuccess = async (response: google.accounts.oauth2.TokenResponse) => {
        const expiresIn = parseInt(response.expires_in) * 1000;
        const expirationTime = Date.now() + expiresIn;

        localStorage.setItem("google_access_token", response.access_token);
        localStorage.setItem("google_token_expiration", expirationTime.toString());

        // Set token for GAPI
        gapi.client.setToken({ access_token: response.access_token });
        setAccessToken(response.access_token);
        setTokenExpiration(expirationTime);

        // Fetch user profile
        await fetchAndSetUser(response.access_token);

    };

    const login = useCallback(() => {
        if (!tokenClient) {
            console.error("Token client not initialized");
            return;
        }

        // We can safely check gapi.client now because we wait for init in useEffect
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    }, [tokenClient]);

    const logout = useCallback(() => {
        const token = localStorage.getItem("google_access_token");
        if (token) {
            google.accounts.oauth2.revoke(token, () => {
                console.log('Consent revoked');
            });
        }
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("google_token_expiration");
        localStorage.removeItem("google_user_profile");
        setIsAuthenticated(false);
        setUser(null);
        setAccessToken(null);
        setTokenExpiration(null);
        if (gapi.client) gapi.client.setToken(null);
        setSessionExpired(false);
    }, []);

    const clearSessionExpired = useCallback(() => {
        setSessionExpired(false);
    }, []);

    // Token expiration handling: Instead of silent refresh, set sessionExpired flag
    // to prompt user for re-authentication (see AUTHENTICATION LIMITATION above)
    useEffect(() => {
        if (!accessToken || !tokenExpiration) return;

        const checkExpiration = () => {
            const now = Date.now();
            // Set expired 1 minute before actual expiration for buffer
            if (now >= tokenExpiration - 60_000) {
                setSessionExpired(true);
                // Clear the stored token since it's expired
                localStorage.removeItem("google_access_token");
                localStorage.removeItem("google_token_expiration");
                setAccessToken(null);
                setTokenExpiration(null);
                if (gapi.client) gapi.client.setToken(null);
            }
        };

        // Check immediately in case already expired
        checkExpiration();

        // Also set a timer to check when it should expire
        const timeUntilExpiry = tokenExpiration - Date.now() - 60_000;
        if (timeUntilExpiry > 0) {
            const timeoutId = window.setTimeout(checkExpiration, timeUntilExpiry);
            return () => window.clearTimeout(timeoutId);
        }
    }, [accessToken, tokenExpiration]);

    return (
        <GoogleAuthContext.Provider value={{ isAuthenticated, user, accessToken, login, logout, isLoading, tokenClient, sessionExpired, clearSessionExpired }}>
            {children}
        </GoogleAuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGoogleAuth() {
    const context = useContext(GoogleAuthContext);
    if (!context) {
        throw new Error("useGoogleAuth must be used within a GoogleAuthProvider");
    }
    return context;
}
