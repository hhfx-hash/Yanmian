// Supabase 配置文件
const SUPABASE_CONFIG = {
  url: 'https://drhgffbacbrlobfkyeuc.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaGdmZmJhY2JybG9iZmt5ZXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NDc0ODMsImV4cCI6MjEwNjMyMzQ4M30.jDlOEKTw1pwUP_d1MvFLFlSNpel3-oViiW-2BoRHmqw'
};

// 初始化 Supabase 客户端到全局变量
window.supabaseClient = window.supabase.createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

console.log('[Supabase] 客户端已初始化');
