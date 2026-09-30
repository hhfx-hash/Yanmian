'use strict';
const D = YanmianDomain;
const STORAGE_KEY = 'yanmian-prototype-state-v3';
let state;
let currentView = 'dashboard';
let timerHandle;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const formatDate = (date = new Date()) => new Intl.DateTimeFormat('zh-CN', { month:'long', day:'numeric', weekday:'short' }).format(date);
function formatDuration(seconds = 0) { const n = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }
const dateTime = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
const iconFor = mode => mode === '专业面试' ? '⌘' : mode === '英语面试' ? 'Aa' : '✦';
const myRecords = () => D.stats(state, state.user.id).records;
const myQuestions = () => state.questions.filter(q => q.ownerId === state.user.id);
function showToast(message, type = '') { const node = document.createElement('div'); node.className = `toast ${type}`; node.setAttribute('role', 'status'); node.textContent = message; $('#toastRoot').append(node); setTimeout(() => node.remove(), 5000); }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function guard(action) { return async event => { try { await action(event); } catch (error) { console.error(error); showToast(error.message, 'error'); } }; }
async function init() {
  try {
    // 检查必需的 DOM 元素
    const majorOptions = $('#majorOptions');
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');

    if (!majorOptions || !loginForm || !registerForm) {
      console.error('[初始化错误] 关键 DOM 元素缺失', {
        majorOptions: !!majorOptions,
        loginForm: !!loginForm,
        registerForm: !!registerForm
      });
      showToast('页面加载失败，请刷新重试', 'error');
      return;
    }

    // 检查 bcrypt 是否加载
    if (typeof bcrypt === 'undefined') {
      console.error('[初始化错误] bcrypt 库未加载');
      showToast('加密库加载失败，请刷新重试', 'error');
      return;
    }

    majorOptions.innerHTML = D.MAJORS.map(m => `<option value="${m}">`).join('');

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        state = JSON.parse(raw);
        // 验证数据结构
        if (state.version !== 2 || !Array.isArray(state.users) || !Array.isArray(state.records) || !Array.isArray(state.questions)) {
          console.warn('[数据迁移] 本地数据版本不匹配，将重新初始化');
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('yanmian-prototype-state-v2');
          localStorage.removeItem('yanmian-prototype-state-v1');
          // 递归调用重新初始化
          return init();
        }
      } catch (parseError) {
        console.error('[数据错误] localStorage 数据解析失败', parseError);
        localStorage.removeItem(STORAGE_KEY);
        return init();
      }
    } else {
      const now = new Date().toISOString();
      const users = [
        { id:'demo', email:'demo@yanmian.local', name:'林同学', role:'user', major:'自动化', research:'', targetMajor:'', targetSchool:'', background:'', createdAt:now, verified:false, passwordHash:await bcrypt.hash('Demo123456', 10) },
        { id:'admin', email:'admin@demo.local', name:'管理员', role:'admin', major:'', research:'', targetMajor:'', targetSchool:'', background:'', createdAt:now, verified:false, passwordHash:await bcrypt.hash('Admin123456', 10) }
      ];
      const legacy = localStorage.getItem('yanmian-prototype-state-v1');
      state = legacy ? D.migrateLegacy(JSON.parse(legacy), users) : D.createStore(users);
      saveState();
      console.log('[初始化成功] 已创建默认账号', { demo: 'Demo123456', admin: 'Admin123456' });
    }

    if (state.user) {
      const account = state.users.find(u => u.id === state.user.id);
      if (!account) {
        console.warn('[账号错误] 当前账号记录缺失，将登出');
        state.user = null;
        saveState();
      } else {
        state.user = account;
      }
    }

    bindAuth();
    if (state.user) showApp();
  } catch (error) {
    console.error('[初始化失败]', error);
    showToast(`初始化失败: ${error.message}`, 'error');
  }
}
function bindAuth() {
  try {
    const authTabs = $$('.auth-tab');
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');
    const forgotPassword = $('#forgotPassword');

    // 验证必需元素
    if (authTabs.length === 0 || !loginForm || !registerForm) {
      console.error('[bindAuth 错误] 关键元素缺失', {
        authTabs: authTabs.length,
        loginForm: !!loginForm,
        registerForm: !!registerForm
      });
      showToast('登录页面加载失败，请刷新重试', 'error');
      return;
    }

    // 绑定标签切换
    authTabs.forEach(tab => {
      tab.onclick = () => {
        $$('.auth-tab').forEach(t => t.classList.toggle('is-active', t === tab));
        loginForm.classList.toggle('is-hidden', tab.dataset.authTab !== 'login');
        registerForm.classList.toggle('is-hidden', tab.dataset.authTab !== 'register');
      };
    });

    // 绑定登录表单
    loginForm.onsubmit = guard(async event => {
      event.preventDefault();
      const data = new FormData(event.target);
      const user = state.users.find(u => u.email === D.emailKey(data.get('email')));
      if (!user || !await bcrypt.compare(String(data.get('password')), user.passwordHash)) {
        throw new Error('邮箱或密码不正确；新账号请先注册。');
      }
      login(user);
    });

    // 绑定注册表单
    registerForm.onsubmit = guard(async event => {
      event.preventDefault();
      const data = new FormData(event.target);
      const email = D.emailKey(data.get('email'));

      if (state.users.some(u => u.email === email)) {
        throw new Error('该邮箱已在本浏览器注册，请登录。');
      }

      const name = D.normalize(data.get('name'));
      const major = D.normalize(data.get('major'));
      const password = String(data.get('password'));

      if (!name || !major || password.length < 8 || new TextEncoder().encode(password).length > 72) {
        throw new Error('请填写称呼、本科专业，并使用至少 8 位且不超过 72 字节的密码。');
      }

      const user = {
        id: crypto.randomUUID(),
        email,
        name,
        major,
        role: 'user',
        research: '',
        targetMajor: '',
        targetSchool: '',
        background: '',
        createdAt: new Date().toISOString(),
        verified: false,
        passwordHash: await bcrypt.hash(password, 10)
      };

      state.users.push(user);
      login(user);
      showToast('本地账号已创建；邮箱验证尚未接入。');
    });

    // 绑定忘记密码按钮（可选元素）
    if (forgotPassword) {
      forgotPassword.onclick = () => showToast('邮箱重置服务尚未接入。');
    }

    console.log('[bindAuth 成功] 登录页面已初始化');
  } catch (error) {
    console.error('[bindAuth 失败]', error);
    showToast('登录页面初始化失败', 'error');
  }
}
function login(user) {
  state.user = user; state.session = null; saveState(); currentView = user.role === 'admin' ? 'admin' : 'dashboard'; showApp();
}
function showApp() {
  $('#authView').classList.add('is-hidden'); $('#appView').classList.remove('is-hidden');
  $('#sidebarName').textContent = state.user.name; $('#sidebarEmail').textContent = state.user.email;
  $('#sidebarAvatar').textContent = state.user.name.slice(0,1); $('#topAvatar').textContent = state.user.name.slice(0,1);
  $('#topAvatar').setAttribute('aria-label', '编辑个人资料'); $('#topAvatar').onclick = openProfileModal;
  $$('.admin-only').forEach(el => el.classList.toggle('is-hidden', state.user.role !== 'admin'));
  $$('.nav-item').forEach(el => el.onclick = guard(() => navigate(el.dataset.view)));
  $('#logoutButton').onclick = () => {
    if (state.session && !confirm('退出将结束并保存当前训练，继续吗？')) return;
    if (state.session) finishSession();
    clearInterval(timerHandle); state.user = null; saveState(); closeModal(); currentView = 'dashboard';
    $('#appView').classList.add('is-hidden'); $('#authView').classList.remove('is-hidden');
    $('[data-auth-tab="login"]').click(); $('#registerForm').reset();
  };
  $('#openSidebar').onclick = () => $('.sidebar').classList.add('is-open'); $('#closeSidebar').onclick = () => $('.sidebar').classList.remove('is-open');
  if (state.session && state.session.userId === state.user.id) { currentView = 'practice'; D.tick(state.session); renderSession(); startTimer(); }
  else renderView(currentView);
  updatePendingBadge();
}
function navigate(view) {
  if (view === 'admin' && state.user.role !== 'admin') throw new Error('此页面仅管理员可访问。');
  if (state.session) {
    if (view === 'practice') { renderSession(); return; }
    if (!confirm('离开将结束并保存当前训练，继续吗？')) return;
    finishSession();
  }
  closeModal(); $('.sidebar').classList.remove('is-open'); renderView(view);
}
function renderView(view) {
  if (view === 'admin' && state.user.role !== 'admin') throw new Error('此页面仅管理员可访问。');
  currentView = view;
  const titles = { dashboard:['今天也要保持状态','工作台'], practice:['按本科专业，练好专业知识','开始练习'], bank:['整理属于你的题目','我的题库'], records:['每一次练习都算数','训练记录'], admin:['本浏览器实际用户与训练数据','管理后台'] };
  if (!titles[view]) throw new Error('页面不存在');
  $('#pageKicker').textContent = titles[view][0]; $('#pageTitle').textContent = titles[view][1];
  const templates = { dashboard:dashboardTemplate, practice:practiceTemplate, bank:bankTemplate, records:recordsTemplate, admin:adminTemplate };
  $('#mainContent').innerHTML = templates[view]();
  $$('.nav-item').forEach(el => el.classList.toggle('is-active', el.dataset.view === view));
  $$('[data-profile]').forEach(el => el.onclick = openProfileModal);
  $$('[data-go]').forEach(el => el.onclick = guard(() => navigate(el.dataset.go)));
  $$('[data-start]').forEach(el => el.onclick = () => { renderView('practice'); $$('.choice-card').forEach(c => c.classList.toggle('is-selected', c.dataset.modeChoice === el.dataset.start)); updatePoolSummary(); });
  if (view === 'practice') bindPractice();
  if (view === 'bank') { $('#addQuestion').onclick = () => openQuestionModal(); $('#bankFilter').onchange = updateBankList; $('#batchImport').onclick = openBatchImportModal; $('#aiGenerate').onclick = openAIGenerateModal; $('#bankSearch').oninput = updateBankList; bindQuestionEdits(); bindQuestionStars(); }
  if (view === 'admin') bindAdmin();
}
function practiceConfig() { return { mode:$('.choice-card.is-selected').dataset.modeChoice, source:$('input[name="source"]:checked').value, timerMode:$('input[name="timerMode"]:checked').value, duration:Number($('#durationSelect').value), major:state.user.major }; }
function updatePoolSummary() {
  try {
    const c = practiceConfig();
    const count = D.eligibleQuestions(state,state.user,c).length;
    let sourceLabel = '';
    if (c.source === 'starred') {
      sourceLabel = '收藏题目';
    } else if (c.source === 'public') {
      sourceLabel = '公共题库';
    } else if (c.source === 'private') {
      sourceLabel = '我的题库';
    } else {
      sourceLabel = '公共 + 我的题库';
    }
    $('#poolSummary').textContent = `${c.mode === '专业面试' ? c.major : '通用题'} · ${sourceLabel} · 可用 ${count} 道题${count ? '' : '，请先收藏题目或补充题库'}`;
  }
  catch (error) { $('#poolSummary').textContent = error.message; }
}
function bindPractice() {
  $$('.choice-card').forEach(c => c.onclick = () => { $$('.choice-card').forEach(x => x.classList.toggle('is-selected', x === c)); updatePoolSummary(); });
  $$('input[name="source"]').forEach(el => el.onchange = updatePoolSummary);
  $('#startPractice').onclick = guard(() => { state.session = D.createSession(state, state.user, practiceConfig()); saveState(); renderSession(); startTimer(); });
  updatePoolSummary();
}
function startTimer() {
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (!state.session) return;
    const expired = state.session.expired; D.tick(state.session); saveState();
    if (expired !== state.session.expired) { renderSession(); showToast('时间到了。点击“答题完成”后查看参考答案。'); }
    else updateTimerDom();
  }, 250);
}
function updateTimerDom() {
  if (!$('#timerValue') || !state.session) return;
  const s = state.session; $('#timerValue').textContent = formatDuration(Math.ceil(s.remainingMs / 1000));
  $('#timerProgress').style.width = `${s.remainingMs / (s.duration * 1000) * 100}%`;
  $('#timerValue').style.color = s.remainingMs <= 10000 ? '#ff9b8e' : '';
}
function renderSession() {
  const s = state.session; const q = s.question;
  const progress = `${s.answeredIds.length} / ${s.visitedIds.length}`;
  const poolCount = D.eligibleQuestions(state, state.user, s).length;
  const showHistory = s.visitedIds.length > 1;
  const historyHtml = showHistory ? `<div class="session-history"><div class="history-header"><span class="history-title">本次已练习</span><span class="history-progress">${progress} 题完成</span></div><div class="history-list">${s.visitedIds.map((id, idx) => {
    const histQ = state.questions.find(x => x.id === id);
    const isCurrent = id === q.id;
    const isAnswered = s.answeredIds.includes(id);
    return `<div class="history-item ${isCurrent ? 'is-current' : ''} ${isAnswered ? 'is-answered' : ''}"><span class="history-num">${idx + 1}</span><span class="history-text">${escapeHtml(histQ?.title.slice(0, 28) || '题目')}${histQ?.title.length > 28 ? '...' : ''}</span>${isAnswered ? '<span class="history-check">✓</span>' : ''}</div>`;
  }).join('')}</div></div>` : '';

  $('#pageKicker').textContent = '专注练习'; $('#pageTitle').textContent = s.mode;
  $$('.nav-item').forEach(el => el.classList.toggle('is-active', el.dataset.view === 'practice'));
  $('#mainContent').innerHTML = `<section class="session-shell"><div class="session-top"><button id="exitSession" class="back-button">← 结束并返回</button><span class="session-tag">${s.mode === '专业面试' ? escapeHtml(s.major) + ' · ' : ''}${s.timerMode === 'single' ? '单题计时' : '整场计时'}</span><span class="session-progress">已答 ${progress} 题</span></div><div class="timer-card ${s.expired ? 'is-expired' : ''}"><div><div class="timer-label">${s.timerMode === 'single' ? '本题' : '整场'}剩余时间${s.paused ? ' · 已暂停' : s.expired ? ' · 已到时' : s.answered && s.timerMode === 'single' ? ' · 阅读答案中' : ''}</div><div id="timerValue" class="timer-value"></div></div><div class="timer-actions"><button id="pauseTimer" ${s.expired ? 'disabled' : ''}>${s.paused ? '继续' : '暂停'}</button><button id="resetTimer">重置</button></div><div class="timer-progress"><span id="timerProgress"></span></div></div>${s.expired && !s.answered ? '<div class="time-up-notice"><span class="notice-icon">⏰</span><span>时间到了！您可以继续思考，完成后点击"答题完成"查看参考答案。</span></div>' : ''}<div class="practice-layout ${showHistory ? '' : 'no-sidebar'}">${historyHtml}<article class="question-card ${showHistory ? 'has-sidebar' : ''}"><div class="question-meta"><span>${q.status === 'approved' ? '公共题库' : '我的题库'}</span><strong>${escapeHtml(q.category)} · ${escapeHtml(q.difficulty)}</strong></div><h1>${escapeHtml(q.title)}</h1>${s.answered ? `<div class="answer-box"><div class="answer-title">参考答案</div><p>${escapeHtml(q.answer)}</p></div>` : '<div class="thinking-box">先组织思路，再口头作答。答题完成后点击下方按钮查看参考答案。</div>'}<div class="question-actions"><button id="skipQuestion" class="subtle-action">换一道题${poolCount > s.visitedIds.length ? ` (剩余 ${poolCount - s.visitedIds.length})` : ''}</button><div class="right-actions">${s.answered ? '<button id="nextQuestion" class="soft-button">下一题 →</button>' : '<button id="answerDone" class="primary-button">答题完成 →</button>'}<button id="finishSession" class="ghost-button">结束练习</button></div></div></article></div></section>`;
  $('#exitSession').onclick = finishSession; $('#finishSession').onclick = finishSession;
  $('#pauseTimer').onclick = () => { D.togglePause(s); saveState(); renderSession(); };
  $('#resetTimer').onclick = () => { D.resetTimer(s); saveState(); renderSession(); };
  $('#answerDone')?.addEventListener('click', () => { D.answer(s); saveState(); renderSession(); showToast('很棒！查看参考答案，总结答题要点。', 'success'); });
  const next = guard(() => { D.nextQuestion(state,state.user,s); saveState(); renderSession(); });
  $('#skipQuestion').onclick = next; if ($('#nextQuestion')) $('#nextQuestion').onclick = next;
  updateTimerDom();
}
function finishSession() { if (!state.session) return; clearInterval(timerHandle); state.records.push(D.finish(state.session)); state.session = null; saveState(); renderView('dashboard'); showToast('训练已保存', 'success'); }
function bankTemplate() {
  return `<section class="page-intro"><div><h1>我的题库</h1><p>专业题请填写适用专业；公开题目需审核。</p></div><div class="toolbar bank-toolbar"><div class="search-filter-row"><input type="text" id="bankSearch" class="search-input" placeholder="搜索题目或分类..." /><select id="bankFilter" class="filter-select"><option value="all">全部题目</option><option value="starred">已收藏</option><option value="private">仅自己可见</option><option value="pending">待审核</option><option value="approved">已公开</option><option value="rejected">未通过</option></select></div><div class="action-buttons"><button id="aiGenerate" class="soft-button">🤖 AI 生成题目</button><button id="batchImport" class="ghost-button">📥 批量导入</button><button id="addQuestion" class="primary-button">＋ 新增题目</button></div></div></section><section class="table-panel"><div class="question-list" id="myQuestionList">${questionList(myQuestions())}</div></section>`;
}
function questionList(questions) { return questions.length ? questions.map(q => `<div class="question-item"><div><strong>${escapeHtml(q.title)}</strong><p>${q.mode} · ${escapeHtml(q.majors.join('、') || '通用')} · ${escapeHtml(q.category)}</p></div><div class="question-actions"><button class="icon-button ${q.starred ? 'is-starred' : ''}" data-star="${q.id}" title="${q.starred ? '取消收藏' : '收藏题目'}">★</button><span class="status-pill ${q.status === 'pending' ? 'pending' : ''}">${({ private:'仅自己',pending:'待审核',approved:'已公开',rejected:'未通过' })[q.status]}</span><button class="text-button" data-edit="${q.id}">编辑</button></div></div>`).join('') : '<div class="empty-state">暂无符合条件的题目。可以新增一道自己的题目。</div>'; }
function bindQuestionEdits() { $$('[data-edit]').forEach(b => b.onclick = () => openQuestionModal(b.dataset.edit)); }
function bindQuestionStars() { $$('[data-star]').forEach(b => b.onclick = guard(() => toggleQuestionStar(b.dataset.star))); }
function updateBankList() {
  const filter = $('#bankFilter').value;
  const searchTerm = ($('#bankSearch')?.value || '').toLowerCase().trim();
  let questions = myQuestions();

  // 应用筛选
  if (filter === 'starred') {
    questions = questions.filter(q => q.starred);
  } else if (filter !== 'all') {
    questions = questions.filter(q => q.status === filter);
  }

  // 应用搜索
  if (searchTerm) {
    questions = questions.filter(q =>
      q.title.toLowerCase().includes(searchTerm) ||
      q.answer.toLowerCase().includes(searchTerm) ||
      q.category.toLowerCase().includes(searchTerm) ||
      q.majors.some(m => m.toLowerCase().includes(searchTerm))
    );
  }

  $('#myQuestionList').innerHTML = questionList(questions);
  bindQuestionEdits();
  bindQuestionStars();
}
function toggleQuestionStar(id) {
  const q = myQuestions().find(q => q.id === id);
  if (!q) throw new Error('题目不存在');
  q.starred = !q.starred;
  saveState();
  updateBankList();
  showToast(q.starred ? '已添加到收藏' : '已取消收藏', 'success');
}
function recordsTemplate(records = myRecords(), title = '训练记录') {
  return `<section class="page-intro"><div><h1>${title}</h1><p>共 ${records.length} 次 · 有效训练时长不包含暂停和单题答案阅读时间。</p></div></section>${records.length ? `<div class="data-scroll"><table class="data-table"><thead><tr><th>面试类型 / 专业</th><th>开始时间</th><th>结束时间</th><th>有效用时</th><th>完成 / 抽取</th></tr></thead><tbody>${records.slice().reverse().map(r => `<tr><td>${r.mode}<small>${escapeHtml(r.major || '通用')}</small></td><td>${dateTime(r.startedAt)}</td><td>${dateTime(r.endedAt)}</td><td>${formatDuration(r.duration)}</td><td>${r.answeredCount} / ${r.questionCount} 题</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">还没有训练记录。</div>'}`;
}
function adminTemplate() {
  const users = state.users.filter(u => u.role === 'user'); const pending = state.questions.filter(q => q.status === 'pending');
  return `<section class="page-intro"><div><h1>用户与训练数据</h1><p>显示本浏览器已创建的账号。不同浏览器和设备的数据同步待接入云端服务。</p></div><div class="toolbar"><button id="exportAllData" class="ghost-button">导出全部数据</button><button id="importData" class="ghost-button">导入数据</button></div></section><section class="stats-grid"><div class="stat-card"><span class="stat-label">普通用户（含体验账号）</span><div class="stat-value">${users.length}</div></div><div class="stat-card"><span class="stat-label">普通用户训练次数</span><div class="stat-value">${users.reduce((n,u) => n + D.stats(state,u.id).count,0)}</div></div><div class="stat-card"><span class="stat-label">待审核题目</span><div class="stat-value">${pending.length}</div></div></section><div class="data-scroll"><table class="data-table" id="userTable"><thead><tr><th>用户</th><th>本科专业</th><th>注册时间 / 邮箱状态</th><th>训练次数</th><th>有效时长</th><th>最近训练</th><th>详情</th></tr></thead><tbody>${users.map(u => { const st = D.stats(state,u.id); return `<tr><td>${escapeHtml(u.name)}<small>${escapeHtml(u.email)}</small></td><td>${escapeHtml(u.major || '未填写')}</td><td>${dateTime(u.createdAt)}<small>未验证 · 本地体验</small></td><td>${st.count} 次</td><td>${formatDuration(st.duration)}</td><td>${dateTime(st.last)}</td><td><button class="text-button" data-user="${u.id}">查看</button></td></tr>`; }).join('')}</tbody></table></div><article class="panel admin-review"><h3>公开题目审核</h3>${pending.length ? pending.map(q => `<div class="review-item"><div><strong>${escapeHtml(q.title)}</strong><span>${escapeHtml(state.users.find(u => u.id === q.ownerId)?.name || '旧版题目')} · ${q.mode} · ${escapeHtml(q.majors.join('、') || '通用')}</span><p class="review-answer">参考答案：${escapeHtml(q.answer)}</p></div><div class="review-actions"><button class="tiny-button" data-approve="${q.id}">通过</button><button class="tiny-button danger" data-reject="${q.id}">拒绝</button></div></div>`).join('') : '<div class="empty-state">暂无公开申请。</div>'}</article>${legacyTemplate()}`;
}
function legacyTemplate() {
  const old = state.legacyUnassigned;
  if (!old || (!old.records.length && !old.questions.length)) return '';
  return `<article class="panel admin-review"><h3>旧版待认领数据</h3><p>旧版没有用户归属字段，${old.records.length} 条训练记录、${old.questions.length} 道个人题已保留，未计入用户统计。</p><details><summary>查看旧版内容</summary>${old.questions.map(q => `<p>${escapeHtml(q.title)}<br><small>${escapeHtml(q.answer)}</small></p>`).join('')}${old.records.map(r => `<p>${escapeHtml(r.mode)} · ${escapeHtml(r.startedAt)} · ${formatDuration(r.duration)}</p>`).join('')}</details></article>`;
}
function bindAdmin() {
  $$('[data-user]').forEach(b => b.onclick = () => {
    if (state.user.role !== 'admin') throw new Error('需要管理员权限');
    const u = state.users.find(u => u.id === b.dataset.user); const st = D.stats(state,u.id);
    showModal(`${escapeHtml(u.name)}的资料`, `<div class="user-profile"><p>邮箱：${escapeHtml(u.email)}</p><p>本科专业：${escapeHtml(u.major)}</p><p>研究方向：${escapeHtml(u.research || '未填写')}</p><p>报考学校：${escapeHtml(u.targetSchool || '未填写')}</p><p>报考专业：${escapeHtml(u.targetMajor || '未填写')}</p><p>本科经历：${escapeHtml(u.background || '未填写')}</p></div>${recordsTemplate(st.records, '该用户的训练记录')}`);
  });
  $$('[data-approve]').forEach(b => b.onclick = guard(() => reviewQuestion(b.dataset.approve,true)));
  $$('[data-reject]').forEach(b => b.onclick = guard(() => reviewQuestion(b.dataset.reject,false)));
  $('#exportAllData').onclick = guard(() => exportAllData());
  $('#importData').onclick = guard(() => openImportModal());
}
function reviewQuestion(id, approved) {
  if (state.user.role !== 'admin') throw new Error('需要管理员权限');
  const q = state.questions.find(q => q.id === id && q.status === 'pending'); if (!q) throw new Error('题目已处理，请刷新页面。');
  q.status = approved ? 'approved' : 'rejected'; q.visibility = approved ? '公共' : '私有'; q.reviewedAt = new Date().toISOString(); q.reviewerId = state.user.id;
  saveState(); renderView('admin'); updatePendingBadge(); showToast(approved ? '题目已公开' : '题目未通过审核，仅原作者可见');
}
function updatePendingBadge() { const count = state.questions.filter(q => q.status === 'pending').length; $('#pendingBadge').textContent = count; $('#pendingBadge').classList.toggle('is-hidden', !count); }
function showModal(title, body) {
  $('#modalRoot').innerHTML = `<div class="modal-backdrop" id="activeModal"><article class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><h3 id="modalTitle">${title}</h3><button class="modal-close" id="closeModal" aria-label="关闭">×</button></div>${body}</article></div>`;
  $('#closeModal').onclick = closeModal; $('#activeModal').onclick = event => { if (event.target.id === 'activeModal') closeModal(); }; $('#closeModal').focus();
}
function closeModal() { $('#modalRoot').innerHTML = ''; }
function openProfileModal() {
  if (state.session) { showToast('请先结束当前训练，再修改专业。'); return; }
  const u = state.user;
  const isAdmin = u.role === 'admin';
  const exportButton = isAdmin ? '' : '<div class="data-actions"><button type="button" class="ghost-button" id="exportMyData">导出我的数据</button></div>';
  showModal('个人资料与本科专业', `<form id="profileForm" class="modal-form"><label>称呼<input name="name" value="${escapeHtml(u.name)}" maxlength="30" required></label><label>本科专业<input name="major" list="majorOptions" value="${escapeHtml(u.major)}" placeholder="输入完整本科专业名称" maxlength="80" ${isAdmin ? '' : 'required'}></label>${isAdmin ? '<p class="field-note">管理员账号用于管理平台，不参与面试训练。</p>' : '<p class="field-note">已有示例题：'+D.MAJORS.join('、')+'。其他专业可录入自己的题目，不会混用其他专业的题。</p>'}<label>研究方向（选填）<input name="research" value="${escapeHtml(u.research)}" maxlength="120"></label><label>报考学校（选填）<input name="targetSchool" value="${escapeHtml(u.targetSchool)}" maxlength="120"></label><label>报考专业（选填）<input name="targetMajor" value="${escapeHtml(u.targetMajor)}" maxlength="120"></label><label>本科经历（选填）<textarea name="background" maxlength="2000">${escapeHtml(u.background)}</textarea></label><button class="primary-button" type="submit">保存资料</button>${exportButton}</form>`);
  $('#profileForm').onsubmit = guard(event => {
    event.preventDefault(); const data = new FormData(event.target); const profile = Object.fromEntries([...data.entries()].map(([k,v]) => [k,D.normalize(v)]));
    if (!profile.name || (!isAdmin && !profile.major)) throw new Error(isAdmin ? '称呼需要填写。' : '称呼和本科专业需要填写。');
    Object.assign(state.users.find(x => x.id === u.id), profile); Object.assign(state.user,profile); saveState(); closeModal(); showApp(); showToast('资料已保存','success');
  });
  if (!isAdmin && $('#exportMyData')) {
    $('#exportMyData').onclick = guard(() => exportUserData(state.user.id));
  }
}
function openQuestionModal(id) {
  const existing = id ? myQuestions().find(q => q.id === id) : null;
  if (id && !existing) throw new Error('仅能编辑自己的题目。');
  const q = existing || { title:'', answer:'', mode:'专业面试', majors:state.user.major ? [state.user.major] : [], category:'专业基础', difficulty:'基础', visibility:'私有' };
  showModal(existing ? '编辑题目' : '新增题目', `<form id="questionForm" class="modal-form"><label>题目内容<textarea name="title" maxlength="2000" required>${escapeHtml(q.title)}</textarea></label><label>参考答案<textarea name="answer" maxlength="10000" required>${escapeHtml(q.answer)}</textarea></label><label>面试类型<select name="mode">${D.MODES.map(m => `<option ${q.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label><label id="questionMajorLabel">适用本科专业（多个用中文逗号分隔）<input name="majors" list="majorOptions" value="${escapeHtml(q.majors.join('，'))}" maxlength="400"></label><label>分类<input name="category" value="${escapeHtml(q.category)}" maxlength="60" required></label><label>难度<select name="difficulty">${['基础','中等','进阶'].map(d => `<option ${q.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label><label>可见范围<select name="visibility"><option value="private" ${q.visibility === '私有' ? 'selected' : ''}>仅自己可见</option><option value="public" ${q.visibility !== '私有' ? 'selected' : ''}>申请公开（保存后重新审核）</option></select></label><button type="submit" class="primary-button">保存题目</button></form>`);
  const form = $('#questionForm');
  const setMajorRequired = () => { const professional = form.elements.mode.value === '专业面试'; form.elements.majors.required = professional; $('#questionMajorLabel').classList.toggle('is-hidden', !professional); };
  form.elements.mode.onchange = setMajorRequired; setMajorRequired();
  form.onsubmit = guard(event => {
    event.preventDefault(); const data = new FormData(form); const mode = String(data.get('mode'));
    const majors = mode === '专业面试' ? [...new Set(String(data.get('majors')).split(/[,，、;；]/).map(D.normalize).filter(Boolean))] : [];
    const title = String(data.get('title')).trim(); const answer = String(data.get('answer')).trim(); const category = String(data.get('category')).trim();
    if (!title || !answer || !category || (mode === '专业面试' && !majors.length)) throw new Error('请完整填写题目、答案、分类和适用专业。');
    const isPublic = data.get('visibility') === 'public';
    const question = { id: existing ? existing.id : crypto.randomUUID(), ownerId:state.user.id, title, answer, category, difficulty:String(data.get('difficulty')), mode, majors, visibility:isPublic ? '待审核' : '私有', status:isPublic ? 'pending' : 'private', updatedAt:new Date().toISOString() };
    if (existing) state.questions[state.questions.indexOf(existing)] = question; else state.questions.push(question);
    saveState(); closeModal(); renderView('bank'); updatePendingBadge(); showToast(isPublic ? '已提交公开审核' : '私有题目已保存', 'success');
  });
}
window.addEventListener('pagehide', () => { if (state?.session) { D.tick(state.session); saveState(); } });
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) { clearInterval(timerHandle); $('#appView').classList.add('is-hidden'); $('#authView').classList.remove('is-hidden'); $('#authView').innerHTML = '<main class="auth-card"><h1>数据已在另一标签页更新</h1><p>请刷新页面以加载最新状态，避免覆盖训练记录。</p><button class="primary-button" onclick="location.reload()">刷新页面</button></main>'; }
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

// 数据导入导出功能
function exportUserData(userId) {
  const user = state.users.find(u => u.id === userId);
  if (!user) throw new Error('用户不存在');

  const userQuestions = state.questions.filter(q => q.ownerId === userId);
  const userRecords = state.records.filter(r => r.userId === userId);

  const exportData = {
    exportVersion: 1,
    exportDate: new Date().toISOString(),
    exportType: 'user',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      major: user.major,
      research: user.research,
      targetMajor: user.targetMajor,
      targetSchool: user.targetSchool,
      background: user.background,
      createdAt: user.createdAt,
      verified: user.verified
    },
    questions: userQuestions,
    records: userRecords,
    statistics: {
      questionCount: userQuestions.length,
      recordCount: userRecords.length,
      totalDuration: userRecords.reduce((sum, r) => sum + r.duration, 0)
    }
  };

  downloadJSON(exportData, `yanmian-user-${user.name}-${formatDateForFilename()}.json`);
  showToast('个人数据已导出', 'success');
}

function exportAllData() {
  if (state.user.role !== 'admin') throw new Error('需要管理员权限');

  const exportData = {
    exportVersion: 1,
    exportDate: new Date().toISOString(),
    exportType: 'full',
    users: state.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      major: u.major,
      research: u.research,
      targetMajor: u.targetMajor,
      targetSchool: u.targetSchool,
      background: u.background,
      createdAt: u.createdAt,
      verified: u.verified
    })),
    questions: state.questions,
    records: state.records,
    legacyUnassigned: state.legacyUnassigned,
    statistics: {
      userCount: state.users.length,
      questionCount: state.questions.length,
      recordCount: state.records.length
    }
  };

  downloadJSON(exportData, `yanmian-full-backup-${formatDateForFilename()}.json`);
  showToast('全部数据已导出', 'success');
}

