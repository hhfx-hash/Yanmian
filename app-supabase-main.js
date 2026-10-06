// 研面系统 - Supabase 版本主应用
// 整合认证、题库、练习、统计等所有功能

class AppSupabase {
  constructor() {
    this.domain = YanmianDomain;
    this.currentView = 'login';
    this.practiceState = null;
  }

  // ==================== 初始化 ====================

  async init() {
    console.log('[App] 开始初始化');

    // 初始化 Domain 层
    await this.domain.init();

    // 检查是否已登录
    const user = this.domain.getCurrentUser();
    if (user) {
      console.log('[App] 用户已登录', user.email);
      this.showMainView();
    } else {
      console.log('[App] 未登录，显示登录页');
      this.showLoginView();
    }
  }

  // ==================== 视图切换 ====================

  showLoginView() {
    this.currentView = 'login';
    document.getElementById('app').innerHTML = renderLoginPage();
    this.bindLoginEvents();
  }

  showMainView() {
    this.currentView = 'main';
    this.showDashboard();
  }

  showDashboard() {
    const profile = this.domain.getCurrentProfile();
    document.getElementById('app').innerHTML = renderMainLayout(profile);
    this.bindMainEvents();
    this.loadDashboard();
  }

  async loadDashboard() {
    const stats = await this.domain.getStatistics();
    const profile = this.domain.getCurrentProfile();
    document.getElementById('main-content').innerHTML = renderDashboard(stats, profile);
  }

  // ==================== 登录注册事件 ====================

  bindLoginEvents() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterBtn = document.getElementById('showRegister');
    const showLoginBtn = document.getElementById('showLogin');

