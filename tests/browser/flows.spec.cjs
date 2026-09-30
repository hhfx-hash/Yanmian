const { test, expect } = require('@playwright/test');
const errors = [];
async function ready(page) {
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => !!localStorage.getItem('yanmian-prototype-state-v2'));
}
async function nav(page, view) {
  if (await page.locator('#openSidebar').isVisible()) await page.locator('#openSidebar').click();
  await page.locator(`[data-view="${view}"]`).click();
}
async function register(page, email, name, major) {
  await page.locator('[data-auth-tab="register"]').click();
  const form = page.locator('#registerForm');
  await form.locator('[name="name"]').fill(name);
  await form.locator('[name="major"]').fill(major);
  await form.locator('[name="email"]').fill(email);
  await form.locator('[name="password"]').fill('Testpass123!');
  await form.locator('[type="submit"]').click();
  await expect(page.locator('#appView')).toBeVisible();
}
async function logout(page) {
  if (await page.locator('#openSidebar').isVisible()) await page.locator('#openSidebar').click();
  await page.locator('#logoutButton').click();
  await expect(page.locator('#authView')).toBeVisible();
}
test.beforeEach(() => { errors.length = 0; });
test.afterEach(() => { expect(errors).toEqual([]); });

test('注册电子信息专业→训练→管理员查看真实用户和详情', async ({page}) => {
  await ready(page);
  await register(page,'alice@example.com','小李','电子信息工程');
  await nav(page,'practice');
  await expect(page.locator('#poolSummary')).toContainText('电子信息工程');
  await page.locator('#startPractice').click();
  await expect(page.locator('.session-tag')).toContainText('电子信息工程');
  await expect(page.locator('.question-card h1')).toContainText(/采样|负反馈/);
  await expect(page.locator('.answer-box')).toHaveCount(0);
  await page.locator('#answerDone').click();
  await expect(page.locator('.answer-box')).toBeVisible();
  await page.locator('#nextQuestion').click();
  await expect(page.locator('.session-top')).toContainText('第 2 题');
  await page.locator('#finishSession').click();
  await nav(page,'records');
  await expect(page.locator('.data-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.data-table tbody')).toContainText('电子信息工程');
  await logout(page);
  await page.locator('#adminDemoLogin').click();
  const row = page.locator('#userTable tr').filter({hasText:'alice@example.com'});
  await expect(row).toContainText('1 次');
  await expect(row).toContainText('电子信息工程');
  await row.getByText('查看',{exact:true}).click();
  await expect(page.locator('#activeModal')).toContainText('小李');
  await expect(page.locator('#activeModal .data-table tbody tr')).toHaveCount(1);
  await page.locator('#closeModal').click();
  await page.screenshot({path:'test-results/admin-desktop.png',fullPage:true});
});

test('专业空题提示、英语通用题、个人题归属和公开审核', async ({page}) => {
  await ready(page); await register(page,'history@example.com','历史同学','历史学');
  await nav(page,'practice'); await page.locator('#startPractice').click();
  await expect(page.locator('.toast').last()).toContainText('历史学');
  await expect(page.locator('.session-shell')).toHaveCount(0);
  await page.locator('[data-mode-choice="英语面试"]').click();
  await page.locator('#startPractice').click();
  await expect(page.locator('.question-card h1')).toContainText(/Please|What/);
  await page.locator('#finishSession').click();
  await nav(page,'bank'); await page.locator('#addQuestion').click();
  const form = page.locator('#questionForm');
  await form.locator('[name="title"]').fill('史料分析如何辨别来源？');
  await form.locator('[name="answer"]').fill('结合来源、时代背景和不同史料进行互证。');
  await form.locator('[type="submit"]').click();
  await expect(page.locator('#myQuestionList')).toContainText('仅自己');
  await nav(page,'practice'); await page.locator('input[name="source"][value="private"]').check();
  await page.locator('#startPractice').click();
  await expect(page.locator('.question-card h1')).toHaveText('史料分析如何辨别来源？');
  await page.locator('#finishSession').click();
  await nav(page,'bank'); await page.locator('[data-edit]').click();
  await page.locator('#questionForm [name="visibility"]').selectOption('public');
  await page.locator('#questionForm [type="submit"]').click();
  await expect(page.locator('#myQuestionList')).toContainText('待审核');
  await logout(page); await page.locator('#demoLogin').click(); await nav(page,'bank');
  await expect(page.locator('#myQuestionList')).not.toContainText('史料分析');
  await logout(page); await page.locator('#adminDemoLogin').click();
  await expect(page.locator('.review-item')).toContainText('互证');
  await page.locator('[data-approve]').click();
  await expect(page.locator('[data-approve]')).toHaveCount(0);
  await logout(page); await page.locator('[data-auth-tab="login"]').click();
  await page.locator('#loginForm [name="email"]').fill('history@example.com');
  await page.locator('#loginForm [name="password"]').fill('Testpass123!');
  await page.locator('#loginForm [type="submit"]').click();
  await nav(page,'practice'); await page.locator('input[name="source"][value="public"]').check();
  await page.locator('#startPractice').click();
  await expect(page.locator('.question-card h1')).toHaveText('史料分析如何辨别来源？');
});