function openImportModal() {
  if (state.user.role !== 'admin') throw new Error('需要管理员权限');

  showModal('导入数据', `
    <div class="modal-form">
      <div class="import-warning">
        <p><strong>⚠️ 导入前请注意：</strong></p>
        <ul>
          <li>导入会合并数据，不会删除现有数据</li>
          <li>相同 ID 的用户、题目、记录会被跳过</li>
          <li>建议先导出当前数据作为备份</li>
        </ul>
      </div>
      <label class="file-input-label">
        <input type="file" id="importFile" accept=".json" style="display:none">
        <button type="button" class="ghost-button full-width" onclick="document.getElementById('importFile').click()">选择 JSON 文件</button>
      </label>
      <div id="importPreview" style="display:none; margin-top: 1rem;">
        <h4>导入预览</h4>
        <div id="importInfo" class="import-info"></div>
        <button id="confirmImport" class="primary-button full-width">确认导入</button>
      </div>
    </div>
  `);

  let pendingImport = null;

  $('#importFile').onchange = guard(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.exportVersion || !data.exportType) {
        throw new Error('文件格式不正确，请选择有效的研面导出文件');
      }

      pendingImport = data;
      const preview = analyzeImport(data);

      $('#importInfo').innerHTML = `
        <p>文件类型：${data.exportType === 'full' ? '完整备份' : '用户数据'}</p>
        <p>导出时间：${dateTime(data.exportDate)}</p>
        <p>包含内容：${preview.users} 个用户、${preview.questions} 道题目、${preview.records} 条记录</p>
        <p style="color: var(--color-success)">可导入：${preview.newUsers} 个新用户、${preview.newQuestions} 道新题目、${preview.newRecords} 条新记录</p>
        ${preview.skipped > 0 ? `<p style="color: var(--color-warning)">跳过：${preview.skipped} 条重复数据</p>` : ''}
      `;

      $('#importPreview').style.display = 'block';
    } catch (error) {
      showToast('文件读取失败：' + error.message, 'error');
      event.target.value = '';
    }
  });

  const confirmButton = $('#confirmImport');
  if (confirmButton) {
    confirmButton.onclick = guard(() => {
      if (!pendingImport) throw new Error('请先选择文件');
      importData(pendingImport);
      closeModal();
    });
  }
}

