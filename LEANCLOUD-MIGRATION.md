# LeanCloud 迁移计划

## 为什么选择 LeanCloud

- ✅ 完全免费，无需信用卡
- ✅ 国内访问速度快（数据存储在国内）
- ✅ 中文文档，容易上手
- ✅ 不需要实名认证
- ✅ 每天 3 万次 API 请求，1GB 存储（足够使用）

## 改造步骤

### 第 1 步：注册 LeanCloud 账号（5 分钟）
1. 访问 https://www.leancloud.cn/
2. 点击右上角"注册"
3. 使用邮箱注册（无需实名）
4. 登录后创建应用：
   - 应用名称：`yanmian`（面试练习）
   - 选择"开发版"（免费）
   - 区域选择"华北节点"（国内访问快）

### 第 2 步：创建数据表（10 分钟）
在 LeanCloud 控制台创建 3 个 Class（表）：

#### UserProfile（用户资料）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| username | String | 用户名（LeanCloud 内置） |
| email | String | 邮箱（LeanCloud 内置） |
| password | String | 密码（LeanCloud 自动加密） |
| name | String | 姓名 |
| role | String | 角色（user/admin） |
| major | String | 专业 |
| createdAt | Date | 创建时间（自动） |

#### Question（题目）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| mode | String | 面试类型 |
| category | String | 分类 |
| content | String | 题目内容 |
| difficulty | String | 难度 |
| ownerId | Pointer | 创建者（指向 _User） |
| isPublic | Boolean | 是否公开 |
| createdAt | Date | 创建时间（自动） |

#### PracticeRecord（练习记录）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| userId | Pointer | 用户（指向 _User） |
| source | String | 练习来源 |
| count | Number | 题目数量 |
| answers | Array | 答案列表 |
| duration | Number | 用时（秒） |
| createdAt | Date | 创建时间（自动） |

### 第 3 步：改造前端代码（2 小时）

#### 3.1 引入 LeanCloud SDK
```html
<script src="//cdn.jsdelivr.net/npm/leancloud-storage@4.15.2/dist/av-min.js"></script>
```

#### 3.2 创建适配器文件
- `leancloud-config.js` - 配置文件
- `leancloud-service.js` - 数据服务层
- `app-leancloud.js` - 主应用逻辑
- `index-leancloud.html` - 云端版入口

#### 3.3 功能映射
| 原功能 | LeanCloud API |
|--------|----------------|
| 注册 | AV.User.signUp() |
| 登录 | AV.User.logIn() |
| 登出 | AV.User.logOut() |
| 获取当前用户 | AV.User.current() |
| 查询题目 | new AV.Query('Question') |
| 创建题目 | new AV.Object('Question') |
| 保存记录 | new AV.Object('PracticeRecord') |

### 第 4 步：测试部署（30 分钟）
1. 本地测试所有功能
2. 提交到 GitHub
3. Netlify 自动部署
4. 验证云端数据同步

## 预计总时间：2-3 小时

## 下一步行动
等待用户完成 LeanCloud 注册后，我将立即开始代码改造。
