"use client";

import React, { Component, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center shadow-sm">
                    <div className="mb-4 flex items-center justify-center rounded-full bg-destructive/10 p-3 text-destructive">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">Something went wrong</h3>
                    <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                        {this.state.error?.message || "An unexpected error occurred in this component."}
                    </p>
                    <Button
                        onClick={this.handleReset}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Try again
                    </Button>
                    {process.env.NODE_ENV === "development" && this.state.error?.stack && (
                        <details className="mt-4 w-full text-left">
                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                Stack trace
                            </summary>
                            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/50 p-3 text-[10px] text-muted-foreground font-mono">
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
