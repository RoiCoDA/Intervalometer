# Intervalometer

A hands-free timed procedure runner for Android. Define multi-step routines with exact durations for each step, then run them one step at a time — advancing with a voice command or a button tap.

Built with [Expo](https://expo.dev) and React Native.

---

## What it does

Intervalometer lets you build procedures made up of timed steps, then execute them in sequence. Each step runs a countdown; when time is up, a beep sounds and the app waits for you to say **"Go!"** or press **Continue** before moving to the next one. When all steps are done, the procedure ends automatically.

Designed for situations where your hands are busy — lab work, physical training, equipment startup sequences, cooking, or any task that benefits from a spoken cue instead of a button press.

---

## App flow

### 1. Main Menu
Browse your saved procedures. Tap any card to select it, or tap **+** to create a new one. You can also search by name and delete procedures you no longer need.

### 2. Create a Procedure
**2.1 — Name & description**
Give the procedure a name (required) and an optional description, then tap **Next**.

**2.2 — Add steps**
Add as many steps as you need. Each step has:
- A name
- A duration — enter any value and pick the unit (ms / sec / min / hr)

Steps can be reordered, edited, or deleted before saving.

**2.3 — Save**
Tap **Finalize & Save** once you have at least one step. The procedure appears in your main menu immediately.

### 3. Run a Procedure
Select a procedure from the main menu and tap **Start**.

**3.1 — Step execution**
- The active step shows a countdown timer and a progress bar.
- Completed steps are greyed out with a checkmark.
- Upcoming steps are listed below in order.

When the timer hits zero:
- A beep plays.
- The app starts listening for **"Go!"**
- Say it aloud, or tap **Continue** to advance manually.

**3.2 — Repeat until done**
Steps advance one by one until the last one completes, at which point the app shows a completion message and returns to the main menu.

You can exit at any time using the **Exit** button — a confirmation prompt prevents accidental exits.

---

## Building the APK

No pre-built APK is provided. To build your own:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/): `npm install -g expo-cli`
- [EAS CLI](https://docs.expo.dev/build/introduction/): `npm install -g eas-cli`
- An [Expo account](https://expo.dev/signup) (free)
- An Android device or emulator for testing

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/RoiCoDA/Intervalometer.git
cd Intervalometer/Intervalometer

# 2. Install dependencies
npm install

# 3. Log in to Expo
eas login

# 4. Build a local APK (no Expo account build quota used)
eas build --platform android --profile preview --local
```

The `preview` profile produces a standalone `.apk` you can sideload onto any Android device.

> **Note:** First-time builds download the Android build tools automatically and may take a few minutes.

To install the APK on a device:
```bash
adb install path/to/your-build.apk
```
Or transfer the file to your phone and open it directly (enable *Install from unknown sources* in Android settings if prompted).

---

## Permissions

The app requests the following Android permissions at runtime:

| Permission | Why |
|---|---|
| `RECORD_AUDIO` | Microphone access for voice recognition |
| `INTERNET` | Required by the speech recognition service |

---

## Tech stack

| Layer | Library |
|---|---|
| Framework | Expo + React Native |
| Routing | expo-router |
| Storage | @react-native-async-storage/async-storage |
| Voice recognition | @dev-amirzubair/react-native-voice |
| Audio | expo-av |
| Icons | @expo/vector-icons (Ionicons) |
| Language | TypeScript |

---

## License

MIT
