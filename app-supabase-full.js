'use strict';
const D = YanmianDomain;
let state = {
  user: null,
  session: null,
  questions: [],
  records: [],
  userProfile: null
};
let currentView = 'dashboard';
let timerHandle;

// DOM helpers
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const formatDate = (date = new Date()) => new Intl.DateTimeFormat('zh-CN', { month:'long', day:'numeric', weekday:'short' }).format(date);
function formatDuration(seconds = 0) { const n = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }
const dateTime = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
const iconFor = mode => mode === '专业面试' ? '⌘' : mode === '英语面试' ? 'Aa' : '✦';
const myRecords = () => state.records;
const myQuestions = () => state.questions.filter(q => q.ownerId === state.user.id);

function showToast(message, type = '') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.setAttribute('role', 'status');
  node.textContent = message;
  $('#toastRoot').append(node);
  setTimeout(() => node.remove(), 5000);
}

function guard(action) {
  return async event => {
    try {
      await action(event);
    } catch (error) {
      console.error(error);
      showToast(error.message, 'error');
    }
  };
}

// 初始化
async function init() {
  $('#majorOptions').innerHTML = D.MAJORS.map(m => `<option value="${m}">`).join('');

  // 检查是否有登录会话