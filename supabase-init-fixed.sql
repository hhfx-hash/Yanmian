-- 研面系统 Supabase 数据库初始化脚本（修正版）

-- 1. 创建用户资料扩展表
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    major VARCHAR(100),
    research TEXT,
    target_major VARCHAR(100),
    target_school VARCHAR(100),
    background TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建题目表
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    difficulty VARCHAR(20) NOT NULL DEFAULT '基础',
    question_text TEXT NOT NULL,
    answer_text TEXT,
    majors JSONB DEFAULT '[]'::jsonb,
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    is_public BOOLEAN NOT NULL DEFAULT false,
    is_starred BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_mode CHECK (mode IN ('专业面试', '英语面试', '综合面试')),
    CONSTRAINT chk_difficulty CHECK (difficulty IN ('基础', '进阶', '拔高')),
    CONSTRAINT chk_source CHECK (source IN ('manual', 'ai-generated')),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 3. 创建训练记录表
CREATE TABLE public.practice_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode VARCHAR(50) NOT NULL,
    major VARCHAR(100),
    source VARCHAR(50) NOT NULL,
    timer_mode VARCHAR(20) NOT NULL,
    duration INTEGER NOT NULL,
    question_count INTEGER NOT NULL DEFAULT 0,
    answered_count INTEGER NOT NULL DEFAULT 0,
    questions_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_record_mode CHECK (mode IN ('专业面试', '英语面试', '综合面试')),
    CONSTRAINT chk_source CHECK (source IN ('public', 'private', 'mixed', 'starred')),
    CONSTRAINT chk_timer_mode CHECK (timer_mode IN ('single', 'whole'))
);

-- 4. 创建索引
CREATE INDEX idx_questions_owner ON questions(owner_id);
CREATE INDEX idx_questions_mode ON questions(mode);
CREATE INDEX idx_questions_is_public ON questions(is_public);
CREATE INDEX idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX idx_records_user ON practice_records(user_id);
CREATE INDEX idx_records_started_at ON practice_records(started_at DESC);

-- 5. 启用 Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_records ENABLE ROW LEVEL SECURITY;

-- 6. 用户资料权限策略
CREATE POLICY "用户可以查看自己的资料"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的资料"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "用户可以插入自己的资料"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 7. 题目权限策略
CREATE POLICY "所有人可以查看公开题目"
    ON questions FOR SELECT
    USING (is_public = true OR owner_id = auth.uid());

CREATE POLICY "用户可以创建自己的题目"
    ON questions FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "用户可以更新自己的题目"
    ON questions FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "用户可以删除自己的题目"
    ON questions FOR DELETE
    USING (auth.uid() = owner_id);

-- 8. 训练记录权限策略
CREATE POLICY "用户可以查看自己的训练记录"
    ON practice_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建训练记录"
    ON practice_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 9. 创建自动更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. 为表添加自动更新触发器
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 完成！数据库表已创建
-- 注意：默认题目需要在用户注册后通过应用添加
