// 研面系统 - Supabase 版本视图层
// 所有 UI 渲染函数

// ==================== 工具函数 ====================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date = new Date()) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  return `${month}月${day}日 周${weekday}`;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return minutes > 0 ? `${minutes}分${secs}秒` : `${secs}秒`;
}

function iconFor(mode) {
  const icons = {
    '专业面试': '⌘',
    '英语面试': 'Aa',
    '综合面试': '✦'
  };
  return icons[mode] || '•';
}

// ==================== 登录页 ====================

function renderLoginPage() {
  return `
    <div class="auth-container">
      <div class="auth-box">
        <div class="auth-header">
          <h1>研面</h1>
          <p>面试练习系统</p>
        </div>

        <!-- 登录表单 -->
        <form id="loginForm" class="auth-form">
          <h2>登录</h2>
          <div class="form-group">
            <label>邮箱</label>
            <input type="email" id="loginEmail" required placeholder="your@email.com" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input type="password" id="loginPassword" required placeholder="至少6位" />
          </div>
          <button type="submit" class="primary-button">登录</button>
          <p class="auth-switch">
            还没有账号？<a id="showRegister">立即注册</a>
          </p>
        </form>

        <!-- 注册表单 -->
        <form id="registerForm" class="auth-form" style="display: none;">
          <h2>注册</h2>
          <div class="form-group">
            <label>邮箱</label>
            <input type="email" id="registerEmail" required placeholder="your@email.com" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input type="password" id="registerPassword" required placeholder="至少6位" />
          </div>
          <div class="form-group">
            <label>确认密码</label>
            <input type="password" id="registerConfirm" required placeholder="再次输入密码" />
          </div>
          <div class="form-group">
            <label>姓名</label>
            <input type="text" id="registerName" required placeholder="你的姓名" />
          </div>
          <div class="form-group">
            <label>本科专业</label>
            <select id="registerMajor" required>
              <option value="自动化">自动化</option>
            </select>
          </div>
          <button type="submit" class="primary-button">注册</button>
          <p class="auth-switch">
            已有账号？<a id="showLogin">返回登录</a>
          </p>
        </form>

        <div class="auth-footer">
          <p>云端版本 · 数据自动同步</p>
        </div>
      </div>
    </div>
  `;
}

// ==================== 主布局 ====================

function renderMainLayout(profile) {
  return `
    <div class="main-layout">
      <nav class="sidebar">
        <div class="sidebar-header">
          <h2>研面</h2>
          <p>${escapeHtml(profile.name)}</p>
        </div>
        <ul class="nav-list">
          <li><a id="nav-dashboard" class="nav-link active">📊 仪表盘</a></li>
          <li><a id="nav-practice" class="nav-link">▶️ 开始练习</a></li>
          <li><a id="nav-questions" class="nav-link">📚 题库管理</a></li>
          <li><a id="nav-records" class="nav-link">📝 训练记录</a></li>
          <li><a id="nav-profile" class="nav-link">👤 个人资料</a></li>
        </ul>
        <div class="sidebar-footer">
          <button id="logoutBtn" class="text-button">退出登录</button>
        </div>
      </nav>
      <main class="main-content" id="main-content">
        <!-- 动态内容 -->
      </main>
    </div>
  `;
}

// ==================== 仪表盘 ====================