function analyzeImport(data) {
  const existingUserIds = new Set(state.users.map(u => u.id));
  const existingQuestionIds = new Set(state.questions.map(q => q.id));
  const existingRecordIds = new Set(state.records.map(r => r.id));

  let newUsers = 0, newQuestions = 0, newRecords = 0, skipped = 0;

  if (data.users) {
    data.users.forEach(u => {
      if (existingUserIds.has(u.id)) skipped++;
      else newUsers++;
    });
  }

  if (data.questions) {
    data.questions.forEach(q => {
      if (existingQuestionIds.has(q.id)) skipped++;
      else newQuestions++;
    });
  }

  if (data.records) {
    data.records.forEach(r => {
      if (existingRecordIds.has(r.id)) skipped++;
      else newRecords++;
    });
  }

  return {
    users: data.users?.length || 0,
    questions: data.questions?.length || 0,
    records: data.records?.length || 0,
    newUsers,
    newQuestions,
    newRecords,
    skipped
  };
}

function importData(data) {
  if (state.user.role !== 'admin') throw new Error('需要管理员权限');

  let imported = { users: 0, questions: 0, records: 0 };

  // 导入用户（跳过重复ID和密码哈希，需要用户重新设置密码）
  if (data.users) {
    const existingIds = new Set(state.users.map(u => u.id));
    const existingEmails = new Set(state.users.map(u => u.email));

    data.users.forEach(u => {
      if (!existingIds.has(u.id) && !existingEmails.has(u.email)) {
        // 不导入密码哈希，设置为需要重置
        state.users.push({
          ...u,
          passwordHash: '', // 需要用户重新设置密码
          verified: false,
          importedAt: new Date().toISOString()
        });
        imported.users++;
      }
    });
  }

  // 导入题目
  if (data.questions) {
    const existingIds = new Set(state.questions.map(q => q.id));

    data.questions.forEach(q => {
      if (!existingIds.has(q.id)) {
        state.questions.push(q);
        imported.questions++;
      }
    });
  }

  // 导入训练记录
  if (data.records) {
    const existingIds = new Set(state.records.map(r => r.id));

    data.records.forEach(r => {
      if (!existingIds.has(r.id)) {
        state.records.push(r);
        imported.records++;
      }
    });
  }

  // 导入旧版未分配数据
  if (data.legacyUnassigned) {
    if (!state.legacyUnassigned) {
      state.legacyUnassigned = { records: [], questions: [] };
    }

    if (data.legacyUnassigned.records) {
      const existingIds = new Set(state.legacyUnassigned.records.map(r => r.id || r.startedAt));
      data.legacyUnassigned.records.forEach(r => {
        const id = r.id || r.startedAt;
        if (!existingIds.has(id)) {
          state.legacyUnassigned.records.push(r);
        }
      });
    }

    if (data.legacyUnassigned.questions) {
      const existingTitles = new Set(state.legacyUnassigned.questions.map(q => q.title));
      data.legacyUnassigned.questions.forEach(q => {
        if (!existingTitles.has(q.title)) {
          state.legacyUnassigned.questions.push(q);
        }
      });
    }
  }

  saveState();
  renderView('admin');
  updatePendingBadge();

  showToast(`导入完成：${imported.users} 个用户、${imported.questions} 道题目、${imported.records} 条记录`, 'success');
}