test('真实密码检查、同名前缀不授予管理员，刷新恢复专业资料与训练', async ({page}) => {
  await ready(page); await register(page,'admin@ordinary.local','普通用户','自动化');
  await expect(page.locator('[data-view="admin"]')).toBeHidden();
  await page.locator('#topAvatar').click();
  await page.locator('#profileForm [name="major"]').fill('教育学');
  await page.locator('#profileForm [type="submit"]').click();
  await nav(page,'practice'); await page.locator('input[name="timerMode"][value="whole"]').check();
  await page.locator('#startPractice').click(); await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.locator('.session-tag')).toContainText('教育学');
  await expect(page.locator('#timerValue')).not.toHaveText('03:00');
  await page.locator('#pauseTimer').click(); const paused = await page.locator('#timerValue').textContent();
  await page.waitForTimeout(1200); await expect(page.locator('#timerValue')).toHaveText(paused);
  await page.locator('#pauseTimer').click(); await page.locator('#answerDone').click();
  await page.locator('#nextQuestion').click(); await expect(page.locator('#timerValue')).not.toHaveText('03:00');
  await page.locator('#finishSession').click(); await logout(page);
  await page.locator('[data-auth-tab="login"]').click();
  await page.locator('#loginForm [name="email"]').fill('admin@ordinary.local');
  await page.locator('#loginForm [name="password"]').fill('incorrect');
  await page.locator('#loginForm [type="submit"]').click();
  await expect(page.locator('.toast').last()).toContainText('邮箱或密码不正确');
});

test('手机 390px：编辑专业、训练和用户表不撑开页面', async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await ready(page); await page.locator('#demoLogin').click();
  await expect(page.locator('#pageTitle')).toHaveText('工作台');
  await page.locator('#topAvatar').click(); await page.locator('#profileForm [name="major"]').fill('电气工程及其自动化');
  await page.locator('#profileForm [type="submit"]').click();
  await nav(page,'practice'); await page.locator('#startPractice').click();
  await expect(page.locator('#answerDone')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/practice-mobile.png',fullPage:true});
  await page.locator('#finishSession').click(); await logout(page); await page.locator('#adminDemoLogin').click();
  await expect(page.locator('#userTable')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('旧版数据被保留，不伪造训练归属', async ({page}) => {
  await ready(page);
  await page.evaluate(() => {
    localStorage.removeItem('yanmian-prototype-state-v2');
    localStorage.setItem('yanmian-prototype-state-v1',JSON.stringify({records:[{mode:'专业面试',duration:60,startedAt:'2026-09-23T00:00:00Z'}],questions:[{owner:'我',title:'旧版题目',answer:'旧版答案'}]}));
  });
  await page.reload(); await page.waitForFunction(() => !!localStorage.getItem('yanmian-prototype-state-v2'));
  await page.locator('#adminDemoLogin').click();
  await expect(page.locator('#mainContent')).toContainText('旧版待认领数据');
  await expect(page.locator('#userTable')).toContainText('0 次');
  const preserved = await page.evaluate(() => JSON.parse(localStorage.getItem('yanmian-prototype-state-v1')).records.length);
  expect(preserved).toBe(1);
});