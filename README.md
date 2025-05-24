# rn-interaction-tracker

A lightweight React Native package to track anonymous user interactions (screen views, taps, gestures, and time spent on each screen) for privacy-friendly analytics and UX feedback.

## Purpose

`rn-interaction-tracker` is designed to help you understand how users interact with your React Native app. It can be used in two main ways:

- **Remote Analytics (Recommended for Production):**

  - Send interaction logs to your own analytics server using the `remoteEndpoint` prop.
  - This enables you to aggregate, analyze, and visualize user behavior across all users and sessions.
  - Ideal for product analytics, UX research, and business intelligence.

- **Local-Only Tracking (Development, Debugging, or User Export):**
  - If you do not set a `remoteEndpoint`, all logs are stored locally on the device using AsyncStorage.
  - Useful for:
    - Debugging and QA: See how users interact with your app during development.
    - User-controlled analytics: Let users export their own usage data for privacy, compliance, or support.
    - Offline analytics: Collect data in environments with limited network access, and export/upload later.
  - **Note:** Logs are not saved as a file in your project directory—they are stored in the app's private storage on the device. You can access/export them using the `exportLogs` function.

**For most real-world analytics use cases, you should set a `remoteEndpoint` to collect and analyze data centrally.**

## Features

- Track screen time automatically using React Navigation
- Track tap interactions with a hook
- Log custom events
- Store logs in memory and persist with AsyncStorage
- Export logs to JSON/CSV or send to remote endpoint
- Support batching and retry for remote sending
- Optional anonymous session ID (UUID)

## Installation

```sh
npm install rn-interaction-tracker
```

## Usage

### 1. Wrap Your App

Wrap your app (or navigation container) with the `InteractionProvider`:

```tsx
import { InteractionProvider } from "rn-interaction-tracker";

<InteractionProvider
	remoteEndpoint="https://yourapi.com/analytics"
	flushInterval={60}
	enableAnonymousId={true}
	autoTrackScreenTime={true}
>
	{children}
</InteractionProvider>;
```

**Props:**

- `remoteEndpoint` (string, optional): If provided, logs will be sent in batches to this URL via POST.
- `flushInterval` (number, seconds, default: 60): How often to send logs to the remote endpoint.
- `enableAnonymousId` (boolean, default: false): If true, generates a UUID for the session.
- `autoTrackScreenTime` (boolean, default: false): If true, will (in future) auto-track screen time using React Navigation.

---

### InteractionProvider Props

| Prop                  | Type    | Default   | Required | Description                                                              |
| --------------------- | ------- | --------- | -------- | ------------------------------------------------------------------------ |
| `children`            | node    | —         | **Yes**  | React children to be wrapped by the provider.                            |
| `remoteEndpoint`      | string  | undefined | No       | If set, logs will be POSTed to this URL in batches.                      |
| `flushInterval`       | number  | 60        | No       | Interval (in seconds) to send logs to remote endpoint.                   |
| `enableAnonymousId`   | boolean | false     | No       | If true, generates a UUID for the session and includes it in all events. |
| `autoTrackScreenTime` | boolean | false     | No       | If true, (future) auto-tracks screen time using React Navigation.        |

**Only `children` is mandatory. All other props are optional.**

---

### 2. Track Taps

```tsx
import { useTrackTap } from "rn-interaction-tracker";

const MyButton = () => {
	const trackTap = useTrackTap("MyButton");
	return <Button title="Tap me" onPress={trackTap} />;
};
```

This will log a tap event with the name "MyButton".

---

### 3. Log Custom Events

You can log any custom event at any time in your app. For example, you can log an event when a button is pressed:

```tsx
import { useInteractionTracker } from "rn-interaction-tracker";
import { Button } from "react-native";

const MyComponent = () => {
	const { logEvent } = useInteractionTracker();

	const handlePress = () => {
		// Log a custom event with type and data
		logEvent("button_press", { button: "SpecialButton", screen: "Home" });
		// ...your button logic
	};

	return <Button title="Press me" onPress={handlePress} />;
};
```

You can use `logEvent` anywhere in your component logic, not just for buttons. For example, log when a screen loads, a form is submitted, or any other user action:

```tsx
// Log when a screen loads
useEffect(() => {
	logEvent("screen_loaded", { screen: "Profile" });
}, []);
```

This flexibility allows you to track any interaction or event that matters to your app.

---

### 4. Export Logs

You can export all tracked events as a JSON or CSV string using the `exportLogs` function from the `useInteractionTracker` hook. This is useful for debugging, exporting analytics for offline analysis, or sending logs manually.

#### Example: Export Logs on Button Press

```tsx
import { useInteractionTracker } from "rn-interaction-tracker";
import { Button, Alert } from "react-native";

const ExportButton = () => {
	const { exportLogs } = useInteractionTracker();

	const handleExport = async () => {
		const jsonLogs = await exportLogs("json");
		// You can now send this string to a server, save to a file, or display it
		Alert.alert("Exported Logs", jsonLogs);
	};

	return <Button title="Export Logs" onPress={handleExport} />;
};
```

#### Example: Export Logs on App Exit or Background

You may want to export or upload logs when the app is about to close or goes to the background. You can use the `AppState` API from React Native:

