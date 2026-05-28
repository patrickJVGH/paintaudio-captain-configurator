const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");
const PACKAGE_LOCK_PATH = path.join(ROOT, "package-lock.json");

const bumpType = (process.argv[2] || "patch").toLowerCase();
const allowedBumps = new Set(["patch", "minor", "major"]);

if (!allowedBumps.has(bumpType)) {
  console.error(`Invalid bump type "${bumpType}". Use patch, minor or major.`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function bumpVersion(version, type) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Version "${version}" is not semver (x.y.z).`);
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function runNpm(args) {
  const command =
    process.env.npm_execpath && process.env.npm_execpath.endsWith(".js")
      ? process.execPath
      : process.platform === "win32"
        ? "npm.cmd"
        : "npm";
  const fullArgs =
    command === process.execPath && process.env.npm_execpath
      ? [process.env.npm_execpath, ...args]
      : args;

  const result = spawnSync(command, fullArgs, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function ensureHistoryBackup(productName, version) {
  const releaseDir = path.join(ROOT, "release");
  const installerName = `${productName} Setup ${version}.exe`;
  const installerPath = path.join(releaseDir, installerName);
  const blockmapPath = `${installerPath}.blockmap`;

  if (!fs.existsSync(installerPath)) {
    throw new Error(`Installer not found: ${installerPath}`);
  }

  const historyDir = path.join(releaseDir, "history", `v${version}`);
  fs.mkdirSync(historyDir, { recursive: true });

  const historyInstallerPath = path.join(historyDir, installerName);
  fs.copyFileSync(installerPath, historyInstallerPath);

  if (fs.existsSync(blockmapPath)) {
    fs.copyFileSync(blockmapPath, path.join(historyDir, `${installerName}.blockmap`));
  }

  const metadata = {
    version,
    createdAt: new Date().toISOString(),
    installer: installerName,
    source: installerPath,
  };
  fs.writeFileSync(path.join(historyDir, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

const packageJson = readJson(PACKAGE_JSON_PATH);
const previousVersion = packageJson.version;
const nextVersion = bumpVersion(previousVersion, bumpType);
packageJson.version = nextVersion;
writeJson(PACKAGE_JSON_PATH, packageJson);

if (fs.existsSync(PACKAGE_LOCK_PATH)) {
  const packageLock = readJson(PACKAGE_LOCK_PATH);
  packageLock.version = nextVersion;
  if (packageLock.packages && packageLock.packages[""]) {
    packageLock.packages[""].version = nextVersion;
  }
  writeJson(PACKAGE_LOCK_PATH, packageLock);
}

console.log(`Version bump: ${previousVersion} -> ${nextVersion}`);
runNpm(["run", "desktop:pack"]);
ensureHistoryBackup(packageJson.build?.productName || packageJson.name, nextVersion);
console.log(`Release ready: version ${nextVersion}`);