function renderDashboard(stats, profile) {
  const { totalSessions, totalQuestions, totalMinutes, byMode } = stats;

  return `
    <section class="welcome-row">
      <div>
        <span class="eyebrow">个人训练空间</span>
        <h1>你好，${escapeHtml(profile.name)} 👋</h1>
        <p>本科专业：${escapeHtml(profile.major)}</p>
      </div>
      <div class="date-chip">
        <b>◷</b>${formatDate()}
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card">
        <span class="stat-label">累计训练时长</span>
        <div class="stat-value">${totalMinutes}<span class="stat-unit">分钟</span></div>
        <div class="stat-meta">${totalSessions > 0 ? '保持你的节奏' : '完成第一次训练后显示'}</div>
      </article>
      <article class="stat-card mint">
        <span class="stat-label">累计训练次数</span>
        <div class="stat-value">${totalSessions}<span class="stat-unit">次</span></div>
        <div class="stat-meta">${totalSessions > 0 ? '每一次都在进步' : '今天开始第一题'}</div>
      </article>
      <article class="stat-card amber">
        <span class="stat-label">累计题目数</span>
        <div class="stat-value">${totalQuestions}<span class="stat-unit">题</span></div>
        <div class="stat-meta">${totalQuestions > 0 ? '积少成多' : '开始训练后显示'}</div>
      </article>
    </section>

    <section class="section-heading">
      <h3>选择练习模式</h3>
    </section>
    <section class="mode-grid">
      <article class="mode-card">
        <div>
          <div class="mode-art">⌘</div>
          <h4>专业面试</h4>
          <p>围绕本科专业知识、核心原理<br />和研究方向展开练习。</p>
        </div>
        <div class="mode-link" onclick="document.getElementById('nav-practice').click()">开始练习 <span>→</span></div>
      </article>
      <article class="mode-card mint">
        <div>
          <div class="mode-art">Aa</div>
          <h4>英语面试</h4>
          <p>练习自我介绍、英文问答<br />和常见表达场景。</p>
        </div>
        <div class="mode-link" onclick="document.getElementById('nav-practice').click()">开始练习 <span>→</span></div>
      </article>
      <article class="mode-card amber">
        <div>
          <div class="mode-art">✦</div>
          <h4>综合面试</h4>
          <p>模拟真实复试，训练<br />表达逻辑和临场反应。</p>
        </div>
        <div class="mode-link" onclick="document.getElementById('nav-practice').click()">开始练习 <span>→</span></div>
      </article>
    </section>

    <section class="bottom-grid">
      <article class="panel">
        <div class="panel-heading">
          <h3>练习分布</h3>
        </div>
        ${Object.keys(byMode).map(mode => {
          const stat = byMode[mode];
          const percent = totalSessions > 0 ? Math.round(stat.sessions / totalSessions * 100) : 0;
          return `
            <div class="progress-row">
              <div class="progress-label">
                <strong>${mode}</strong>
                <span>${stat.sessions} 次 · ${stat.minutes} 分钟</span>
              </div>
              <div class="progress-bar">
                <span style="width:${percent}%"></span>
              </div>
            </div>
          `;
        }).join('')}
      </article>
    </section>
  `;
}

// ==================== 练习页面 ====================

function renderPracticePage(profile) {
  return `
    <section class="practice-header">
      <div>
        <span class="eyebrow">面试练习</span>
        <h1>准备开始一场练习</h1>
        <p>按你的目标选择模式、时间和题目来源。</p>
      </div>
    </section>

    <section class="setup-grid">
      <article class="setup-card">
        <h3>选择面试模式</h3>
        <select id="practiceMode" class="select-control">
          <option value="专业面试">专业面试</option>
          <option value="英语面试">英语面试</option>
          <option value="综合面试">综合面试</option>
        </select>

        <label class="setup-label">计时方式</label>
        <select id="practiceTimer" class="select-control">
          <option value="single">单题计时</option>
          <option value="whole">整场计时</option>
        </select>

        <label class="setup-label">题目来源</label>
        <select id="practiceSource" class="select-control">
          <option value="mixed">公共 + 我的题库</option>
          <option value="public">仅公共题库</option>
          <option value="private">仅我的题库</option>
          <option value="starred">仅收藏题目 ⭐</option>
        </select>

        <div class="setup-footer">
          <button id="startPracticeBtn" class="primary-button">开始练习 →</button>
        </div>
      </article>
    </section>
  `;
}

// ==================== 练习答题页 ====================