function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDateForFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}`;
}

// 题库批量导入功能
function openBatchImportModal() {
  showModal('批量导入题目', `
    <div class="modal-form">
      <div class="batch-import-guide">
        <h4>📝 文件格式说明</h4>
        <p><strong>支持格式：</strong>CSV（推荐）、Excel（.xlsx）、JSON</p>
        <p><strong>CSV格式要求：</strong>每行一道题，按以下顺序排列：</p>
        <code>题目内容,参考答案,面试类型,适用专业,分类,难度,可见范围</code>
        <ul>
          <li>面试类型：专业面试 / 英语面试 / 综合面试</li>
          <li>适用专业：多个专业用中文逗号分隔（英语/综合可留空）</li>
          <li>难度：基础 / 中等 / 进阶</li>
          <li>可见范围：私有 / 公开</li>
        </ul>
        <p><strong>示例：</strong></p>
        <code>进程与线程的区别是什么？,进程是资源分配单位...,专业面试,计算机科学与技术、软件工程,操作系统,基础,私有</code>
        <div class="guide-actions">
          <button type="button" class="text-button" id="downloadTemplate">下载 CSV 模板</button>
          <button type="button" class="text-button" id="downloadExample">下载示例文件</button>
        </div>
      </div>
      <label class="file-input-label">
        <input type="file" id="batchImportFile" accept=".csv,.xlsx,.json" style="display:none">
        <button type="button" class="ghost-button full-width" onclick="document.getElementById('batchImportFile').click()">选择文件</button>
      </label>
      <div id="batchPreview" style="display:none; margin-top: 1rem;">
        <h4>导入预览</h4>
        <div id="batchInfo" class="import-info"></div>
        <div id="batchErrors" class="batch-errors" style="display:none;"></div>
        <button id="confirmBatchImport" class="primary-button full-width">确认导入</button>
      </div>
    </div>
  `);

  let pendingQuestions = [];

  $('#downloadTemplate').onclick = () => downloadCSVTemplate();
  $('#downloadExample').onclick = () => downloadCSVExample();

  $('#batchImportFile').onchange = guard(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await parseBatchFile(file);
      pendingQuestions = result.questions;

      if (result.errors.length > 0) {
        $('#batchErrors').style.display = 'block';
        $('#batchErrors').innerHTML = `<p style="color: var(--coral); font-weight: 600;">⚠️ 发现 ${result.errors.length} 个错误：</p><ul>${result.errors.slice(0, 10).map(e => `<li>${escapeHtml(e)}</li>`).join('')}${result.errors.length > 10 ? `<li>...还有 ${result.errors.length - 10} 个错误</li>` : ''}</ul>`;
      } else {
        $('#batchErrors').style.display = 'none';
      }

      $('#batchInfo').innerHTML = `
        <p>文件名：${escapeHtml(file.name)}</p>
        <p>文件大小：${(file.size / 1024).toFixed(2)} KB</p>
        <p style="color: var(--primary); font-weight: 600;">成功解析：${result.questions.length} 道题目</p>
        <p style="color: var(--muted);">将添加到您的私有题库${result.publicCount > 0 ? `，其中 ${result.publicCount} 道申请公开` : ''}</p>
      `;

      $('#batchPreview').style.display = 'block';
    } catch (error) {
      showToast('文件解析失败：' + error.message, 'error');
      event.target.value = '';
    }
  });

  const confirmButton = $('#confirmBatchImport');
  if (confirmButton) {
    confirmButton.onclick = guard(() => {
      if (pendingQuestions.length === 0) throw new Error('没有可导入的题目');
      batchImportQuestions(pendingQuestions);
      closeModal();
    });
  }
}

async function parseBatchFile(file) {
  const fileName = file.name.toLowerCase();
  let text = '';

  if (fileName.endsWith('.json')) {
    text = await file.text();
    return parseJSON(text);
  } else if (fileName.endsWith('.csv')) {
    text = await file.text();
    return parseCSV(text);
  } else if (fileName.endsWith('.xlsx')) {
    // 简化处理：提示用户导出为CSV
    throw new Error('Excel 文件请先在 Excel 中另存为 CSV 格式，然后导入 CSV 文件');
  } else {
    throw new Error('不支持的文件格式，请使用 CSV 或 JSON 文件');
  }
}

function parseJSON(text) {
  const data = JSON.parse(text);
  const questions = [];
  const errors = [];
  let publicCount = 0;

  if (!Array.isArray(data)) {
    throw new Error('JSON 文件格式错误：应为题目数组');
  }

  data.forEach((item, idx) => {
    try {
      const q = validateQuestion(item, idx + 1);
      questions.push(q);
      if (q.visibility === '待审核') publicCount++;
    } catch (error) {
      errors.push(`第 ${idx + 1} 行：${error.message}`);
    }
  });

  return { questions, errors, publicCount };
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  const questions = [];
  const errors = [];
  let publicCount = 0;

  // 检测是否有表头
  let startIndex = 0;
  if (lines[0] && (lines[0].includes('题目') || lines[0].includes('内容'))) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const parts = parseCSVLine(line);
      if (parts.length < 3) {
        errors.push(`第 ${i + 1} 行：至少需要题目、答案、面试类型三列`);
        continue;
      }

      const [title, answer, mode, majorsStr = '', category = '专业基础', difficulty = '基础', visibility = '私有'] = parts;

      const item = {
        title: title.trim(),
        answer: answer.trim(),
        mode: mode.trim(),
        majors: majorsStr.trim() ? majorsStr.split(/[,，、;；]/).map(m => m.trim()).filter(Boolean) : [],
        category: category.trim() || '专业基础',
        difficulty: difficulty.trim() || '基础',
        visibility: visibility.trim() || '私有'
      };

      const q = validateQuestion(item, i + 1);
      questions.push(q);
      if (q.visibility === '待审核') publicCount++;
    } catch (error) {
      errors.push(`第 ${i + 1} 行：${error.message}`);
    }
  }

  return { questions, errors, publicCount };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result.map(s => s.trim());
}

function validateQuestion(item, lineNum) {
  if (!item.title || !item.answer) {
    throw new Error('题目内容和参考答案不能为空');
  }

  if (!D.MODES.includes(item.mode)) {
    throw new Error(`面试类型无效，应为：${D.MODES.join('、')}`);
  }

  if (item.mode === '专业面试' && (!item.majors || item.majors.length === 0)) {
    throw new Error('专业面试必须填写适用专业');
  }

  const validDifficulties = ['基础', '中等', '进阶'];
  if (!validDifficulties.includes(item.difficulty)) {
    item.difficulty = '基础';
  }

  const isPublic = item.visibility === '公开' || item.visibility === '申请公开';

  return {
    id: crypto.randomUUID(),
    ownerId: state.user.id,
    title: item.title,
    answer: item.answer,
    mode: item.mode,
    majors: item.majors || [],
    category: item.category || '专业基础',
    difficulty: item.difficulty,
    visibility: isPublic ? '待审核' : '私有',
    status: isPublic ? 'pending' : 'private',
    updatedAt: new Date().toISOString()
  };
}

function batchImportQuestions(questions) {
  questions.forEach(q => state.questions.push(q));
  saveState();
  renderView('bank');
  updatePendingBadge();
  showToast(`成功导入 ${questions.length} 道题目`, 'success');
}

function downloadCSVTemplate() {
  const template = '题目内容,参考答案,面试类型,适用专业,分类,难度,可见范围\n';
  const blob = new Blob(['﻿' + template], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '研面题库导入模板.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('模板已下载', 'success');
}

function downloadCSVExample() {
  const example = `题目内容,参考答案,面试类型,适用专业,分类,难度,可见范围
