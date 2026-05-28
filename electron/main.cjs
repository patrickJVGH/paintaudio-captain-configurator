const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const MIDI_PAGE_FILE_REGEX = /^page\d+\.txt$/i;
const MAX_ALLOWED_TXT_SIZE = 2 * 1024 * 1024;
const deviceCache = new Map();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

let staticServer = null;

function normalizePath(inputPath) {
  const resolved = path.resolve(inputPath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isPathInside(parentPath, childPath) {
  const parent = normalizePath(parentPath);
  const child = normalizePath(childPath);
  return child === parent || child.startsWith(`${parent}${path.sep}`);
}

function ensureValidPageName(fileName) {
  if (typeof fileName !== "string" || !MIDI_PAGE_FILE_REGEX.test(fileName)) {
    throw new Error("Nome de arquivo invalido. Somente pageN.txt e permitido.");
  }
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function getDistPath() {
  return path.join(app.getAppPath(), "dist");
}

async function readFileIfExists(filePath) {
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) {
      return null;
    }
    return await fsp.readFile(filePath);
  } catch {
    return null;
  }
}

async function safeReaddir(dirPath) {
  try {
    return await fsp.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function createStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      try {
        const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
        const pathname = decodeURIComponent(requestUrl.pathname);
        const normalizedPath = pathname === "/" ? "/index.html" : pathname;
        const candidatePath = path.join(rootDir, normalizedPath);

        if (!isPathInside(rootDir, candidatePath)) {
          response.writeHead(403);
          response.end("Forbidden");
          return;
        }

        let payload = await readFileIfExists(candidatePath);
        let filePath = candidatePath;

        if (!payload) {
          filePath = path.join(rootDir, "index.html");
          payload = await readFileIfExists(filePath);
        }

        if (!payload) {
          response.writeHead(404);
          response.end("Not Found");
          return;
        }

        response.writeHead(200, {
          "Content-Type": contentTypeFor(filePath),
          "Cache-Control": "no-cache",
        });
        response.end(payload);
      } catch {
        response.writeHead(500);
        response.end("Internal Server Error");
      }
    });

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not resolve local server port."));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

async function ensureServer() {
  if (staticServer) {
    return staticServer;
  }

  const distPath = getDistPath();
  if (!fs.existsSync(distPath)) {
    throw new Error(`Missing dist folder at: ${distPath}. Run "npm run build" first.`);
  }

  staticServer = await createStaticServer(distPath);
  return staticServer;
}

async function listRemovableDrives() {
  if (process.platform !== "win32") {
    return [];
  }

  const script = `
    $drives = Get-CimInstance Win32_LogicalDisk -Filter "DriveType = 2" |
      Select-Object @{Name='root';Expression={ "$($_.DeviceID)\\" }}, @{Name='label';Expression={ $_.VolumeName }}
    $drives | ConvertTo-Json -Compress
  `;

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true, maxBuffer: 1024 * 1024 },
    );

    if (!stdout || !stdout.trim()) {
      return [];
    }

    const parsed = JSON.parse(stdout.trim());
    const items = Array.isArray(parsed) ? parsed : [parsed];

    return items
      .filter((item) => item && typeof item.root === "string")
      .map((item) => ({
        root: item.root,
        label: typeof item.label === "string" ? item.label : "",
      }));
  } catch {
    return [];
  }
}

async function collectPageFiles(dirPath) {
  const entries = await safeReaddir(dirPath);
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile() || !MIDI_PAGE_FILE_REGEX.test(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dirPath, entry.name);
    try {
      const stat = await fsp.stat(absolutePath);
      files.push({
        name: entry.name,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    } catch {
      // Ignore unreadable files.
    }
  }

  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return files;
}

async function findBestConfigFolder(rootPath) {
  const queue = [{ dir: path.resolve(rootPath), depth: 0 }];
  const matches = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const files = await collectPageFiles(current.dir);
    if (files.length > 0) {
      matches.push({
        configPath: current.dir,
        depth: current.depth,
        files,
      });
    }

    if (current.depth >= 2) {
      continue;
    }

    const entries = await safeReaddir(current.dir);
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const fullPath = path.join(current.dir, entry.name);
      queue.push({ dir: fullPath, depth: current.depth + 1 });
    }
  }

  if (matches.length === 0) {
    return null;
  }

  matches.sort((a, b) => b.files.length - a.files.length || a.depth - b.depth);
  return matches[0];
}

