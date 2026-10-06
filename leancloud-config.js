// LeanCloud 配置文件
// 请在 LeanCloud 控制台获取 AppID 和 AppKey
// 路径：应用 → 设置 → 应用凭证

const LEANCLOUD_CONFIG = {
  appId: 'YOUR_APP_ID_HERE',      // 替换为你的 AppID
  appKey: 'YOUR_APP_KEY_HERE',    // 替换为你的 AppKey
  serverURL: 'https://YOUR_APP_ID.lc-cn-n1-shared.com'  // 替换为你的 API 域名
};

// 初始化 LeanCloud
function initLeanCloud() {
  if (typeof AV === 'undefined') {
    console.error('[LeanCloud] SDK 未加载');
    return false;
  }

  try {
    AV.init({
      appId: LEANCLOUD_CONFIG.appId,
      appKey: LEANCLOUD_CONFIG.appKey,
      serverURL: LEANCLOUD_CONFIG.serverURL
    });
    console.log('[LeanCloud] 初始化成功');
    return true;
  } catch (error) {
    console.error('[LeanCloud] 初始化失败:', error);
    return false;
  }
}

// 页面加载时自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeanCloud);
} else {
  initLeanCloud();
}
