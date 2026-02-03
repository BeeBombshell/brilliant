export { };

declare global {
    namespace google {
        namespace accounts {
            namespace oauth2 {
                function initTokenClient(config: any): TokenClient;
                function revoke(token: string, callback: () => void): void;
                interface TokenClient {
                    requestAccessToken(config?: any): void;
                }
                interface TokenResponse {
                    access_token: string;
                    expires_in: string;
                }
            }
        }
    }

    namespace gapi {
        function load(libraries: string, callbackOrConfig: (() => void) | { callback: () => void; onerror?: () => void }): void;
        namespace client {
            function init(config: any): Promise<void>;
            function setToken(token: { access_token: string } | null): void;
            function getToken(): any;
            namespace calendar {
                interface EventsResource {
                    list(params: any): Promise<any>;
                    insert(params: any): Promise<any>;
                    patch(params: any): Promise<any>;
                    delete(params: any): Promise<any>;
                }
                const events: EventsResource;
            }
        }
    }
}
