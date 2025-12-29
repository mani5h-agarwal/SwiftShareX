# SwiftShareX 🚀

**Blazing fast, file sharing for Android.**

SwiftShareX is the next-generation file transfer app, built with React Native and powered by a C++ TCP engine for maximum speed. Share files of any size (even multi-GB) at up to **10MB/s** on 5GHz Wi-Fi, with a beautiful, modern UI and zero data collection.

---

## 📱 Screenshots

<div align="center">

<!-- Add your screenshots below -->
<table>
	<tr>
		<td><img src="screenshot1.png" alt="Screenshot 1" width="250"/></td>
		<td><img src="screenshot2.png" alt="Screenshot 2" width="250"/></td>
		<td><img src="screenshot3.png" alt="Screenshot 3" width="250"/></td>
	</tr>
	<tr>
		<td><img src="screenshot4.png" alt="Screenshot 4" width="250"/></td>
		<td><img src="screenshot5.png" alt="Screenshot 5" width="250"/></td>
		<td><img src="screenshot6.png" alt="Screenshot 6" width="250"/></td>
	</tr>
	<tr>
		<td><img src="screenshot7.png" alt="Screenshot 7" width="250"/></td>
		<td><img src="screenshot8.png" alt="Screenshot 8" width="250"/></td>
		<td><img src="screenshot9.png" alt="Screenshot 9" width="250"/></td>
	</tr>
</table>

</div>

---

## ✨ Key Features

- **🚀 Ultra-fast Transfers**: Up to 10MB/s on 5GHz Wi-Fi
- **📂 No File Size Limit**: Send and receive files of any size, even multi-GB
- **🔌 100% Offline**: Works over local Wi-Fi or hotspot, no internet needed
- **🔒 Private & Secure**: No data collection, no cloud, direct device-to-device
- **⚡ C++ TCP Engine**: All transfer logic is native C++ for maximum speed
- **📱 Modern UI**: Animated, intuitive, and beautiful interface
- **🔍 Instant Device Discovery**: Find nearby devices in seconds
- **🗂️ All File Types**: Share photos, videos, documents, and more
- **🛡️ End-to-end encrypted**: Your files never leave your devices

---

## 🏗️ Architecture Overview

- **React Native** for cross-platform UI (Android & iOS)
- **C++ TCP/UDP Engine** for all file transfer logic (native module)
- **Modular Components**: DeviceCard, FileItemComponent, RoleButton, ActionRow, TabBar, etc.
- **Screens**: ChooseRole, DevicePicker, Session (Send/Receive)
- **Custom Hooks**: Device info, file utilities
- **Native Modules**: For file system, device info, UDP/TCP sockets
- **No file size limits**: Optimized for large files and high throughput
- **Files saved in**: `Downloads/SwiftShareX` (Android)

---

## 📊 Performance

- **Speed**: Up to 10MB/s on 5GHz Wi-Fi
- **File Size**: Tested with files of several GBs
- **No artificial limits**: Transfer as much as your device/network allows

---

## 🔐 Privacy & Security

- **Zero Data Collection**: No analytics, no tracking, no ads
- **Direct Connection**: Device-to-device, never via cloud
- **End-to-end encrypted**: All transfers are private

---

## 🛠️ How It Works

1. **Connect to Wi-Fi**: Both devices join the same Wi-Fi or hotspot
2. **Open SwiftShareX**: Choose Send or Receive
3. **Device Discovery**: Instantly find nearby devices
5. **Select Files**: Pick any files, any size
6. **Transfer**: Enjoy lightning-fast, direct transfers

---

## 📖 Usage Guide

### Setting Up

1. Install SwiftShareX on both devices
2. Connect both to the same Wi-Fi or hotspot
3. Open the app and choose your role (Send/Receive)
4. Pair devices using QR code

### Sharing Files

1. Tap "Select Files" to pick files
2. Tap "Send" to start transfer
3. Monitor real-time progress
4. Files are saved in the SwiftShareX folder

---

## 👥 Who Is It For?

- **Students**: Share notes, assignments, and media
- **Professionals**: Transfer large work files securely
- **Friends & Family**: Share photos, videos, and memories
- **Anyone**: Who values speed, privacy, and simplicity

---

## 📱 System Requirements

- **Platform**: Android 6.0+
- **Network**: Wi-Fi or hotspot

---

## 🧩 Project Structure

- `App.tsx` — Main app logic, state, and navigation
- `src/screens/` — ChooseRole, DevicePicker, Session
- `src/components/` — UI components (DeviceCard, FileItem, etc.)
- `src/utils/` — File utilities
- `src/hooks/` — Custom hooks
- `src/modals/` — Modals for confirmations
- `src/assets/` — Images, icons, etc.

---

## 🛠️ Development & Setup

1. Clone the repo
2. Install dependencies: `npm install` or `yarn`
3. Start Metro: `npm start` or `yarn start`
4. Run on Android: `npm run android` or `yarn android`

---

## 📄 License

MIT
