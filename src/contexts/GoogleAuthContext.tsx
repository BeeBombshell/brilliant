import { createContext, useContext, useEffect, useState, useCallback } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

interface GoogleAuthContextType {
    isAuthenticated: boolean;
    user: GoogleUser | null;
    login: () => void;
    logout: () => void;
    isLoading: boolean;
    tokenClient: google.accounts.oauth2.TokenClient | null;
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
    const [isLoading, setIsLoading] = useState(true);
    const [tokenClient, setTokenClient] = useState<google.accounts.oauth2.TokenClient | null>(null);

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
                    setIsAuthenticated(true);
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    }
                } else {
                    // Clear invalid/expired session
                    localStorage.removeItem("google_access_token");
                    localStorage.removeItem("google_token_expiration");
                    localStorage.removeItem("google_user_profile");
                    gapi.client.setToken(null);
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
    }, []);

    const handleLoginSuccess = async (response: google.accounts.oauth2.TokenResponse) => {
        const expiresIn = parseInt(response.expires_in) * 1000;
        const expirationTime = Date.now() + expiresIn;

        localStorage.setItem("google_access_token", response.access_token);
        localStorage.setItem("google_token_expiration", expirationTime.toString());

        // Set token for GAPI
        gapi.client.setToken({ access_token: response.access_token });

        // Fetch user profile
        try {
            const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${response.access_token}` },
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

        setIsAuthenticated(true);
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
        if (gapi.client) gapi.client.setToken(null);
    }, []);

    return (
        <GoogleAuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading, tokenClient }}>
            {children}
        </GoogleAuthContext.Provider>
    );
}

export function useGoogleAuth() {
    const context = useContext(GoogleAuthContext);
    if (!context) {
        throw new Error("useGoogleAuth must be used within a GoogleAuthProvider");
    }
    return context;
}
