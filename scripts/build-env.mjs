/** 构建模式与环境变量（vite-build / build-profile / build-full 共用） */

export function parseBuildArgs(argv = process.argv.slice(2)) {
  const positional = argv.filter((a) => !a.startsWith("-"));
  const target = positional[0] ?? "web";
  const ultra = argv.includes("--ultra");
  const lite = ultra || argv.includes("--lite") || argv.includes("--fast");
  const releaseFast = argv.includes("--release-fast");
  const release = argv.includes("--release") || releaseFast;
  const serial = argv.includes("--serial");

  let mode = "default";
  if (ultra) mode = "ultra";
  else if (releaseFast) mode = "release-fast";
  else if (release) mode = "release";
  else if (lite) mode = "lite";

  return { target, mode, ultra, lite, release, releaseFast, serial };
}

export function viteBuildEnv({ target, mode, ultra, lite, release, releaseFast }) {
  const skipHeavy = ultra;
  const skipMinify = ultra || lite || releaseFast;
  const skipRem = ultra || lite || releaseFast;

  return {
    BUILD_TARGET: target,
    NODE_ENV: "production",
    BUILD_MODE: mode,
    BUILD_ULTRA: ultra ? "1" : "0",
    BUILD_LITE: lite ? "1" : "0",
    BUILD_RELEASE_FAST: releaseFast ? "1" : "0",
    BUILD_SKIP_HEAVY: skipHeavy ? "1" : "0",
    BUILD_SKIP_MINIFY: skipMinify ? "1" : "0",
    BUILD_SKIP_REM: skipRem ? "1" : "0",
  };
}

export function viteModeFlag({ mode, release, releaseFast, lite }) {
  if (releaseFast) return "--release-fast";
  if (release) return "--release";
  if (lite) return "--lite";
  return "--lite";
}