function renderPracticeQuestion(question, currentIndex, total, timerMode, startedAt) {
  return `
    <div class="practice-session">
      <div class="practice-header-bar">
        <div class="practice-progress">
          <span>第 ${currentIndex + 1} / ${total} 题</span>
          <div class="progress-bar-thin">
            <span style="width: ${((currentIndex + 1) / total * 100)}%"></span>
          </div>
        </div>
        <div class="practice-timer">
          <span>⏱</span>
          <span id="timer">0:00</span>
        </div>
        <button id="endPracticeBtn" class="text-button danger">结束练习</button>
      </div>

      <div class="question-card">
        <div class="question-meta">
          <span class="badge">${escapeHtml(question.mode)}</span>
          <span class="badge mint">${escapeHtml(question.difficulty)}</span>
          ${question.category ? `<span class="badge amber">${escapeHtml(question.category)}</span>` : ''}
        </div>
        <h2 class="question-text">${escapeHtml(question.question_text)}</h2>

        <div class="question-actions">
          <button id="toggleAnswerBtn" class="secondary-button">查看答案</button>
        </div>

        <div id="questionAnswer" class="answer-section" style="display: none;">
          <h3>参考答案</h3>
          <p>${escapeHtml(question.answer_text || '暂无参考答案')}</p>
        </div>

        <div class="question-footer">
          <button id="nextQuestionBtn" class="primary-button">回答完成，下一题 →</button>
          <button id="skipQuestionBtn" class="text-button">跳过</button>
        </div>
      </div>
    </div>
  `;
}

// ==================== 练习总结 ====================

function renderPracticeSummary(recordData) {
  const minutes = Math.floor(recordData.duration / 60);
  const seconds = recordData.duration % 60;

  return `
    <div class="summary-container">
      <div class="summary-header">
        <h1>✓ 练习完成</h1>
        <p>本次练习已保存到训练记录</p>
      </div>

      <div class="summary-stats">
        <div class="summary-stat">
          <span class="stat-label">练习模式</span>
          <span class="stat-value">${escapeHtml(recordData.mode)}</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">题目数量</span>
          <span class="stat-value">${recordData.question_count} 题</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">完成题数</span>
          <span class="stat-value">${recordData.answered_count} 题</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">用时</span>
          <span class="stat-value">${minutes}分${seconds}秒</span>
        </div>
      </div>

      <button id="backToDashboardBtn" class="primary-button">返回仪表盘</button>
    </div>
  `;
}

// ==================== 题库管理 ====================

