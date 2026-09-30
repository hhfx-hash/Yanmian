function dashboardTemplate() {
  const records = myRecords(); const recentRecords = records.slice(-3).reverse(); const totalMinutes = Math.round(records.reduce((sum, item) => sum + item.duration, 0) / 60); const count = records.length;

  // 计算最近7天的训练数据
  const last7Days = getLast7DaysStats(records);
  const last7DaysChart = last7Days.map((day, idx) => {
    const maxCount = Math.max(...last7Days.map(d => d.count), 1);
    const height = day.count > 0 ? (day.count / maxCount * 100) : 2;
    return `<div class="chart-bar" title="${day.date} ${day.count}次"><span style="height:${height}%"></span><label>${day.label}</label></div>`;
  }).join('');

  // 按专业统计
  const modeStats = ['专业面试', '英语面试', '综合面试'].map(mode => {
    const n = records.filter(r => r.mode === mode).length;
    const percent = count ? Math.round(n / count * 100) : 0;
    const totalDuration = records.filter(r => r.mode === mode).reduce((sum, r) => sum + r.duration, 0);
    return { mode, count: n, percent, duration: totalDuration };
  });

  // 答题完成率统计
  const totalQuestions = records.reduce((sum, r) => sum + r.questionCount, 0);
  const answeredQuestions = records.reduce((sum, r) => sum + r.answeredCount, 0);
  const completionRate = totalQuestions > 0 ? Math.round(answeredQuestions / totalQuestions * 100) : 0;

  return `<section class="welcome-row"><div><span class="eyebrow">个人训练空间</span><h1>你好，${escapeHtml(state.user.name || '林同学')} <span aria-hidden="true">👋</span></h1><p>本科专业：${escapeHtml(state.user.major || "尚未填写")} <button class="text-button" data-profile>修改个人资料 →</button></p></div><div class="date-chip"><b>◷</b>${formatDate()}</div></section>
  <section class="stats-grid"><article class="stat-card"><span class="stat-label">累计训练时长</span><div class="stat-value">${totalMinutes}<span class="stat-unit">分钟</span></div><div class="stat-meta">${count ? '保持你的节奏' : '完成第一次训练后显示'}</div></article><article class="stat-card mint"><span class="stat-label">累计训练次数</span><div class="stat-value">${count}<span class="stat-unit">次</span></div><div class="stat-meta">${count ? '每一次都在进步' : '今天开始第一题'}</div></article><article class="stat-card amber"><span class="stat-label">答题完成率</span><div class="stat-value">${completionRate}<span class="stat-unit">%</span></div><div class="stat-meta">${totalQuestions > 0 ? `已完成 ${answeredQuestions}/${totalQuestions} 题` : '开始训练后显示'}</div></article></section>
  ${count > 0 ? `<section class="stats-panel"><article class="panel"><div class="panel-heading"><h3>最近7天训练趋势</h3><span style="color:var(--muted);font-size:10px">训练次数</span></div><div class="trend-chart">${last7DaysChart}</div></article></section>` : ''}
  <section class="section-heading"><h3>选择练习模式</h3><a data-go="practice">查看全部 →</a></section><section class="mode-grid"><article class="mode-card"><div><div class="mode-art">⌘</div><h4>专业面试</h4><p>围绕本科专业知识、核心原理<br />和研究方向展开练习。</p></div><div class="mode-link" data-start="专业面试">开始练习 <span>→</span></div></article><article class="mode-card mint"><div><div class="mode-art">Aa</div><h4>英语面试</h4><p>练习自我介绍、英文问答<br />和常见表达场景。</p></div><div class="mode-link" data-start="英语面试">开始练习 <span>→</span></div></article><article class="mode-card amber"><div><div class="mode-art">✦</div><h4>综合面试</h4><p>模拟真实复试，训练<br />表达逻辑和临场反应。</p></div><div class="mode-link" data-start="综合面试">开始练习 <span>→</span></div></article></section>
  <section class="bottom-grid"><article class="panel"><div class="panel-heading"><h3>最近训练</h3><a data-go="records">查看全部 →</a></div>${recentRecords.length ? recentRecords.map(recordRowTemplate).join('') : '<div class="empty-state">还没有训练记录，从上方选择一个模式开始吧。</div>'}</article><article class="panel"><div class="panel-heading"><h3>练习分布</h3><span style="color:var(--muted);font-size:10px">累计次数</span></div>${modeStats.map(stat => `<div class="progress-row"><div class="progress-label"><strong>${stat.mode}</strong><span>${stat.count} 次 · ${formatDuration(stat.duration)}</span></div><div class="progress-bar"><span style="width:${stat.percent}%"></span></div></div>`).join('')}</article></section>`;
}

