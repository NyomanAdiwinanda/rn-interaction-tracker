import React, { createContext, useContext, useRef, useEffect, useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";

// Types
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

const InteractionTrackerContext = createContext<InteractionTrackerContextType | undefined>(undefined);

// Helper: Convert events to CSV
function toCSV(events: InteractionEvent[]): string {
	if (events.length === 0) return "";
	const keys = Object.keys(events[0]);
	const header = keys.join(",");
	const rows = events.map(e => keys.map(k => JSON.stringify((e as any)[k] ?? "")).join(","));
	return [header, ...rows].join("\n");
}

// Main Provider
export const InteractionProvider: React.FC<InteractionProviderProps> = ({
	children,
	remoteEndpoint,
	flushInterval = 60,
	enableAnonymousId = false,
	autoTrackScreenTime = false,
}) => {
	const [sessionId] = useState(() => (enableAnonymousId ? uuidv4() : undefined));
	const eventsRef = useRef<InteractionEvent[]>([]);
	const flushTimeout = useRef<NodeJS.Timeout | null>(null);
	const isFlushing = useRef(false);

	// Load persisted events on mount
	useEffect(() => {
		(async () => {
			const stored = await AsyncStorage.getItem("rn_interaction_events");
			if (stored) eventsRef.current = JSON.parse(stored);
		})();
	}, []);

	// Persist events on change
	const persist = useCallback(async () => {
		await AsyncStorage.setItem("rn_interaction_events", JSON.stringify(eventsRef.current));
	}, []);

	// Log event
	const logEvent = useCallback(
		(type: string, data?: Record<string, any>) => {
			const event: InteractionEvent = {
				type,
				timestamp: Date.now(),
				...(data ? { data } : {}),
				...(sessionId ? { sessionId } : {}),
			};
			eventsRef.current.push(event);
			persist();
		},
		[persist, sessionId]
	);

	// Export logs
	const exportLogs = useCallback(async (format: "json" | "csv") => {
		const events = eventsRef.current;
		if (format === "json") return JSON.stringify(events, null, 2);
		return toCSV(events);
	}, []);

	// Flush to remote
	const flush = useCallback(async () => {
		if (!remoteEndpoint || isFlushing.current) return;
		isFlushing.current = true;
		const events = eventsRef.current;
		if (events.length === 0) {
			isFlushing.current = false;
			return;
		}
		try {
			const res = await fetch(remoteEndpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ events }),
			});
			if (res.ok) {
				eventsRef.current = [];
				await persist();
			}
		} catch (e) {
			// retry on next flush
		} finally {
			isFlushing.current = false;
		}
	}, [remoteEndpoint, persist]);

	// Auto flush
	useEffect(() => {
		if (!remoteEndpoint) return;
		// @ts-ignore
		flushTimeout.current = setInterval(flush, flushInterval * 1000);
		return () => {
			if (flushTimeout.current) clearInterval(flushTimeout.current as any);
		};
	}, [remoteEndpoint, flush, flushInterval]);

	// Auto track screen time (requires React Navigation)
	useEffect(() => {
		if (!autoTrackScreenTime) return;
		// This is a placeholder. Real implementation should use navigation listeners.
		// logEvent('screen_view', { screen: 'ScreenName' });
	}, [autoTrackScreenTime, logEvent]);

	const value: InteractionTrackerContextType = {
		logEvent,
		exportLogs,
		flush,
		sessionId,
	};

	// Fix: Use React.createElement for provider to avoid JSX parsing issues in .ts files
	return React.createElement(InteractionTrackerContext.Provider, { value }, children);
};

// Hook to use tracker
export function useInteractionTracker() {
	const ctx = useContext(InteractionTrackerContext);
	if (!ctx) throw new Error("useInteractionTracker must be used within InteractionProvider");
	return ctx;
}

// Hook to track taps
export function useTrackTap(name: string) {
	const { logEvent } = useInteractionTracker();
	return useCallback(() => {
		logEvent("tap", { name });
	}, [logEvent, name]);
}