    if (showRegisterBtn) {
      showRegisterBtn.onclick = () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
      };
    }

    if (showLoginBtn) {
      showLoginBtn.onclick = () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
      };
    }

    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        await this.handleLogin();
      };
    }

    if (registerForm) {
      registerForm.onsubmit = async (e) => {
        e.preventDefault();
        await this.handleRegister();
      };
    }
  }

  async handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      alert('请填写完整的登录信息');
      return;
    }

    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '登录中...';

    try {
      const result = await this.domain.login(email, password);

      if (result.success) {
        console.log('[登录成功]', result.user.email);
        this.showMainView();
      } else {
        alert('登录失败：' + result.error);
        submitBtn.disabled = false;
        submitBtn.textContent = '登录';
      }
    } catch (error) {
      console.error('[登录异常]', error);
      alert('登录失败：' + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = '登录';
    }
  }

  async handleRegister() {
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirm').value;
    const name = document.getElementById('registerName').value.trim();
    const major = document.getElementById('registerMajor').value;

    if (!email || !password || !confirmPassword || !name) {
      alert('请填写完整的注册信息');
      return;
    }

    if (password !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      alert('密码长度至少6位');
      return;
    }

    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '注册中...';

    try {
      const result = await this.domain.register(email, password, name, major);

      if (result.success) {
        console.log('[注册成功]', result.user.email);

        // 自动创建默认题目
        submitBtn.textContent = '正在初始化题库...';
        try {
          await SupabaseService.initDefaultQuestions();
          console.log('[默认题目创建成功]');
          alert('注册成功！已为您初始化9道默认题目');
        } catch (initError) {
          console.error('[默认题目创建失败]', initError);
          alert('注册成功！但默认题目创建失败，您可以手动添加题目');
        }

        this.showMainView();
      } else {
        alert('注册失败：' + result.error);
        submitBtn.disabled = false;
        submitBtn.textContent = '注册';
      }
    } catch (error) {
      console.error('[注册异常]', error);

      // 提供更友好的错误提示
      let errorMsg = '注册失败：' + error.message;
      if (error.message.includes('fetch')) {
        errorMsg += '\n\n请确保网络畅通（国内用户需要稳定的网络环境）';
      }

      alert(errorMsg);
      submitBtn.disabled = false;
      submitBtn.textContent = '注册';
    }
  }

  // ==================== 主界面事件 ====================

  bindMainEvents() {
    // 导航
    document.getElementById('nav-dashboard')?.addEventListener('click', () => this.loadDashboard());
    document.getElementById('nav-practice')?.addEventListener('click', () => this.loadPractice());
    document.getElementById('nav-questions')?.addEventListener('click', () => this.loadQuestions());
    document.getElementById('nav-records')?.addEventListener('click', () => this.loadRecords());
    document.getElementById('nav-profile')?.addEventListener('click', () => this.loadProfile());

    // 登出
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      if (confirm('确定要退出登录吗？')) {
        await this.domain.logout();
        this.showLoginView();
      }
    });
  }

  // ==================== 开始练习 ====================

  async loadPractice() {
    const profile = this.domain.getCurrentProfile();
    document.getElementById('main-content').innerHTML = renderPracticePage(profile);

    // 绑定开始练习按钮
    document.getElementById('startPracticeBtn')?.addEventListener('click', async () => {
      await this.handleStartPractice();
    });
  }

  async handleStartPractice() {
    const mode = document.getElementById('practiceMode').value;
    const source = document.getElementById('practiceSource').value;
    const timerMode = document.getElementById('practiceTimer').value;
    const profile = this.domain.getCurrentProfile();

    // 获取符合条件的题目
    const questions = await this.domain.getEligibleQuestions(mode, profile.major, source);

    if (questions.length === 0) {
      alert('没有符合条件的题目！请先添加题目或选择其他来源。');
      return;
    }

    // 打乱题目顺序
    const shuffled = questions.sort(() => Math.random() - 0.5);

    // 初始化练习状态
    this.practiceState = {
      mode,
      major: profile.major,
      source,
      timerMode,
      questions: shuffled,
      currentIndex: 0,
      startedAt: new Date(),
      answeredCount: 0
    };

    this.showPracticeQuestion();
  }

  showPracticeQuestion() {
    const { questions, currentIndex, timerMode, startedAt } = this.practiceState;
    const currentQuestion = questions[currentIndex];

    document.getElementById('main-content').innerHTML = renderPracticeQuestion(
      currentQuestion,
      currentIndex,
      questions.length,
      timerMode,
      startedAt
    );

    // 绑定按钮事件
    document.getElementById('nextQuestionBtn')?.addEventListener('click', () => {
      this.practiceState.answeredCount++;
      this.nextQuestion();
    });

    document.getElementById('skipQuestionBtn')?.addEventListener('click', () => {
      this.nextQuestion();
    });

    document.getElementById('endPracticeBtn')?.addEventListener('click', () => {
      if (confirm('确定要结束本次练习吗？')) {
        this.endPractice();
      }
    });

    document.getElementById('toggleAnswerBtn')?.addEventListener('click', (e) => {
      const answerDiv = document.getElementById('questionAnswer');
      if (answerDiv.style.display === 'none') {
        answerDiv.style.display = 'block';
        e.target.textContent = '隐藏答案';
      } else {
        answerDiv.style.display = 'none';
        e.target.textContent = '查看答案';
      }
    });

    // 启动计时器
    if (timerMode === 'single') {
      this.startQuestionTimer();
    } else {
      this.startWholeTimer();
    }
  }

  startQuestionTimer() {
    let seconds = 0;
    this.timerInterval = setInterval(() => {
      seconds++;
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const timerEl = document.getElementById('timer');
      if (timerEl) {
        timerEl.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  startWholeTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.practiceState.startedAt.getTime()) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      const timerEl = document.getElementById('timer');
      if (timerEl) {
        timerEl.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  nextQuestion() {
    clearInterval(this.timerInterval);

    this.practiceState.currentIndex++;

    if (this.practiceState.currentIndex >= this.practiceState.questions.length) {
      this.endPractice();
    } else {
      this.showPracticeQuestion();
    }
  }

  async endPractice() {
    clearInterval(this.timerInterval);

    const { mode, major, source, timerMode, questions, startedAt, answeredCount } = this.practiceState;
    const finishedAt = new Date();
    const duration = Math.floor((finishedAt - startedAt) / 1000);

    // 保存训练记录
    const recordData = {
      mode,
      major,
      source,
      timer_mode: timerMode,
      duration,
      question_count: questions.length,
      answered_count: answeredCount,
      questions_data: questions.map(q => ({ id: q.id, text: q.question_text })),
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString()
    };

    await this.domain.savePracticeRecord(recordData);

    // 显示总结
    document.getElementById('main-content').innerHTML = renderPracticeSummary(recordData);

    document.getElementById('backToDashboardBtn')?.addEventListener('click', () => {
      this.practiceState = null;
      this.loadDashboard();
    });
  }

  // ==================== 题库管理 ====================

  async loadQuestions() {
    const questions = await this.domain.getAllQuestions();
    const profile = this.domain.getCurrentProfile();

    document.getElementById('main-content').innerHTML = renderQuestionsPage(questions, profile);

    // 绑定事件
    document.getElementById('addQuestionBtn')?.addEventListener('click', () => this.showAddQuestionModal());
    document.getElementById('searchInput')?.addEventListener('input', (e) => this.filterQuestions(e.target.value));

    // 绑定每个题目的操作按钮
    this.bindQuestionActions(questions);
  }

  bindQuestionActions(questions) {
    questions.forEach(q => {
      // 收藏
      document.getElementById(`star-${q.id}`)?.addEventListener('click', async () => {
        await this.domain.toggleQuestionStar(q.id);
        this.loadQuestions();
      });

      // 编辑
      document.getElementById(`edit-${q.id}`)?.addEventListener('click', () => {
        this.showEditQuestionModal(q);
      });

      // 删除
      document.getElementById(`delete-${q.id}`)?.addEventListener('click', async () => {
        if (confirm('确定要删除这道题目吗？')) {
          await this.domain.deleteQuestion(q.id);
          this.loadQuestions();
        }
      });
    });
  }

  showAddQuestionModal() {
    const profile = this.domain.getCurrentProfile();
    const modalHtml = renderQuestionModal(null, profile);

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);

    this.bindQuestionModalEvents();
  }

  showEditQuestionModal(question) {
    const profile = this.domain.getCurrentProfile();
    const modalHtml = renderQuestionModal(question, profile);

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);

    this.bindQuestionModalEvents(question);
  }

  bindQuestionModalEvents(existingQuestion = null) {
    const modal = document.getElementById('questionModal');
    const form = document.getElementById('questionForm');

    document.getElementById('closeModal')?.addEventListener('click', () => {
      modal.remove();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleQuestionSubmit(existingQuestion);
    });
  }

  async handleQuestionSubmit(existingQuestion) {
    const mode = document.getElementById('questionMode').value;
    const category = document.getElementById('questionCategory').value.trim();
    const difficulty = document.getElementById('questionDifficulty').value;
    const questionText = document.getElementById('questionText').value.trim();
    const answerText = document.getElementById('answerText').value.trim();
    const isPublic = document.getElementById('questionPublic')?.checked || false;

    if (!questionText) {
      alert('请填写题目内容');
      return;
    }

    const profile = this.domain.getCurrentProfile();

    const questionData = {
      mode,
      category,
      difficulty,
      question_text: questionText,
      answer_text: answerText,
      majors: [profile.major],
      source: 'manual',
      is_public: isPublic,
      status: 'approved'
    };

    let result;
    if (existingQuestion) {
      result = await this.domain.updateQuestion(existingQuestion.id, questionData);
    } else {
      result = await this.domain.addQuestion(questionData);
    }

    if (result.success) {
      document.getElementById('questionModal').remove();
      this.loadQuestions();
    } else {
      alert('操作失败：' + result.error);
    }
  }

  filterQuestions(searchText) {
    // 简单的前端过滤（可以优化为后端搜索）
    const rows = document.querySelectorAll('#questionsTable tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchText.toLowerCase()) ? '' : 'none';
    });
  }

  // ==================== 训练记录 ====================

  async loadRecords() {
    const records = await this.domain.getPracticeRecords();
    document.getElementById('main-content').innerHTML = renderRecordsPage(records);
  }

  // ==================== 个人资料 ====================

  async loadProfile() {
    const profile = this.domain.getCurrentProfile();
    document.getElementById('main-content').innerHTML = renderProfilePage(profile);

    document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleProfileUpdate();
    });
  }

  async handleProfileUpdate() {
    const name = document.getElementById('profileName').value.trim();
    const research = document.getElementById('profileResearch').value.trim();
    const targetMajor = document.getElementById('profileTargetMajor').value.trim();
    const targetSchool = document.getElementById('profileTargetSchool').value.trim();
    const background = document.getElementById('profileBackground').value.trim();

    const updates = {
      name,
      research,
      target_major: targetMajor,
      target_school: targetSchool,
      background
    };

    const result = await this.domain.updateProfile(updates);

    if (result.success) {
      alert('资料更新成功！');
      this.loadProfile();
    } else {
      alert('更新失败：' + result.error);
    }
  }
}

// 创建全局实例
window.appSupabase = new AppSupabase();

console.log('[App Supabase] 主应用已加载');