```tsx
import { useInteractionTracker } from "rn-interaction-tracker";
import { useEffect } from "react";
import { AppState } from "react-native";

const useExportOnBackground = () => {
	const { exportLogs } = useInteractionTracker();

	useEffect(() => {
		const handleAppStateChange = async nextState => {
			if (nextState === "background") {
				const logs = await exportLogs("json");
				// Save logs, upload, or process as needed
			}
		};
		const sub = AppState.addEventListener("change", handleAppStateChange);
		return () => sub.remove();
	}, [exportLogs]);
};
```

#### When to Use `exportLogs`

- For debugging: View all tracked events in development.
- For manual export: Let users export their own interaction data.
- For offline analytics: Save logs to a file for later upload or analysis.
- For compliance: Allow users to request/download their interaction data.

You can call `exportLogs` at any time in your app, from any component wrapped in `InteractionProvider`.

---

### 5. What is the Expected Output?

- **In Memory:** All events are stored in memory and persisted to AsyncStorage.
- **Export:** When you call `exportLogs("json")`, you get an array of event objects like:

  ```json
  [
  	{
  		"type": "tap",
  		"timestamp": 1716612345678,
  		"data": { "name": "MyButton" },
  		"sessionId": "..." // if enabled
  	},
  	{
  		"type": "custom_event",
  		"timestamp": 1716612349999,
  		"data": { "foo": "bar" },
  		"sessionId": "..."
  	}
  ]
  ```

- **Remote Endpoint:** If `remoteEndpoint` is set, the provider will POST a batch of events to your endpoint every `flushInterval` seconds. The payload is:

  ```json
  {
    "events": [ ...event objects... ]
  }
  ```

  If the request fails, it will retry on the next interval.

---

### 6. How to Use `remoteEndpoint`

- Set the `remoteEndpoint` prop to your analytics server URL.
- The package will automatically POST logs as JSON to this endpoint.
- Your server should accept a POST request with a JSON body:

  ```json
  {
    "events": [ ... ]
  }
  ```

- On success (HTTP 2xx), the local log buffer is cleared. On failure, logs are retried on the next flush.

---

### 7. Example: Simple Backend for Receiving Events

Here is a sample Node.js/Express backend that accepts POST requests from `rn-interaction-tracker`:

```js
const express = require("express");
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Endpoint to receive analytics events
app.post("/analytics", (req, res) => {
	const { events } = req.body;
	if (!Array.isArray(events)) {
		return res.status(400).json({ error: "Invalid payload" });
	}
	// Here you can store events in a database, log them, etc.
	console.log("Received events:", events);
	res.status(200).json({ status: "ok" });
});

app.listen(port, () => {
	console.log(`Analytics server listening at http://localhost:${port}`);
});
```

- Save this as `server.js` and run with `node server.js` (after installing express: `npm install express`).
- Set your `remoteEndpoint` prop to `http://localhost:3000/analytics` during development.
- The server will log all received events to the console.

---

### 8. Example: Saving Events to a JSON File on the Server

If you want your backend to store all received events in a JSON file, you can use Node.js with the `fs` module. Here’s how you can modify the Express backend:

```js
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const port = 3000;

app.use(express.json());

const DATA_FILE = path.join(__dirname, "events.json");

// Helper to append events to a JSON file
function appendEventsToFile(events) {
	let existing = [];
	if (fs.existsSync(DATA_FILE)) {
		try {
			existing = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
		} catch (e) {
			existing = [];
		}
	}
	const updated = existing.concat(events);
	fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2));
}

app.post("/analytics", (req, res) => {
	const { events } = req.body;
	if (!Array.isArray(events)) {
		return res.status(400).json({ error: "Invalid payload" });
	}
	appendEventsToFile(events);
	res.status(200).json({ status: "ok" });
});

app.listen(port, () => {
	console.log(`Analytics server listening at http://localhost:${port}`);
});
```

- This will create or update an `events.json` file in the same directory as your server.
- All received events will be appended to the array in this file.
- For production, consider using a database or more robust file handling.

---

### How autoTrackScreenTime Works

The `autoTrackScreenTime` prop is designed to automatically track how much time a user spends on each screen in your app (when using React Navigation).

**Current status:**

- As of now, this feature is a placeholder and does not automatically track screen time out of the box.
- To enable this feature, the library needs to listen to navigation events (screen focus/blur) and log the time spent on each screen.

**How to manually track screen time with React Navigation:**

You can implement screen time tracking in your own screens using the `useInteractionTracker` hook and React Navigation's `useFocusEffect`:

```tsx
import { useFocusEffect } from '@react-navigation/native';
import { useInteractionTracker } from 'rn-interaction-tracker';
import React from 'react';

const MyScreen = () => {
  const { logEvent } = useInteractionTracker();
  let startTime = 0;

  useFocusEffect(
    React.useCallback(() => {
      startTime = Date.now();
      return () => {
        const duration = Date.now() - startTime;
        logEvent('screen_time', { screen: 'MyScreen', duration });
      };
    }, [])
  );

  return (
    // ...your screen content...
  );
};
```

**What will be logged:**

- Each time the user leaves the screen, an event like this will be logged:
  ```json
  {
  	"type": "screen_time",
  	"timestamp": 1716612345678,
  	"data": { "screen": "MyScreen", "duration": 12345 },
  	"sessionId": "..." // if enabled
  }
  ```

**Planned:**

- In a future release, setting `autoTrackScreenTime={true}` will automatically track screen time for all screens if you use React Navigation and wrap your navigation container with `InteractionProvider`.

---