function getLast7DaysStats(records) {
  const days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayRecords = records.filter(r => {
      const recordDate = new Date(r.startedAt).toISOString().split('T')[0];
      return recordDate === dateStr;
    });

    const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    const label = i === 0 ? '今天' : i === 1 ? '昨天' : `周${weekday}`;

    days.push({
      date: dateStr,
      label: label,
      count: dayRecords.length,
      duration: dayRecords.reduce((sum, r) => sum + r.duration, 0)
    });
  }

  return days;
}
function recordRowTemplate(record) { return `<div class="record-row"><div class="record-main"><div class="record-dot">${iconFor(record.mode)}</div><div><strong>${record.mode}</strong><span>${record.questionCount} 道题 · ${record.sourceLabel}</span></div></div><span class="record-time">${formatDuration(record.duration)}</span></div>`; }

function practiceTemplate() { return `<section class="practice-header"><div><span class="eyebrow">面试练习</span><h1>准备开始一场练习</h1><p>按你的目标选择模式、时间和题目来源。</p></div><div class="practice-hint">建议：先用 3 分钟热身</div></section><section class="setup-grid"><article class="setup-card"><h3>01 · 选择面试模式</h3><div class="choice-grid" id="modeChoices">${['专业面试', '英语面试', '综合面试'].map((mode, i) => `<button class="choice-card ${i === 0 ? 'is-selected' : ''}" data-mode-choice="${mode}"><span class="choice-icon">${iconFor(mode)}</span><span><strong>${mode}</strong><span>${mode === '专业面试' ? '专业知识与原理' : mode === '英语面试' ? '英文表达与问答' : '综合素质与规划'}</span></span></button>`).join('')}</div><label class="setup-label">计时方式</label><div class="radio-grid"><label class="radio-option"><input type="radio" name="timerMode" value="single" checked /> 单题计时 <span style="margin-left:auto;color:var(--muted);font-size:10px">每道题独立计时</span></label><label class="radio-option"><input type="radio" name="timerMode" value="whole" /> 整场计时 <span style="margin-left:auto;color:var(--muted);font-size:10px">整场连续计时</span></label></div></article><article class="setup-card"><h3>02 · 设置练习参数</h3><div class="profile-summary"><strong>本科专业：${escapeHtml(state.user.major || "尚未填写")}</strong><button class="text-button" data-profile>修改</button><p>专业面试只抽取适用于该专业的题目。英语、综合面试使用通用题。</p></div><p class="pool-summary" id="poolSummary" role="status"></p><label class="setup-label" style="margin-top:0">答题时长</label><select id="durationSelect" class="select-control"><option value="60">1 分钟 · 快速热身</option><option value="180" selected>3 分钟 · 标准练习</option><option value="300">5 分钟 · 深度回答</option></select><label class="setup-label">题目来源</label><div class="radio-grid"><label class="radio-option"><input type="radio" name="source" value="mixed" checked /> 公共 + 我的题库 <span style="margin-left:auto;color:var(--primary);font-size:10px">默认</span></label><label class="radio-option"><input type="radio" name="source" value="public" /> 仅公共题库</label><label class="radio-option"><input type="radio" name="source" value="private" /> 仅我的题库</label><label class="radio-option"><input type="radio" name="source" value="starred" /> 仅收藏题目 <span style="margin-left:auto;color:var(--amber);font-size:10px">⭐</span></label></div><div class="setup-footer"><p>答题完成后显示参考答案<br />可随时结束本次练习</p><button class="primary-button" id="startPractice">开始练习 <span>→</span></button></div></article></section>`; }