进程与线程的区别是什么？,进程是资源分配和隔离的基本单位，线程是处理器调度的基本单位。同一进程内的线程共享地址空间。,专业面试,计算机科学与技术、软件工程,操作系统,基础,私有
Please introduce yourself in English.,My name is... I graduated from... My research interest is...,英语面试,,口语表达,基础,私有
为什么选择继续深造？,结合真实经历说明知识基础、研究兴趣与发展目标。,综合面试,,综合素质,基础,公开`;

  const blob = new Blob(['﻿' + example], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '研面题库示例.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('示例文件已下载', 'success');
}

// AI 生成题目功能
function openAIGenerateModal() {
  const apiKey = localStorage.getItem('deepseek-api-key') || '';

  showModal('AI 生成面试题目', `
    <div class="modal-form">
      <div class="ai-intro">
        <p>🤖 使用 DeepSeek AI 根据您的专业和面试类型自动生成面试题目</p>
      </div>

      <label>DeepSeek API 密钥
        <input type="password" id="aiApiKey" value="${escapeHtml(apiKey)}" placeholder="sk-..." maxlength="200">
        <span class="field-note">首次使用需要配置 API 密钥。<a href="https://platform.deepseek.com" target="_blank" rel="noopener">获取密钥 →</a></span>
      </label>

      <label>面试类型
        <select id="aiMode" class="select-control">
          ${D.MODES.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select>
      </label>

      <label id="aiMajorLabel">适用专业
        <input id="aiMajor" list="majorOptions" value="${escapeHtml(state.user.major || '')}" placeholder="请输入专业名称" maxlength="100">
        <span class="field-note">专业面试必填，其他类型可留空</span>
      </label>

      <label>题目分类
        <input id="aiCategory" value="专业基础" placeholder="例如：操作系统、数据结构" maxlength="60">
      </label>

      <label>难度等级
        <select id="aiDifficulty" class="select-control">
          <option value="基础">基础</option>
          <option value="中等">中等</option>
          <option value="进阶">进阶</option>
        </select>
      </label>

      <label>生成数量
        <select id="aiCount" class="select-control">
          <option value="3" selected>3 道题</option>
          <option value="5">5 道题</option>
          <option value="10">10 道题</option>
        </select>
        <span class="field-note">生成较多题目需要更长时间</span>
      </label>

      <div id="aiGenerateProgress" style="display:none;" class="ai-progress">
        <div class="progress-spinner"></div>
        <p>正在生成题目，请稍候...</p>
      </div>

      <div id="aiGenerateResult" style="display:none;">
        <h4>生成的题目</h4>
        <div id="aiQuestionPreview" class="ai-preview"></div>
        <button id="confirmAIQuestions" class="primary-button full-width">确认添加到题库</button>
      </div>

      <button id="startAIGenerate" class="primary-button full-width">开始生成</button>
    </div>
  `);

  let generatedQuestions = [];

  const updateMajorRequired = () => {
    const mode = $('#aiMode').value;
    const isProfessional = mode === '专业面试';
    $('#aiMajor').required = isProfessional;
    $('#aiMajorLabel').style.opacity = isProfessional ? '1' : '0.6';
  };

  $('#aiMode').onchange = updateMajorRequired;
  updateMajorRequired();

  $('#startAIGenerate').onclick = guard(async () => {
    const apiKey = $('#aiApiKey').value.trim();
    const mode = $('#aiMode').value;
    const major = $('#aiMajor').value.trim();
    const category = $('#aiCategory').value.trim();
    const difficulty = $('#aiDifficulty').value;
    const count = parseInt($('#aiCount').value);

    if (!apiKey) throw new Error('请输入 DeepSeek API 密钥');
    if (mode === '专业面试' && !major) throw new Error('专业面试必须填写适用专业');
    if (!category) throw new Error('请输入题目分类');

    // 保存 API 密钥
    localStorage.setItem('deepseek-api-key', apiKey);

    // 显示进度
    $('#startAIGenerate').style.display = 'none';
    $('#aiGenerateProgress').style.display = 'block';

    try {
      const questions = await generateQuestionsWithAI(apiKey, {
        mode,
        major,
        category,
        difficulty,
        count
      });

      generatedQuestions = questions;

      // 显示预览
      $('#aiGenerateProgress').style.display = 'none';
      $('#aiGenerateResult').style.display = 'block';
      $('#aiQuestionPreview').innerHTML = questions.map((q, i) => `
        <div class="ai-question-item">
          <div class="ai-question-num">题目 ${i + 1}</div>
          <strong>${escapeHtml(q.title)}</strong>
          <p class="ai-answer">${escapeHtml(q.answer)}</p>
        </div>
      `).join('');

      showToast(`成功生成 ${questions.length} 道题目`, 'success');
    } catch (error) {
      $('#aiGenerateProgress').style.display = 'none';
      $('#startAIGenerate').style.display = 'block';
      throw error;
    }
  });

  const confirmButton = $('#confirmAIQuestions');
  if (confirmButton) {
    confirmButton.onclick = guard(() => {
      if (generatedQuestions.length === 0) throw new Error('没有可添加的题目');

      generatedQuestions.forEach(q => {
        state.questions.push({
          id: crypto.randomUUID(),
          ownerId: state.user.id,
          title: q.title,
          answer: q.answer,
          mode: q.mode,
          majors: q.majors || [],
          category: q.category,
          difficulty: q.difficulty,
          visibility: '私有',
          status: 'private',
          starred: false,
          updatedAt: new Date().toISOString()
        });
      });

      saveState();
      closeModal();
      renderView('bank');
      showToast(`已添加 ${generatedQuestions.length} 道题目到题库`, 'success');
    });
  }
}

async function generateQuestionsWithAI(apiKey, config) {
  const { mode, major, category, difficulty, count } = config;

  // 构建 prompt
  let prompt = `你是一位经验丰富的研究生面试官。请根据以下要求生成 ${count} 道面试题目：

面试类型：${mode}
${mode === '专业面试' ? `专业领域：${major}` : ''}
题目分类：${category}
难度等级：${difficulty}

要求：
1. 每道题目都要贴近研究生复试场景
2. ${mode === '专业面试' ? '题目要涵盖该专业的核心知识点和原理' : mode === '英语面试' ? '使用英文出题，适合口语表达' : '侧重综合素质和学术规划'}
3. 答案要详细、准确，包含关键知识点
4. 难度符合"${difficulty}"水平

请严格按照以下 JSON 格式输出，不要添加任何其他内容：
[
  {
    "title": "题目内容",
    "answer": "详细的参考答案"
  }
]`;

  console.log('[AI生成] 开始调用 DeepSeek API');
  console.log('[AI生成] 配置:', { mode, major, category, difficulty, count });

  let response;
  try {
    response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个研究生面试题目生成助手，专门生成高质量的面试题目和答案。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });
  } catch (fetchError) {
    console.error('[AI生成] 网络请求失败:', fetchError);
    throw new Error(`网络请求失败: ${fetchError.message}。这可能是由于 CORS 跨域限制，建议使用服务端代理调用 API。`);
  }

  console.log('[AI生成] API 响应状态:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI生成] API 返回错误:', errorText);
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      throw new Error(`API 请求失败 (${response.status}): ${errorText.substring(0, 200)}`);
    }
    throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  console.log('[AI生成] API 返回数据:', data);

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    console.error('[AI生成] API 返回内容为空');
    throw new Error('API 返回内容为空');
  }

  console.log('[AI生成] 返回内容:', content);

  // 解析 JSON
  let questions;
  try {
    // 尝试提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[AI生成] 无法从响应中提取 JSON:', content);
      throw new Error('无法从响应中提取 JSON 数据，AI 可能返回了非标准格式');
    }
    console.log('[AI生成] 提取的 JSON:', jsonMatch[0]);
    questions = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('[AI生成] JSON 解析失败:', e);
    throw new Error('解析 AI 返回的题目失败：' + e.message + '。请尝试重新生成。');
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    console.error('[AI生成] 返回数据格式不正确:', questions);
    throw new Error('AI 返回的数据格式不正确或为空');
  }

  console.log('[AI生成] 成功生成题目数量:', questions.length);

  // 补充字段
  return questions.map(q => ({
    title: q.title,
    answer: q.answer,
    mode: mode,
    majors: mode === '专业面试' ? [major] : [],
    category: category,
    difficulty: difficulty
  }));
}

// init() 现在由 index.html 中的 DOMContentLoaded 事件触发
// 不在这里自动调用，避免 DOM 未加载完成就执行