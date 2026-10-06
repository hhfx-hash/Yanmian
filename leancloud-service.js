// LeanCloud 数据服务层
// 封装所有数据库操作

const LeanCloudService = {

  // ==================== 用户认证 ====================

  /**
   * 用户注册
   * @param {string} email - 邮箱
   * @param {string} password - 密码
   * @param {string} name - 姓名
   * @param {string} major - 专业
   * @returns {Promise<Object>} 用户对象
   */
  async register({ email, password, name, major }) {
    try {
      const user = new AV.User();
      user.setUsername(email);
      user.setEmail(email);
      user.setPassword(password);
      user.set('name', name);
      user.set('major', major);
      user.set('role', 'user');

      await user.signUp();
      console.log('[LeanCloud] 注册成功:', email);

      return {
        id: user.id,
        email: user.getEmail(),
        name: user.get('name'),
        major: user.get('major'),
        role: user.get('role'),
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('[LeanCloud] 注册失败:', error);
      throw new Error(this._parseError(error));
    }
  },

  /**
   * 用户登录
   * @param {string} email - 邮箱
   * @param {string} password - 密码
   * @returns {Promise<Object>} 用户对象
   */
  async login({ email, password }) {
    try {
      const user = await AV.User.logIn(email, password);
      console.log('[LeanCloud] 登录成功:', email);

      return {
        id: user.id,
        email: user.getEmail(),
        name: user.get('name'),
        major: user.get('major'),
        role: user.get('role'),
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('[LeanCloud] 登录失败:', error);
      throw new Error(this._parseError(error));
    }
  },

  /**
   * 用户登出
   */
  async logout() {
    try {
      await AV.User.logOut();
      console.log('[LeanCloud] 登出成功');
    } catch (error) {
      console.error('[LeanCloud] 登出失败:', error);
      throw new Error(this._parseError(error));
    }
  },

  /**
   * 获取当前登录用户
   * @returns {Object|null} 用户对象或 null
   */
  getCurrentUser() {
    const user = AV.User.current();
    if (!user) return null;

    return {
      id: user.id,
      email: user.getEmail(),
      name: user.get('name'),
      major: user.get('major'),
      role: user.get('role'),
      createdAt: user.createdAt
    };
  },

  // ==================== 题目管理 ====================

  /**
   * 创建题目
   * @param {Object} questionData - 题目数据
   * @returns {Promise<Object>} 创建的题目
   */
  async createQuestion(questionData) {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('请先登录');
      }

      const Question = AV.Object.extend('Question');
      const question = new Question();

      question.set('mode', questionData.mode);
      question.set('category', questionData.category || '');
      question.set('content', questionData.content);
      question.set('difficulty', questionData.difficulty || 'medium');
      question.set('isPublic', questionData.isPublic !== false);
      question.set('owner', currentUser);

      await question.save();
      console.log('[LeanCloud] 题目创建成功:', question.id);

      return this._formatQuestion(question);
    } catch (error) {
      console.error('[LeanCloud] 创建题目失败:', error);
      throw new Error(this._parseError(error));
    }
  },

  /**
   * 批量创建题目
   * @param {Array<Object>} questionsData - 题目数组
   * @returns {Promise<Array<Object>>} 创建的题目数组
   */
  async createQuestions(questionsData) {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('请先登录');
      }

      const Question = AV.Object.extend('Question');
      const questions = questionsData.map(data => {
        const question = new Question();
        question.set('mode', data.mode);
        question.set('category', data.category || '');
        question.set('content', data.content);
        question.set('difficulty', data.difficulty || 'medium');
        question.set('isPublic', data.isPublic !== false);
        question.set('owner', currentUser);
        return question;
      });

      const saved = await AV.Object.saveAll(questions);
      console.log('[LeanCloud] 批量创建题目成功:', saved.length);

      return saved.map(q => this._formatQuestion(q));
    } catch (error) {
      console.error('[LeanCloud] 批量创建题目失败:', error);
      throw new Error(this._parseError(error));
    }
  },

  /**
   * 查询题目
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array<Object>>} 题目数组
   */
  async getQuestions(filters = {}) {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('请先登录');
      }

      const query = new AV.Query('Question');

      // 构建查询条件：公开题目 OR 我创建的题目
      const publicQuery = new AV.Query('Question');
      publicQuery.equalTo('isPublic', true);

      const myQuery = new AV.Query('Question');
      myQuery.equalTo('owner', currentUser);

      const mainQuery = AV.Query.or(publicQuery, myQuery);

      // 应用过滤条件
      if (filters.mode) {
        mainQuery.equalTo('mode', filters.mode);
      }
      if (filters.category) {
        mainQuery.equalTo('category', filters.category);
      }
      if (filters.difficulty) {
        mainQuery.equalTo('difficulty', filters.difficulty);
      }

      // 按创建时间倒序
      mainQuery.descending('createdAt');
      mainQuery.limit(1000);

      const results = await mainQuery.find();
      console.log('[LeanCloud] 查询到题目:', results.length);

      return results.map(q => this._formatQuestion(q));
    } catch (error) {
      console.error('[LeanCloud] 查询题目失败:', error);
      throw new Error(this._parseError(error));
    }
  },

  /**
   * 更新题目
   * @param {string} questionId - 题目 ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<Object>} 更新后的题目
   */
  async updateQuestion(questionId, updates) {
    try {
      const Question = AV.Object.createWithoutData('Question', questionId);

      if (updates.content !== undefined) Question.set('content', updates.content);
      if (updates.mode !== undefined) Question.set('mode', updates.mode);
      if (updates.category !== undefined) Question.set('category', updates.category);
      if (updates.difficulty !== undefined) Question.set('difficulty', updates.difficulty);
      if (updates.isPublic !== undefined) Question.set('isPublic', updates.isPublic);

      await Question.save();
      console.log('[LeanCloud] 题目更新成功:', questionId);

      return this._formatQuestion(Question);
    } catch (error) {
      console.error('[LeanCloud] 更新题目失败:', error);
      throw new Error(this._parseError(error));
    }
  },

  /**
   * 删除题目
   * @param {string} questionId - 题目 ID
   */
  async deleteQuestion(questionId) {
    try {
      const Question = AV.Object.createWithoutData('Question', questionId);
      await Question.destroy();
      console.log('[LeanCloud] 题目删除成功:', questionId);
    } catch (error) {
      console.error('[LeanCloud] 删除题目失败:', error);
      throw new Error(this._parseError(error));
    }
  },

  // ==================== 练习记录 ====================

  /**
   * 保存练习记录
   * @param {Object} recordData - 练习记录数据
   * @returns {Promise<Object>} 保存的记录
   */
  async savePracticeRecord(recordData) {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('请先登录');
      }

      const PracticeRecord = AV.Object.extend('PracticeRecord');
      const record = new PracticeRecord();

      record.set('user', currentUser);
      record.set('source', recordData.source);
      record.set('mode', recordData.mode || '');
      record.set('count', recordData.count);
      record.set('answers', recordData.answers);
      record.set('duration', recordData.duration);

      await record.save();
      console.log('[LeanCloud] 练习记录保存成功:', record.id);

      return this._formatPracticeRecord(record);
    } catch (error) {
      console.error('[LeanCloud] 保存练习记录失败:', error);
      throw new Error(this._parseError(error));
    }
  },

  /**
   * 查询练习记录
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array<Object>>} 练习记录数组
   */
  async getPracticeRecords(filters = {}) {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('请先登录');
      }

      const query = new AV.Query('PracticeRecord');
      query.equalTo('user', currentUser);

      if (filters.source) {
        query.equalTo('source', filters.source);
      }
      if (filters.mode) {
        query.equalTo('mode', filters.mode);
      }

      query.descending('createdAt');
      query.limit(1000);

      const results = await query.find();
      console.log('[LeanCloud] 查询到练习记录:', results.length);

      return results.map(r => this._formatPracticeRecord(r));
    } catch (error) {
      console.error('[LeanCloud] 查询练习记录失败:', error);
      throw new Error(this._parseError(error));
    }
  },

  // ==================== 工具方法 ====================

  /**
   * 格式化题目对象
   */
  _formatQuestion(question) {
    return {
      id: question.id,
      mode: question.get('mode'),
      category: question.get('category') || '',
      content: question.get('content'),
      difficulty: question.get('difficulty') || 'medium',
      isPublic: question.get('isPublic') !== false,
      ownerId: question.get('owner')?.id,
      createdAt: question.createdAt
    };
  },

  /**
   * 格式化练习记录对象
   */
  _formatPracticeRecord(record) {
    return {
      id: record.id,
      userId: record.get('user')?.id,
      source: record.get('source'),
      mode: record.get('mode') || '',
      count: record.get('count'),
      answers: record.get('answers'),
      duration: record.get('duration'),
      createdAt: record.createdAt
    };
  },

  /**
   * 解析错误信息
   */
  _parseError(error) {
    if (error.code === 202) return '用户名已被占用';
    if (error.code === 203) return '邮箱已被占用';
    if (error.code === 210) return '用户名或密码错误';
    if (error.code === 211) return '找不到该用户';
    if (error.code === 217) return '无效的用户名';
    if (error.code === 218) return '无效的密码';
    return error.message || '操作失败，请重试';
  }
};

console.log('[LeanCloud] 服务层已加载');
