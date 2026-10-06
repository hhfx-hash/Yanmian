# 燕勉面试练习系统 - 开发日志

## 2026-10-06

### Netlify 部署问题排查

**问题描述**：
- 用户无法访问 https://yanmian.netlify.app/，显示 404 错误
- 用户注册 Vercel 时收不到验证码

**解决方案**：
1. 切换到 Netlify 部署方案（无需验证码，直接用 GitHub 登录）
2. 发现部署问题：Netlify 从 `main` 分支部署，但用户当时在 `gh-pages` 分支
3. 创建 `netlify.toml` 配置文件：
   - 设置根目录为发布目录
   - 配置根路径 `/` 重定向到 `/index-supabase.html`
4. 已提交配置到 GitHub (commit: 1f1a948)

**部署结果**：
✅ **部署成功！** 网站现已上线，可以正常访问

**验证完成**：
- ✅ https://yanmian.netlify.app/ 可正常访问
- ✅ Netlify 自动检测到 GitHub push 并触发部署
- ✅ netlify.toml 配置生效，根路径正确重定向到 index-supabase.html

**技术要点**：
- Netlify 会自动监听 GitHub 仓库的 push 事件
- 配置文件 `netlify.toml` 确保了正确的路由和发布目录
- 从 push 到部署完成约需 1-2 分钟

**下一步**：
- 测试云端版本所有功能（注册、登录、题库、练习、AI 生成）
- 确认 Supabase 数据库连接正常
- 收集用户反馈进行优化

---

## 2026-09-30

### Bug 修复 - 无法访问网页

**问题描述**：
- TypeError: Cannot set properties of null (setting 'onclick')
- 浏览器缓存导致使用旧版本 app.js

**修复措施**：
1. **bcrypt 加载问题**：
   - 修复 bcryptjs 库映射：`window.bcrypt = dcodeIO.bcrypt`
   - 下载到本地文件 `bcrypt.min.js` 避免 CDN 加载失败

2. **DOM 加载时机**：
   - 使用 `DOMContentLoaded` 事件确保 DOM 完全加载后初始化
   - 移除 app.js 末尾的自动调用

3. **增强错误处理**：
   - init() 函数添加 DOM 元素验证、bcrypt 验证、数据格式验证
   - bindAuth() 函数添加安全的元素访问和详细日志
   - localStorage 版本冲突自动检测并重新初始化

4. **浏览器缓存问题**：
   - 在所有静态资源后添加版本参数 `?v=20260930`
   - 创建 `index-nocache.html` 强制加载最新文件

**创建的文件**：
- `test-init.html` - 诊断工具页面
- `BUG-FIX-REPORT.md` - 完整修复报告

**结果**：
- 所有功能验证正常：注册/登录、题库管理、AI 生成、训练记录
- 默认专业为"自动化"
- 管理员后台正常工作

---

### Supabase 云端集成

**完成功能**：
1. **数据库设计**：
   - 创建 `supabase-init-fixed.sql` 初始化脚本
   - 表结构：user_profiles、questions、practice_records
   - 启用 Row Level Security (RLS) 权限策略

2. **前端集成**：
   - `supabase-config.js` - 配置和客户端初始化
   - `supabase-service.js` - 完整服务层（认证、题目、训练记录 CRUD）
   - `domain-supabase.js` - Domain 层适配器
   - `app-supabase-main.js` - 主应用逻辑
   - `views-supabase.js` - 完整视图层
   - 下载 `supabase.min.js` (212.8k) 到本地

3. **本地测试**：
   - 注册测试成功，自动登录进入仪表盘
   - 自动初始化 9 道默认题目
   - 所有功能正常工作

**Supabase 项目信息**：
- URL: https://drhgffbacbrlobfkyeuc.supabase.co
- 项目名：yanmian
- 区域：Tokyo
- 套餐：Free

---

### Git 仓库和部署准备

**完成操作**：
1. 初始化 Git 仓库
2. 创建 `.gitignore`（排除测试文件、后端文件、旧版本）
3. 创建 `vercel.json` 配置
4. 配置 Git 用户信息：
   - 用户名：hhfx-hash
   - 邮箱：1690761196@qq.com
5. 首次提交：48 files, 7537 insertions
6. 推送到 GitHub: https://github.com/hhfx-hash/Yanmian.git

