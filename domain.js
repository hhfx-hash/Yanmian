/* 本地原型业务规则。正式服务接入后，这些约束同时由服务端执行。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.YanmianDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MODES = ['专业面试', '英语面试', '综合面试'];

  // 当前支持的专业列表
  // TODO: 后续添加其他专业时，在这里添加即可，例如：
  // const MAJORS = ['自动化', '计算机科学与技术', '软件工程', '电子信息工程'];
  const MAJORS = ['自动化'];

  const normalize = value => String(value || '').normalize('NFKC').trim();
  const emailKey = value => normalize(value).toLowerCase();
  function seedQuestions() {
    // 自动化专业题目
    // TODO: 后续添加其他专业时，在 rows 数组中添加对应专业的题目即可
    // 格式：[id, [适用专业数组], 题目, 答案, 分类]
    const rows = [
      ['auto-pid', ['自动化'], 'PID 控制中比例、积分、微分三个环节分别起什么作用？', '比例环节根据当前误差调节，积分环节累积误差以消除某些稳态误差，微分环节反映误差变化趋势以改善动态响应。积分可能引起饱和与超调，微分对噪声敏感。参数需结合对象特性整定，不能简单认为增益越大越好。', '自动控制原理'],
      ['auto-sampling', ['自动化'], '采样定理的条件是什么？采样频率过低会发生什么？', '对于最高频率为 B 的带限信号，理想均匀采样通常要求采样频率大于 2B，才可在理想条件下无失真重建。采样过低会使频谱副本重叠而产生混叠。实际系统还需抗混叠滤波，并为滤波器过渡带留出裕量。', '信号与系统'],
      ['auto-feedback', ['自动化'], '负反馈对放大电路有哪些影响？是否一定稳定？', '在适当反馈条件下，负反馈可降低增益对器件参数变化的敏感性、减小非线性失真并扩展带宽，代价是闭环增益降低。高频相移可能使反馈变为正反馈，从而引起振荡，所以还需分析环路增益、相位裕度与稳定性。', '模拟电子技术'],
      ['auto-state-space', ['自动化'], '什么是状态空间描述？与传递函数相比有什么优势？', '状态空间描述使用一组一阶微分方程描述系统，选取状态变量反映系统内部状态。相比传递函数，状态空间方法适用于多输入多输出系统、时变系统和非线性系统，可以描述系统内部状态，便于现代控制理论的应用。', '现代控制理论'],
      ['auto-stability', ['自动化'], '如何判断线性系统的稳定性？请说明至少两种方法。', '常用方法包括：1. 劳斯判据：根据特征方程系数判断，不需要求解特征根；2. 奈奎斯特判据：利用开环频率特性判断闭环稳定性；3. 根轨迹法：观察闭环极点位置。还可以通过Bode图的相位裕度和幅值裕度判断稳定裕度。', '自动控制原理']
    ];

    const questions = rows.map(([id, majors, title, answer, category]) => ({
      id, majors, title, answer, category,
      mode: '专业面试',
      difficulty: '基础',
      visibility: '公共',
      status: 'approved',
      ownerId: 'system'
    }));

    // 通用题目（英语面试、综合面试）
    const general = [
      ['en-research', '英语面试', 'Please introduce your research interest and explain why you chose it.', '推荐结构：兴趣来源、已做准备、未来计划。示例句式：My research interest is ... I became interested in it when ... To prepare for this field, I have ... 请用真实经历替换省略内容。'],
      ['en-strength', '英语面试', 'What is one strength and one weakness of yours?', '可用具体经历支撑优点：One of my strengths is ... For example, ... 描述不足后补充改进动作：I am working on ... by ... 避免只用抽象形容词。'],
      ['general-plan', '综合面试', '为什么选择继续深造？你对研究生阶段有什么规划？', '结合真实经历说明知识基础、研究兴趣与发展目标。计划可以覆盖课程学习、文献阅读、方法训练与研究实践，强调可执行的安排。'],
      ['general-project', '综合面试', '你完成过最有挑战的项目是什么？你承担了什么工作？', '按照背景、个人任务、行动、结果和反思组织回答。区分团队成果与个人贡献，说明你如何判断问题并验证解决效果。']
    ];

    return questions.concat(general.map(([id, mode, title, answer]) => ({
      id, mode, title, answer,
      category: '通用问答',
      difficulty: '基础',
      majors: [],
      visibility: '公共',
      status: 'approved',
      ownerId: 'system'
    })));
  }
  function createStore(users) { return { version: 2, users, user: null, questions: seedQuestions(), records: [], session: null, legacyUnassigned: { records: [], questions: [] } }; }
  function migrateLegacy(old, users) {
    const store = createStore(users);
    // 旧版没有可靠用户 ID；保留原始数据，但不猜测归属或混入个人统计。
    store.legacyUnassigned = { records: old.records || [], questions: (old.questions || []).filter(q => q.owner === '我') };
    return store;
  }
  function eligibleQuestions(store, user, config) {
    if (!MODES.includes(config.mode) || !['public', 'private', 'mixed', 'starred'].includes(config.source)) throw new Error('面试设置无效');
    const major = normalize(config.major);
    if (config.mode === '专业面试' && !major) throw new Error('请先填写本科专业');
    return store.questions.filter(q => {
      const isPublic = q.status === 'approved' && q.visibility === '公共';
      const isOwn = q.ownerId === user.id;
      const isStarred = q.starred && isOwn;

      let sourceMatch;
      if (config.source === 'starred') {
        sourceMatch = isStarred;
      } else if (config.source === 'public') {
        sourceMatch = isPublic;
      } else if (config.source === 'private') {
        sourceMatch = isOwn && q.visibility === '私有';
      } else {
        sourceMatch = isPublic || isOwn;
      }

      return !q.deleted && q.mode === config.mode && sourceMatch && (config.mode !== '专业面试' || q.majors.some(m => normalize(m) === major));
    });
  }
  function stats(store, userId) {
    const records = store.records.filter(r => r.userId === userId);
    return { records, count: records.length, duration: records.reduce((n, r) => n + r.duration, 0), last: records.length ? records[records.length - 1].endedAt : null };
  }
  function pick(pool, random = Math.random) { return pool[Math.floor(random() * pool.length)]; }
  function createSession(store, user, config, now = Date.now(), random = Math.random) {
    if (!Number.isFinite(config.duration) || config.duration < 10 || config.duration > 7200 || !['single', 'whole'].includes(config.timerMode)) throw new Error('请选择有效的计时设置');
    const pool = eligibleQuestions(store, user, config);
    if (!pool.length) throw new Error(config.mode === '专业面试' ? `当前来源中没有「${normalize(config.major)}」的专业题，请在我的题库录入对应题目或切换题目来源。` : '当前来源没有可用题目，请先补充题目。');
    const question = pick(pool, random);
    return { ...config, userId: user.id, question, startedAt: now, lastTick: now, elapsedMs: 0, remainingMs: config.duration * 1000, paused: false, answered: false, expired: false, visitedIds: [question.id], answeredIds: [] };
  }
  function tick(session, now = Date.now()) {
    const delta = Math.max(0, now - session.lastTick);
    session.lastTick = now;
    if (session.paused || session.expired || (session.timerMode === 'single' && session.answered)) return;
    const used = Math.min(delta, session.remainingMs);
    session.elapsedMs += used;
    session.remainingMs -= used;
    if (session.remainingMs <= 0) session.expired = true;
  }
  function answer(session, now = Date.now()) {
    tick(session, now); session.answered = true;
    if (!session.answeredIds.includes(session.question.id)) session.answeredIds.push(session.question.id);
  }
  function nextQuestion(store, user, session, now = Date.now(), random = Math.random) {
    tick(session, now);
    if (session.timerMode === 'whole' && session.expired) throw new Error('整场倒计时已结束，请结束训练或重置计时。');
    const pool = eligibleQuestions(store, user, session).filter(q => !session.visitedIds.includes(q.id));
    if (!pool.length) throw new Error('本次符合条件的题目已抽完，可以结束训练或补充题库。');
    session.question = pick(pool, random); session.visitedIds.push(session.question.id); session.answered = false;
    if (session.timerMode === 'single') { session.remainingMs = session.duration * 1000; session.expired = false; }
    session.lastTick = now;
  }
  function resetTimer(session, now = Date.now()) { tick(session, now); session.remainingMs = session.duration * 1000; session.expired = false; session.paused = false; }
  function togglePause(session, now = Date.now()) { tick(session, now); session.paused = !session.paused; }
  function finish(session, now = Date.now()) {
    tick(session, now);
    return { id: `record-${session.startedAt}`, userId: session.userId, mode: session.mode, major: session.major, timerMode: session.timerMode, startedAt: new Date(session.startedAt).toISOString(), endedAt: new Date(now).toISOString(), duration: Math.floor(session.elapsedMs / 1000), questionCount: session.visitedIds.length, answeredCount: session.answeredIds.length, questionIds: session.visitedIds.slice(), sourceLabel: { mixed: '混合题库', public: '公共题库', private: '私有题库' }[session.source] };
  }
  return { MODES, MAJORS, normalize, emailKey, seedQuestions, createStore, migrateLegacy, eligibleQuestions, stats, createSession, tick, answer, nextQuestion, resetTimer, togglePause, finish };
});