async function scanMidiCaptainDevices() {
  const drives = await listRemovableDrives();
  const devices = [];

  for (const drive of drives) {
    const match = await findBestConfigFolder(drive.root);
    if (!match) {
      continue;
    }

    const id = `${drive.root}|${match.configPath}`;
    const label = drive.label
      ? `${drive.label} (${drive.root})`
      : `Dispositivo removivel (${drive.root})`;

    devices.push({
      id,
      label,
      root: drive.root,
      configPath: match.configPath,
      files: match.files,
    });
  }

  deviceCache.clear();
  for (const device of devices) {
    deviceCache.set(device.id, device);
  }

  return devices;
}

async function getDeviceOrThrow(deviceId) {
  if (typeof deviceId !== "string" || !deviceId.trim()) {
    throw new Error("Dispositivo invalido.");
  }

  let device = deviceCache.get(deviceId);
  if (!device) {
    const scanned = await scanMidiCaptainDevices();
    device = scanned.find((item) => item.id === deviceId);
  }

  if (!device) {
    throw new Error("MIDI Captain nao encontrado. Conecte via USB e tente novamente.");
  }

  return device;
}

function resolveDeviceFilePath(device, fileName) {
  ensureValidPageName(fileName);
  const resolved = path.resolve(device.configPath, fileName);
  if (!isPathInside(device.configPath, resolved)) {
    throw new Error("Acesso de arquivo bloqueado.");
  }
  return resolved;
}

function setupIpcHandlers() {
  ipcMain.handle("midi-captain:scan", async () => {
    return await scanMidiCaptainDevices();
  });

  ipcMain.handle("midi-captain:read-file", async (_event, request) => {
    const device = await getDeviceOrThrow(request?.deviceId);
    const filePath = resolveDeviceFilePath(device, request?.fileName);

    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) {
      throw new Error("Arquivo nao encontrado no dispositivo.");
    }
    if (stat.size > MAX_ALLOWED_TXT_SIZE) {
      throw new Error("Arquivo muito grande para carregar.");
    }

    const content = await fsp.readFile(filePath, "utf8");
    return {
      fileName: request.fileName,
      content,
    };
  });

  ipcMain.handle("midi-captain:write-file", async (_event, request) => {
    const device = await getDeviceOrThrow(request?.deviceId);
    const filePath = resolveDeviceFilePath(device, request?.fileName);

    if (typeof request?.content !== "string") {
      throw new Error("Conteudo invalido.");
    }

    let backupPath = null;
    try {
      await fsp.access(filePath, fs.constants.F_OK);
      const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
      backupPath = `${filePath}.bak-${stamp}`;
      await fsp.copyFile(filePath, backupPath);
    } catch {
      backupPath = null;
    }

    await fsp.writeFile(filePath, request.content, "utf8");

    return {
      ok: true,
      fileName: request.fileName,
      backupPath,
    };
  });
}

function createWindow(startUrl) {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(startUrl);
}

async function launch() {
  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    createWindow(startUrl);
    return;
  }

  const { port } = await ensureServer();
  createWindow(`http://127.0.0.1:${port}`);
}

app.whenReady().then(async () => {
  setupIpcHandlers();

  try {
    await launch();
  } catch (error) {
    console.error(error);
    app.quit();
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await launch();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (staticServer && staticServer.server) {
    staticServer.server.close();
    staticServer = null;
  }
});
