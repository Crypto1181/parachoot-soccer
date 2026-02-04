# Checking App Logs on Android (After Install)

Use these to capture logs from the installed Parachoot Soccer app so we can debug issues (e.g. SportSRC API, streams, "no live" on Live TV).

---

## 1. ADB Logcat (recommended)

**Prerequisites:** Android device connected via USB, USB debugging enabled, [platform-tools](https://developer.android.com/studio/releases/platform-tools) (includes `adb`) on your PATH.

### Filter by app package

```bash
adb logcat --pid=$(adb shell pidof -s com.parachoot.soccer)
```

If the app is not running, start it on the device first, then run the command.

### Filter by Chromium / WebView (JS console logs)

Our `console.log` / `console.error` from the web app often show up in Chromium logs:

```bash
adb logcat chromium:I *:S
```

Or broader:

```bash
adb logcat | findstr /i "chromium Console SportSRC StreamAggregator Capacitor"
```

(PowerShell: use `Select-String` instead of `findstr` if you prefer.)

### Save logs to a file

```bash
adb logcat -d > android-logs.txt
```

Then search the file for `[SportSRC]`, `[StreamAggregator]`, `Console`, or error messages.

### Useful SportSRC-related tags

We log with prefixes like:

- `[SportSRC]` – live matches, match detail, streams, skip (no stream)
- `[StreamAggregator]` – stream URL resolution

Search for those in the logcat output.

---

## 2. Chrome DevTools (WebView remote debugging)

1. On the device: **Settings → Developer options → Enable "USB debugging"** (and optionally "WebView debugging" if available).
2. Connect the device via USB.
3. On your computer, open Chrome and go to: **chrome://inspect**
4. Find **WebView in com.parachoot.soccer** and click **inspect**.
5. Use the **Console** tab to see `console.log` / `console.error` from the app in real time.

This is the most reliable way to see our JS logs (including SportSRC and stream logic).

---

## 3. Quick one-liners (PowerShell, Windows)

```powershell
# Restart ADB, then show logs (Ctrl+C to stop)
adb kill-server; adb start-server; adb logcat | Select-String -Pattern "SportSRC|StreamAggregator|chromium|Console|Error"
```

```powershell
# Same but save to file
adb logcat -d | Out-File -FilePath android-logs.txt -Encoding utf8
```

---

## 4. When reporting issues

Please share:

1. What you did (e.g. opened Live TV, tapped Retry, opened a match).
2. What you saw (e.g. "No live matches", a match with no play button).
3. Relevant log snippets:
   - Lines containing `[SportSRC]` or `[StreamAggregator]`
   - Any `Console` or `chromium` lines that look like errors or our `console.log` output

That will make it much easier to track down API, stream, or UI issues.