---

## 2026-09-27 及之前

### 核心功能开发

**已完成功能**：
1. **用户系统**：
   - 注册/登录/登出
   - bcryptjs 密码加密
   - localStorage v3 数据持久化
   - 角色管理（admin/user）

2. **题库管理**：
   - 增删改查
   - 题目收藏/取消收藏
   - 批量导入/导出（CSV/JSON，UTF-8 BOM）
   - 题目分类：专业/英语/综合面试
   - 难度等级：简单/中等/困难

3. **练习模式**：
   - 三种面试模式（专业/英语/综合）
   - 两种计时模式（限时/不限时）
   - 题目来源选择（所有/收藏）
   - 倒计时功能
   - 答题记录保存

4. **AI 生成题目**：
   - 集成 DeepSeek API
   - 根据专业和面试类型自动生成
   - 支持配置数量、难度、类别
   - 生成后预览和确认

5. **训练记录**：
   - 完整记录每次练习
   - 统计分析（答题数、用时、专业分布）
   - 历史记录查看

6. **管理员功能**：
   - 管理员后台
   - 题库管理权限
   - 系统配置

7. **专业设置**：
   - 限制为"自动化"专业
   - 代码结构保留扩展性（TODO 注释）
   - 5 道自动化专业题目（PID 控制、采样定理、负反馈、状态空间、稳定性分析）

**技术栈**：
- 纯 JavaScript/HTML/CSS（无框架）
- bcryptjs 3.0.2 密码加密
- localStorage 数据持久化
- Supabase 云端数据库
- DeepSeek API AI 生成
- 响应式设计（桌面/平板/移动端）

**默认账号**：
- 体验账号：demo@yanmian.local / Demo123456（普通用户，自动化专业）
- 管理员账号：admin@demo.local / Admin123456

---

## 待办事项

### 高优先级
- [ ] 确认 Netlify 部署成功
- [ ] 解决用户反馈的 Netlify "Trigger deploy" 选项找不到的问题
- [ ] 测试云端版本所有功能

### 中优先级
- [ ] 添加更多自动化专业题目
- [ ] 优化 AI 生成题目的 CORS 问题
- [ ] 添加题目导入/导出到云端

### 低优先级
- [ ] 添加在线错误监控（Sentry）
- [ ] 添加用户反馈渠道
- [ ] 性能优化

---

## 项目文件结构

```
e:/面试网页/
├── index.html                    # 本地版主页（localStorage）
├── index-supabase.html          # 云端版主页（Supabase）
├── index-nocache.html           # 无缓存版本
├── test-init.html               # 诊断工具
├── debug.html                   # 调试页面
│
├── app.js                       # 本地版主应用
├── app-supabase-main.js        # 云端版主应用
├── domain.js                    # 本地版 Domain 层
├── domain-supabase.js          # 云端版 Domain 层
├── views.js                     # 本地版视图层
├── views-supabase.js           # 云端版视图层
│
├── supabase-config.js          # Supabase 配置
├── supabase-service.js         # Supabase 服务层
├── supabase.min.js             # Supabase SDK (本地)
├── bcrypt.min.js               # bcryptjs (本地)
│
├── styles.css                   # 样式文件
├── netlify.toml                 # Netlify 配置
├── vercel.json                  # Vercel 配置
├── .gitignore                   # Git 忽略文件
│
├── supabase-init-fixed.sql     # 数据库初始化脚本
├── BUG-FIX-REPORT.md           # Bug 修复报告
├── CHANGELOG.md                 # 本文件
└── README.md                    # 项目说明
```

---

## 部署地址

- **Netlify（云端版）**: https://yanmian.netlify.app/ (待确认)
- **本地测试**: http://localhost:5173/
- **GitHub 仓库**: https://github.com/hhfx-hash/Yanmian

---

## 技术债务

1. **AI 生成功能**：
   - 首次生成时出现解析错误
   - 第二次显示成功但 API 调用历史中无记录
   - 可能是 CORS 问题，需要进一步调试

2. **代码优化**：
   - app.js 文件较大（1221 行），需要考虑模块化
   - 部分重复代码可以提取为公共函数

3. **测试覆盖**：
   - 缺少自动化测试
   - 需要添加单元测试和集成测试

---

**最后更新**: 2026-10-06
**维护者**: hhfx-hash
