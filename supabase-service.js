// Supabase 服务层 - 完整的数据操作封装

class SupabaseService {
  constructor() {
    this.supabase = window.supabaseClient;
    this.currentUser = null;
  }

  // ==================== 认证相关 ====================

  // 注册新用户
  async register(email, password, name, major = '自动化') {
    try {
      // 1. 创建认证用户
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('注册失败：未返回用户信息');

      // 2. 创建用户资料
      const { error: profileError } = await this.supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          name,
          major,
          role: 'user'
        });

      if (profileError) throw profileError;

      this.currentUser = authData.user;
      return { success: true, user: authData.user };
    } catch (error) {
      console.error('[注册失败]', error);
      return { success: false, error: error.message };
    }
  }

  // 登录
  async login(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('登录失败：未返回用户信息');

      this.currentUser = data.user;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('[登录失败]', error);
      return { success: false, error: error.message };
    }
  }

  // 登出
  async logout() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      this.currentUser = null;
      return { success: true };
    } catch (error) {
      console.error('[登出失败]', error);
      return { success: false, error: error.message };
    }
  }

  // 获取当前用户
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) throw error;
      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('[获取用户失败]', error);
      return null;
    }
  }

  // 获取用户资料
  async getUserProfile(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[获取资料失败]', error);
      return null;
    }
  }

  // 更新用户资料
  async updateUserProfile(userId, updates) {
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('[更新资料失败]', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== 题目相关 ====================

  // 获取题目列表
  async getQuestions(filters = {}) {
    try {
      let query = this.supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      // 应用筛选条件
      if (filters.mode) {
        query = query.eq('mode', filters.mode);
      }
      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.source) {
        query = query.eq('source', filters.source);
      }
      if (filters.isStarred !== undefined) {
        query = query.eq('is_starred', filters.isStarred);
      }
      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }
      if (filters.ownerId) {
        query = query.eq('owner_id', filters.ownerId);
      }
      if (filters.search) {
        query = query.or(`question_text.ilike.%${filters.search}%,answer_text.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[获取题目失败]', error);
      return [];
    }
  }

  // 获取单个题目
  async getQuestion(id) {
    try {
      const { data, error } = await this.supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[获取题目失败]', error);
      return null;
    }
  }

  // 创建题目
  async createQuestion(questionData) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('未登录');

      const { data, error } = await this.supabase
        .from('questions')
        .insert({
          ...questionData,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[创建题目失败]', error);
      return { success: false, error: error.message };
    }
  }

  // 更新题目
  async updateQuestion(id, updates) {
    try {
      const { error } = await this.supabase
        .from('questions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('[更新题目失败]', error);
      return { success: false, error: error.message };
    }
  }

  // 删除题目
  async deleteQuestion(id) {
    try {
      const { error } = await this.supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('[删除题目失败]', error);
      return { success: false, error: error.message };
    }
  }

  // 切换题目收藏状态
  async toggleQuestionStar(id, isStarred) {
    return this.updateQuestion(id, { is_starred: isStarred });
  }

  // 批量创建题目
  async createQuestions(questionsArray) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('未登录');

      const questionsWithOwner = questionsArray.map(q => ({
        ...q,
        owner_id: user.id
      }));

      const { data, error } = await this.supabase
        .from('questions')
        .insert(questionsWithOwner)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[批量创建题目失败]', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== 训练记录相关 ====================

  // 创建训练记录
  async createPracticeRecord(recordData) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('未登录');

      const { data, error } = await this.supabase
        .from('practice_records')
        .insert({
          ...recordData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[创建训练记录失败]', error);
      return { success: false, error: error.message };
    }
  }

  // 获取训练记录列表
  async getPracticeRecords(userId) {
    try {
      const { data, error } = await this.supabase
        .from('practice_records')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[获取训练记录失败]', error);
      return [];
    }
  }

  // ==================== 初始化默认数据 ====================

  // 为新用户初始化默认题目
  async initDefaultQuestions() {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('未登录');

      // 检查是否已有题目
      const existing = await this.getQuestions({ ownerId: user.id });
      if (existing.length > 0) {
        console.log('[默认题目] 已存在，跳过初始化');
        return { success: true, skipped: true };
      }

      // 默认题目数据
      const defaultQuestions = [
        {
          mode: '专业面试',
          category: '控制理论',
          difficulty: '基础',
          question_text: '请解释PID控制器的工作原理，并说明各个参数的作用。',
          answer_text: 'PID控制器由比例(P)、积分(I)、微分(D)三个部分组成。比例控制根据当前误差调节输出；积分控制消除稳态误差；微分控制预测误差趋势，减少超调。',
          majors: ['自动化'],
          source: 'manual',
          is_public: true,
          status: 'approved'
        },
        {
          mode: '专业面试',
          category: '信号处理',
          difficulty: '进阶',
          question_text: '什么是采样定理？为什么需要满足采样定理？',
          answer_text: '采样定理(奈奎斯特定理)指出，采样频率必须至少为信号最高频率的两倍，才能完整重建原始信号。否则会产生混叠现象，导致信息丢失。',
          majors: ['自动化'],
          source: 'manual',
          is_public: true,
          status: 'approved'
        },
        {
          mode: '专业面试',
          category: '控制系统',
          difficulty: '基础',
          question_text: '请说明负反馈在控制系统中的作用。',
          answer_text: '负反馈将输出信号反馈到输入端，与期望值比较形成误差信号。主要作用：1)提高系统稳定性 2)减小稳态误差 3)降低系统对参数变化的敏感度 4)改善系统动态性能。',
          majors: ['自动化'],
          source: 'manual',
          is_public: true,
          status: 'approved'
        },
        {
          mode: '专业面试',
          category: '现代控制',
          difficulty: '拔高',
          question_text: '什么是状态空间表达式？它与传递函数相比有什么优势？',
          answer_text: '状态空间表达式用一阶微分方程组描述系统，包括状态方程和输出方程。相比传递函数：1)能描述多输入多输出系统 2)可表示系统内部状态 3)便于计算机分析 4)适用于时变和非线性系统。',
          majors: ['自动化'],
          source: 'manual',
          is_public: true,
          status: 'approved'
        },
        {
          mode: '专业面试',
          category: '系统分析',
          difficulty: '进阶',
          question_text: '如何判断一个线性系统的稳定性？',
          answer_text: '判断方法：1)劳斯判据-通过特征方程系数判断 2)奈奎斯特判据-通过开环频率特性 3)根轨迹法-观察闭环极点位置 4)状态空间法-计算系统矩阵特征值。系统稳定的充要条件是所有特征根实部小于零。',
          majors: ['自动化'],
          source: 'manual',
          is_public: true,
          status: 'approved'
        },
        {
          mode: '英语面试',
          category: '自我介绍',
          difficulty: '基础',
          question_text: 'Please introduce yourself briefly.',
          answer_text: '(示例) My name is [Name]. I graduated from [University] with a major in Automation. During my undergraduate studies, I focused on control systems and participated in several robotics projects. I am passionate about applying automation technology to solve real-world problems.',
          majors: ['自动化'],
          source: 'manual',
          is_public: true,
          status: 'approved'
        },
        {
          mode: '英语面试',
          category: '研究兴趣',
          difficulty: '进阶',
          question_text: 'What are your research interests?',
          answer_text: '(示例) I am particularly interested in intelligent control systems and machine learning applications in automation. I believe the integration of AI and traditional control theory can bring significant improvements to industrial automation.',
          majors: ['自动化'],
          source: 'manual',
          is_public: true,
          status: 'approved'
        },
        {
          mode: '综合面试',
          category: '个人发展',
          difficulty: '基础',
          question_text: '你为什么选择报考我们学校/专业的研究生？',
          answer_text: '(需根据实际情况回答) 应包括：1)对学校/专业的了解和认可 2)导师的研究方向与自己兴趣的契合 3)学校的科研平台和资源 4)个人职业规划的匹配度。',
          majors: ['自动化'],
          source: 'manual',
          is_public: true,
          status: 'approved'
        },
        {
          mode: '综合面试',
          category: '学术能力',
          difficulty: '进阶',
          question_text: '请介绍一个你本科阶段最有成就感的项目或科研经历。',
          answer_text: '(需根据实际情况回答) 应包括：1)项目背景和目标 2)你承担的任务和角色 3)遇到的挑战和解决方案 4)最终成果和收获 5)从中学到的能力和经验。',
          majors: ['自动化'],
          source: 'manual',
          is_public: true,
          status: 'approved'
        }
      ];

      const result = await this.createQuestions(defaultQuestions);
      console.log('[默认题目] 初始化完成', result);
      return result;
    } catch (error) {
      console.error('[初始化默认题目失败]', error);
      return { success: false, error: error.message };
    }
  }
}

// 创建全局实例
const supabaseService = new SupabaseService();

console.log('[Supabase Service] 服务层已初始化');
