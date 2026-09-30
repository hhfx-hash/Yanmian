// Domain 层 Supabase 适配器
// 将原 localStorage 版本的 domain.js 逻辑适配到 Supabase

const MODES = ['专业面试', '英语面试', '综合面试'];
const MAJORS = ['自动化'];

class YanmianDomainSupabase {
  constructor() {
    this.service = supabaseService;
    this.currentUser = null;
    this.currentProfile = null;
  }

  // ==================== 初始化 ====================

  async init() {
    try {
      const user = await this.service.getCurrentUser();
      if (user) {
        this.currentUser = user;
        this.currentProfile = await this.service.getUserProfile(user.id);
      }
      return true;
    } catch (error) {
      console.error('[Domain 初始化失败]', error);
      return false;
    }
  }

  // ==================== 认证相关 ====================

  async register(email, password, name, major = '自动化') {
    const result = await this.service.register(email, password, name, major);
    if (result.success) {
      this.currentUser = result.user;
      this.currentProfile = await this.service.getUserProfile(result.user.id);

      // 为新用户初始化默认题目
      await this.service.initDefaultQuestions();
    }
    return result;
  }

  async login(email, password) {
    const result = await this.service.login(email, password);
    if (result.success) {
      this.currentUser = result.user;
      this.currentProfile = await this.service.getUserProfile(result.user.id);
    }
    return result;
  }

  async logout() {
    const result = await this.service.logout();
    this.currentUser = null;
    this.currentProfile = null;
    return result;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getCurrentProfile() {
    return this.currentProfile;
  }

  async updateProfile(updates) {
    if (!this.currentUser) return { success: false, error: '未登录' };

    const result = await this.service.updateUserProfile(this.currentUser.id, updates);
    if (result.success) {
      this.currentProfile = await this.service.getUserProfile(this.currentUser.id);
    }
    return result;
  }

  // ==================== 题目相关 ====================

  async getAllQuestions() {
    if (!this.currentUser) return [];

    // 获取公开题目 + 用户自己的私有题目
    const questions = await this.service.getQuestions({});
    return questions;
  }

  async getQuestionsByFilters(filters) {
    if (!this.currentUser) return [];
    return await this.service.getQuestions(filters);
  }

  async getQuestion(id) {
    return await this.service.getQuestion(id);
  }

  async addQuestion(questionData) {
    if (!this.currentUser) return { success: false, error: '未登录' };
    return await this.service.createQuestion(questionData);
  }

  async updateQuestion(id, updates) {
    if (!this.currentUser) return { success: false, error: '未登录' };
    return await this.service.updateQuestion(id, updates);
  }

  async deleteQuestion(id) {
    if (!this.currentUser) return { success: false, error: '未登录' };
    return await this.service.deleteQuestion(id);
  }

  async toggleQuestionStar(id) {
    if (!this.currentUser) return { success: false, error: '未登录' };

    const question = await this.getQuestion(id);
    if (!question) return { success: false, error: '题目不存在' };

    return await this.service.toggleQuestionStar(id, !question.is_starred);
  }

  async importQuestions(questionsArray) {
    if (!this.currentUser) return { success: false, error: '未登录' };
    return await this.service.createQuestions(questionsArray);
  }

  // ==================== 练习模式 ====================

  async getEligibleQuestions(mode, major, source) {
    if (!this.currentUser) return [];

    const filters = { mode };

    if (source === 'public') {
      filters.isPublic = true;
    } else if (source === 'private') {
      filters.ownerId = this.currentUser.id;
      filters.isPublic = false;
    } else if (source === 'starred') {
      filters.isStarred = true;
    }
    // source === 'mixed' 时不添加额外过滤

    const questions = await this.service.getQuestions(filters);

    // 过滤专业匹配的题目
    return questions.filter(q => {
      const majors = Array.isArray(q.majors) ? q.majors : [];
      return majors.length === 0 || majors.includes(major);
    });
  }

  // ==================== 训练记录 ====================

  async savePracticeRecord(recordData) {
    if (!this.currentUser) return { success: false, error: '未登录' };
    return await this.service.createPracticeRecord(recordData);
  }

  async getPracticeRecords() {
    if (!this.currentUser) return [];
    return await this.service.getPracticeRecords(this.currentUser.id);
  }

  async getStatistics() {
    const records = await this.getPracticeRecords();

    if (records.length === 0) {
      return {
        totalSessions: 0,
        totalQuestions: 0,
        totalMinutes: 0,
        byMode: {}
      };
    }

    const stats = {
      totalSessions: records.length,
      totalQuestions: records.reduce((sum, r) => sum + r.question_count, 0),
      totalMinutes: Math.round(records.reduce((sum, r) => sum + r.duration, 0) / 60),
      byMode: {}
    };

    MODES.forEach(mode => {
      const modeRecords = records.filter(r => r.mode === mode);
      stats.byMode[mode] = {
        sessions: modeRecords.length,
        questions: modeRecords.reduce((sum, r) => sum + r.question_count, 0),
        minutes: Math.round(modeRecords.reduce((sum, r) => sum + r.duration, 0) / 60)
      };
    });

    return stats;
  }

  // ==================== 工具函数 ====================

  getModes() {
    return MODES;
  }

  getMajors() {
    return MAJORS;
  }

  isAdmin() {
    return this.currentProfile && this.currentProfile.role === 'admin';
  }
}

// 创建全局实例
window.YanmianDomain = new YanmianDomainSupabase();

console.log('[Domain Supabase] Domain 层已初始化');
