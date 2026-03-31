# SwiftShareX 🚀

**Blazing fast, cross-platform file sharing for Windows, macOS & Android.**

SwiftShareX is a high-performance file transfer application built with **React Native** and powered by a custom **C++ TCP engine**. It allows you to share files of any size (even multi-GB) over your local Wi-Fi or hotspot at speeds up to **80MB/s**—no internet required and zero data collection.

---

## 📥 Downloads

Get the latest version of SwiftShareX for all your devices:

- **🌐 [Official Website](https://mani5h-agarwal.github.io/SwiftShareX/)** (Recommended)
- **📦 [GitHub Releases](https://github.com/mani5h-agarwal/SwiftShareX/releases/latest)**

---

## 📱 Screenshots

<div align="center">

<!-- Add your screenshots below -->
<table>
	<tr>
		<td><img src="https://github.com/user-attachments/assets/04f128c9-001b-409f-90e0-56f62fb6092e" alt="Screenshot 1" width="250"/></td>
		<td><img src="https://github.com/user-attachments/assets/fbaa8547-4d41-4cb6-8158-1f7c57cacd63" alt="Screenshot 2" width="250"/></td>
		<td><img src="https://github.com/user-attachments/assets/65505afe-2248-4439-ba27-2945592dbb75" alt="Screenshot 3" width="250"/></td>
	</tr>
	<tr>
		<td><img src="https://github.com/user-attachments/assets/8e934565-2aa8-4320-9ea0-6c7be45aaff5" alt="Screenshot 4" width="250"/></td>
		<td><img src="https://github.com/user-attachments/assets/ce68bcff-14fa-4804-b1a2-ad9bac4f1cb6" alt="Screenshot 5" width="250"/></td>
		<td><img src="https://github.com/user-attachments/assets/07c55115-717b-40a5-9af5-11334984148c" alt="Screenshot 6" width="250"/></td>
	</tr>
	<tr>
		<td><img src="https://github.com/user-attachments/assets/025e205a-776a-4691-bd27-9da7b47a8519" alt="Screenshot 7" width="250"/></td>
		<td><img src="https://github.com/user-attachments/assets/43c0f7bc-fb85-4ad4-b879-07e48d9a5094" alt="Screenshot 8" width="250"/></td>
		<td><img src="https://github.com/user-attachments/assets/34e81ae6-43ee-47b5-8adb-b2404509a8da" alt="Screenshot 9" width="250"/></td>
	</tr>
</table>

</div>

---

## ✨ Key Features

- **🚀 Ultra-fast Transfers**: Optimized TCP engine hitting up to **80MB/s** on 5GHz Wi-Fi.
- **📂 No File Size Limit**: Send and receive multi-GB files without compression or limits.
- **🔌 100% Offline**: Works over local networks or mobile hotspots—no mobile data used.
- **🔒 Private & Secure**: Zero data collection, no cloud intermediary, direct device-to-device.
- **⚡ C++ Core**: All transfer logic is written in native C++ for maximum throughput.
- **📱 Modern UI**: A clean, animated interface built for mobile and desktop.
- **🔍 Instant Discovery**: Find nearby devices automatically using UDP broadcasts.
- **🛡️ End-to-End**: Your files never leave your local network.

---

## 🍏 macOS — First Launch Setup

> [!IMPORTANT]
> Because SwiftShareX is a community-built application, macOS will block it on the first launch. Follow these steps to open it:

1.  Open the **.dmg** and drag SwiftShareX to **Applications**.
2.  Launch it — macOS will show a security warning. Click **Done**.
3.  Go to **System Settings → Privacy & Security**.
4.  Scroll down to the "Security" section and click **Open Anyway** next to SwiftShareX.
5.  Confirm with **Open**. You're all set!

---

## 🏗️ Architecture Overview

SwiftShareX uses a modern, high-performance stack:

- **React Native**: Cross-platform UI for Android and iOS.
- **Electron**: Powers the Desktop experience for Windows and macOS.
- **C++ TCP/UDP Engine**: A custom native module (via JSI) that handles all high-speed socket logic.
- **GitHub Actions**: Automated CI/CD pipeline that builds and releases the app for all platforms on every version tag (`v*`).

---

## 🛠️ How It Works

1.  **Connect**: Ensure both devices are on the same Wi-Fi or one is on a hotspot.
2.  **Open**: Launch SwiftShareX on both devices and choose **Send** or **Receive**.
3.  **Discover**: Nearby devices appear instantly on the screen.
4.  **Transfer**: Select your files and watch them fly!

---

## 📱 System Requirements

- **Android**: Android 6.0 (API 23) or higher.
- **Windows**: Windows 10 (1903) or higher.
- **macOS**: macOS 10.15 (Catalina) or higher.
- **Hardware**: A Wi-Fi adapter is required.

---

## 🧩 Project Structure

- `App.tsx` — Main application logic and state management.
- `desktop/` — Electron integration for Windows and macOS.
- `src/screens/` — ChooseRole, DevicePicker, and Session screens.
- `src/components/` — UI components like `RoleButton` and `ActionRow`.
- `docs/` — Source for the official landing page.
- `.github/workflows/` — Release automation scripts.

---

## 👥 Privacy

SwiftShareX values your privacy. We do not track you, collect your data, or require an account. Everything happens locally on your own network.

---

&copy; 2026 SwiftShareX 🚀
