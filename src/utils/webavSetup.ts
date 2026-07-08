/** @webav 日志级别，仅在视频编辑模块加载时初始化 */

let initialized = false;

export function setupWebavLog() {
  if (initialized) return;
  initialized = true;
  import("@webav/av-cliper").then(({ Log }) => {
    Log.setLogLevel(Log.warn);
  });
}
