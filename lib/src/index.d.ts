import React from "react";
export type InteractionEvent = {
    type: string;
    timestamp: number;
    data?: Record<string, any>;
};
export type InteractionTrackerContextType = {
    logEvent: (type: string, data?: Record<string, any>) => void;
    exportLogs: (format: "json" | "csv") => Promise<string>;
    flush: () => Promise<void>;
    sessionId?: string;
};
export type InteractionProviderProps = {
    children: React.ReactNode;
    remoteEndpoint?: string;
    flushInterval?: number;
    enableAnonymousId?: boolean;
    autoTrackScreenTime?: boolean;
};
export declare const InteractionProvider: React.FC<InteractionProviderProps>;
export declare function useInteractionTracker(): InteractionTrackerContextType;
export declare function useTrackTap(name: string): () => void;
