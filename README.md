# PromptBox 🚀

PromptBox is a premium Electron desktop application designed for AI enthusiasts, developers, and writers to manage, organize, tag, and instantly copy their AI prompt templates.

---

## Key Features

- **Organized Folders**: Group related prompt templates into folders with active category indicators and prompt counters.
- **Fast Search & Filters**: Perform global text searches matching prompt titles, contents, and keywords. Filter list dynamically by clicking hashtag categories.
- **Click-to-Copy Monospace Editor**: View prompts in a clean monospace display box, and copy contents with a single click, supported by a smooth visual "Copied!" feedback state.
- **Custom Design System**: Dashboard styled with vanilla CSS featuring Outfit & Inter typography, cyan/indigo accents, and switchable dark/light themes (your choice is remembered between sessions).
- **Zero Configuration DB**: Local, lightweight JSON database (`prompts-db.json`) written to your local app storage directory. Safe, fast, and easy to back up.
- **Backup & Restore**: Export all folders and prompts to a single JSON file, and import it on another workstation to restore your library (import/export buttons in the sidebar footer).

---

## Installation

Prebuilt installers for Windows (`.exe`), macOS (`.dmg`), and Linux (`.AppImage`) are published automatically for every version on the [Releases page](https://github.com/sebbourgeois/promptbox/releases). Download the file for your platform and run it.

> **Note:** Builds are currently unsigned, so Windows SmartScreen and macOS Gatekeeper may show a warning on first launch.

---

## Getting Started (from source)

### Prerequisites

You will need [Node.js](https://nodejs.org/) (which includes `npm`) installed on your system.

### Development Setup

1. Clone the repository and move into it:
   ```bash
   git clone https://github.com/sebbourgeois/promptbox.git
   cd promptbox
   ```

2. Install the required Node packages (including `electron` and build utilities):
   ```bash
   npm install
   ```

3. Start the application in development mode:
   ```bash
   npm start
   ```

---

## Compiling & Packaging (Win, Mac, Linux)

PromptBox is pre-configured with **`electron-builder`** to compile the application into ready-to-run binaries and installers for Windows, macOS, and Linux.

The output packages will be saved to the `./dist` folder.

### Compilation Commands

Run the appropriate script command based on your target operating system:

| Platform | Command | Target Format | Notes |
| :--- | :--- | :--- | :--- |
| **Windows** | `npm run build:win` | `.exe` (NSIS Installer) | Compiles Windows NSIS executable |
| **macOS** | `npm run build:mac` | `.dmg` | DMG installer. Requires a Mac device. |
| **Linux** | `npm run build:linux` | `.AppImage` | Portable Linux executable format |
| **All Platforms** | `npm run build:all` | All formats | Attempts to package for all targets |

### Build Configurations

You can modify compile parameters in the `"build"` block of [package.json](package.json). This includes:
- **`appId`**: The bundle identifier (e.g., `com.sebbourgeois.promptbox`).
- **`productName`**: The name displayed on the system app menus (e.g., `PromptBox`).
- **Target Builders**: Options like NSIS config, Category keys on Mac, or Linux packaging formats.

### Important Build Notes
- **macOS Compilation**: To build a macOS `.dmg` package, you **must** run the build script from a macOS system.
- **Code Signing**: When distributing to public audiences, you will need certificates (e.g., Apple Developer Program membership for macOS, or Authenticode Certificate for Windows SmartScreen) to avoid OS warnings about unverified software.

---

## License

PromptBox is open source software released under the [MIT License](LICENSE).

You are free to **use, modify, fork, and redistribute** this project — including for commercial purposes — as long as you **credit the original repository**: keep the copyright and license notice from the [LICENSE](LICENSE) file in your copy, and please include a link back to the original repo in your fork or derivative work.