function renderQuestionsPage(questions, profile) {
  return `
    <section class="page-header">
      <div>
        <h1>题库管理</h1>
        <p>共 ${questions.length} 道题目</p>
      </div>
      <button id="addQuestionBtn" class="primary-button">+ 添加题目</button>
    </section>

    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="搜索题目..." class="search-input" />
    </div>

    <table id="questionsTable" class="data-table">
      <thead>
        <tr>
          <th>模式</th>
          <th>分类</th>
          <th>难度</th>
          <th>题目</th>
          <th>来源</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${questions.map(q => `
          <tr>
            <td><span class="badge">${escapeHtml(q.mode)}</span></td>
            <td>${escapeHtml(q.category || '-')}</td>
            <td><span class="badge mint">${escapeHtml(q.difficulty)}</span></td>
            <td class="question-preview">${escapeHtml(q.question_text.substring(0, 50))}${q.question_text.length > 50 ? '...' : ''}</td>
            <td>${q.is_public ? '公开' : '私有'}</td>
            <td class="actions">
              <button id="star-${q.id}" class="icon-btn" title="${q.is_starred ? '取消收藏' : '收藏'}">${q.is_starred ? '⭐' : '☆'}</button>
              <button id="edit-${q.id}" class="icon-btn" title="编辑">✏️</button>
              <button id="delete-${q.id}" class="icon-btn" title="删除">🗑️</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${questions.length === 0 ? '<div class="empty-state">还没有题目，点击"添加题目"开始创建。</div>' : ''}
  `;
}

// ==================== 题目编辑模态框 ====================

function renderQuestionModal(question, profile) {
  const isEdit = !!question;

  return `
    <div class="modal-overlay" id="questionModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${isEdit ? '编辑题目' : '添加题目'}</h2>
          <button id="closeModal" class="close-btn">×</button>
        </div>

        <form id="questionForm" class="modal-form">
          <div class="form-group">
            <label>面试模式 *</label>
            <select id="questionMode" required>
              <option value="专业面试" ${question?.mode === '专业面试' ? 'selected' : ''}>专业面试</option>
              <option value="英语面试" ${question?.mode === '英语面试' ? 'selected' : ''}>英语面试</option>
              <option value="综合面试" ${question?.mode === '综合面试' ? 'selected' : ''}>综合面试</option>
            </select>
          </div>

          <div class="form-group">
            <label>分类</label>
            <input type="text" id="questionCategory" value="${escapeHtml(question?.category || '')}" placeholder="例如：控制理论、自我介绍" />
          </div>

          <div class="form-group">
            <label>难度 *</label>
            <select id="questionDifficulty" required>
              <option value="基础" ${question?.difficulty === '基础' ? 'selected' : ''}>基础</option>
              <option value="进阶" ${question?.difficulty === '进阶' ? 'selected' : ''}>进阶</option>
              <option value="拔高" ${question?.difficulty === '拔高' ? 'selected' : ''}>拔高</option>
            </select>
          </div>

          <div class="form-group">
            <label>题目内容 *</label>
            <textarea id="questionText" required rows="4" placeholder="输入题目内容...">${escapeHtml(question?.question_text || '')}</textarea>
          </div>

          <div class="form-group">
            <label>参考答案</label>
            <textarea id="answerText" rows="6" placeholder="输入参考答案（可选）...">${escapeHtml(question?.answer_text || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="questionPublic" ${question?.is_public ? 'checked' : ''} />
              设为公开（其他用户可见）
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" id="closeModal" class="secondary-button">取消</button>
            <button type="submit" class="primary-button">${isEdit ? '保存' : '添加'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// ==================== 训练记录 ====================

function renderRecordsPage(records) {
  return `
    <section class="page-header">
      <div>
        <h1>训练记录</h1>
        <p>共 ${records.length} 次训练</p>
      </div>
    </section>

    <table class="data-table">
      <thead>
        <tr>
          <th>日期</th>
          <th>模式</th>
          <th>题目数</th>
          <th>完成数</th>
          <th>用时</th>
          <th>来源</th>
        </tr>
      </thead>
      <tbody>
        ${records.map(r => {
          const date = new Date(r.started_at);
          const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
          const sourceLabel = {
            'mixed': '混合',
            'public': '公开',
            'private': '私有',
            'starred': '收藏'
          }[r.source] || r.source;

          return `
            <tr>
              <td>${dateStr}</td>
              <td><span class="badge">${escapeHtml(r.mode)}</span></td>
              <td>${r.question_count}</td>
              <td>${r.answered_count}</td>
              <td>${formatDuration(r.duration)}</td>
              <td>${sourceLabel}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    ${records.length === 0 ? '<div class="empty-state">还没有训练记录，开始第一次练习吧！</div>' : ''}
  `;
}

// ==================== 个人资料 ====================

function renderProfilePage(profile) {
  return `
    <section class="page-header">
      <h1>个人资料</h1>
      <p>完善个人信息，帮助AI生成更精准的题目</p>
    </section>

    <form id="profileForm" class="profile-form">
      <div class="form-group">
        <label>姓名 *</label>
        <input type="text" id="profileName" value="${escapeHtml(profile.name)}" required />
      </div>

      <div class="form-group">
        <label>本科专业 *</label>
        <input type="text" value="${escapeHtml(profile.major)}" disabled />
        <small>专业暂不可修改</small>
      </div>

      <div class="form-group">
        <label>研究方向</label>
        <input type="text" id="profileResearch" value="${escapeHtml(profile.research || '')}" placeholder="例如：智能控制、机器人技术" />
      </div>

      <div class="form-group">
        <label>目标专业</label>
        <input type="text" id="profileTargetMajor" value="${escapeHtml(profile.target_major || '')}" placeholder="例如：控制科学与工程" />
      </div>

      <div class="form-group">
        <label>目标院校</label>
        <input type="text" id="profileTargetSchool" value="${escapeHtml(profile.target_school || '')}" placeholder="例如：清华大学" />
      </div>

      <div class="form-group">
        <label>个人背景</label>
        <textarea id="profileBackground" rows="4" placeholder="简要介绍你的学术背景、项目经历等...">${escapeHtml(profile.background || '')}</textarea>
      </div>

      <button type="submit" class="primary-button">保存资料</button>
    </form>
  `;
}

console.log('[Views Supabase] 视图层已加载');
