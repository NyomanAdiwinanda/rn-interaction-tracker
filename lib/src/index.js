"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionProvider = void 0;
exports.useInteractionTracker = useInteractionTracker;
exports.useTrackTap = useTrackTap;
const react_1 = __importStar(require("react"));
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const uuid_1 = require("uuid");
const InteractionTrackerContext = (0, react_1.createContext)(undefined);
// Helper: Convert events to CSV
function toCSV(events) {
    if (events.length === 0)
        return "";
    const keys = Object.keys(events[0]);
    const header = keys.join(",");
    const rows = events.map(e => keys.map(k => { var _a; return JSON.stringify((_a = e[k]) !== null && _a !== void 0 ? _a : ""); }).join(","));
    return [header, ...rows].join("\n");
}
// Main Provider
const InteractionProvider = ({ children, remoteEndpoint, flushInterval = 60, enableAnonymousId = false, autoTrackScreenTime = false, }) => {
    const [sessionId] = (0, react_1.useState)(() => (enableAnonymousId ? (0, uuid_1.v4)() : undefined));
    const eventsRef = (0, react_1.useRef)([]);
    const flushTimeout = (0, react_1.useRef)(null);
    const isFlushing = (0, react_1.useRef)(false);
    // Load persisted events on mount
    (0, react_1.useEffect)(() => {
        (async () => {
            const stored = await async_storage_1.default.getItem("rn_interaction_events");
            if (stored)
                eventsRef.current = JSON.parse(stored);
        })();
    }, []);
    // Persist events on change
    const persist = (0, react_1.useCallback)(async () => {
        await async_storage_1.default.setItem("rn_interaction_events", JSON.stringify(eventsRef.current));
    }, []);
    // Log event
    const logEvent = (0, react_1.useCallback)((type, data) => {
        const event = Object.assign(Object.assign({ type, timestamp: Date.now() }, (data ? { data } : {})), (sessionId ? { sessionId } : {}));
        eventsRef.current.push(event);
        persist();
    }, [persist, sessionId]);
    // Export logs
    const exportLogs = (0, react_1.useCallback)(async (format) => {
        const events = eventsRef.current;
        if (format === "json")
            return JSON.stringify(events, null, 2);
        return toCSV(events);
    }, []);
    // Flush to remote
    const flush = (0, react_1.useCallback)(async () => {
        if (!remoteEndpoint || isFlushing.current)
            return;
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
        }
        catch (e) {
            // retry on next flush
        }
        finally {
            isFlushing.current = false;
        }
    }, [remoteEndpoint, persist]);
    // Auto flush
    (0, react_1.useEffect)(() => {
        if (!remoteEndpoint)
            return;
        // @ts-ignore
        flushTimeout.current = setInterval(flush, flushInterval * 1000);
        return () => {
            if (flushTimeout.current)
                clearInterval(flushTimeout.current);
        };
    }, [remoteEndpoint, flush, flushInterval]);
    // Auto track screen time (requires React Navigation)
    (0, react_1.useEffect)(() => {
        if (!autoTrackScreenTime)
            return;
        // This is a placeholder. Real implementation should use navigation listeners.
        // logEvent('screen_view', { screen: 'ScreenName' });
    }, [autoTrackScreenTime, logEvent]);
    const value = {
        logEvent,
        exportLogs,
        flush,
        sessionId,
    };
    // Fix: Use React.createElement for provider to avoid JSX parsing issues in .ts files
    return react_1.default.createElement(InteractionTrackerContext.Provider, { value }, children);
};
exports.InteractionProvider = InteractionProvider;
// Hook to use tracker
function useInteractionTracker() {
    const ctx = (0, react_1.useContext)(InteractionTrackerContext);
    if (!ctx)
        throw new Error("useInteractionTracker must be used within InteractionProvider");
    return ctx;
}
// Hook to track taps
function useTrackTap(name) {
    const { logEvent } = useInteractionTracker();
    return (0, react_1.useCallback)(() => {
        logEvent("tap", { name });
    }, [logEvent, name]);
}
