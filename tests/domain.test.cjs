const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../domain.js');
const user = { id:'alice' };
const config = { mode:'专业面试', source:'mixed', major:'电子信息工程', timerMode:'whole', duration:60 };
function store() { return D.createStore([user]); }
test('专业题按明确专业匹配，缺题报错；英语不受专业限制', () => {
  const s = store();
  assert.ok(D.eligibleQuestions(s,user,config).every(q => q.majors.includes('电子信息工程')));
  assert.throws(() => D.createSession(s,user,{...config,major:'不存在的专业'}), /没有/);
  assert.throws(() => D.createSession(s,user,{...config,major:''}), /本科专业/);
  assert.equal(D.eligibleQuestions(s,user,{...config,mode:'英语面试',major:'其他专业'}).length,2);
});
test('公共、私有、混合来源不泄露另一用户私有或待审核题', () => {
  const s = store(); const base = s.questions[0];
  s.questions.push({...base,id:'own-private',ownerId:'alice',visibility:'私有',status:'private'});
  s.questions.push({...base,id:'own-pending',ownerId:'alice',visibility:'待审核',status:'pending'});
  s.questions.push({...base,id:'other-private',ownerId:'bob',visibility:'私有',status:'private'});
  s.questions.push({...base,id:'other-pending',ownerId:'bob',visibility:'待审核',status:'pending'});
  const c = {...config,major:'计算机科学与技术'};
  assert.deepEqual(D.eligibleQuestions(s,user,{...c,source:'private'}).map(q => q.id),['own-private']);
  assert.ok(!D.eligibleQuestions(s,user,{...c,source:'public'}).some(q => q.id.includes('pending')));
  const mixed = D.eligibleQuestions(s,user,c).map(q => q.id);
  assert.ok(mixed.includes('own-pending')); assert.ok(!mixed.some(id => id.startsWith('other-')));
});
test('用户统计只计算本人数据，结束时间与有效时长独立保存', () => {
  const s = store(); const run = D.createSession(s,user,config,1000,() => 0);
  D.tick(run,6000); D.togglePause(run,6000); D.tick(run,16000); D.togglePause(run,16000);
  s.records.push(D.finish(run,18000)); s.records.push({...s.records[0],userId:'bob',duration:900});
  const stats = D.stats(s,'alice'); assert.equal(stats.count,1); assert.equal(stats.duration,7);
  assert.equal(stats.records[0].endedAt, new Date(18000).toISOString());
});
test('整场换题继续计时，题号递增且不重复', () => {
  const s = store(); const run = D.createSession(s,user,config,0,() => 0); const id = run.question.id;
  D.answer(run,10000); D.nextQuestion(s,user,run,15000,() => 0);
  assert.equal(run.remainingMs,45000); assert.notEqual(run.question.id,id); assert.equal(run.visitedIds.length,2);
  assert.throws(() => D.nextQuestion(s,user,run,16000),/已抽完/);
});
test('单题答案阅读不计时，下一题恢复完整时长', () => {
  const s = store(); const run = D.createSession(s,user,{...config,timerMode:'single'},0,() => 0);
  D.answer(run,10000); D.tick(run,40000); assert.equal(run.elapsedMs,10000);
  D.nextQuestion(s,user,run,50000,() => 0); assert.equal(run.remainingMs,60000);
  assert.equal(run.answered,false); assert.equal(run.answeredIds.length,1);
});
test('刷新后按时间差恢复；到期不会提前泄露答案，整场到期禁止换题', () => {
  const s = store(); const run = JSON.parse(JSON.stringify(D.createSession(s,user,config,0,() => 0)));
  D.tick(run,90000); assert.equal(run.remainingMs,0); assert.equal(run.elapsedMs,60000); assert.equal(run.answered,false);
  assert.throws(() => D.nextQuestion(s,user,run,90000), /倒计时已结束/);
});
test('重置计时不清空已累计时长，暂停时间不计入', () => {
  const run = D.createSession(store(),user,config,0,() => 0);
  D.togglePause(run,10000); D.resetTimer(run,20000);
  assert.equal(run.elapsedMs,10000); assert.equal(run.remainingMs,60000); assert.equal(run.paused,false);
});
test('旧版无归属数据保留但不猜测用户，迁移不制造虚假统计', () => {
  const old = { records:[{duration:200}], questions:[{owner:'我',title:'旧题'}] };
  const s = D.migrateLegacy(old,[user]);
  assert.equal(s.records.length,0); assert.equal(D.stats(s,'alice').count,0);
  assert.equal(s.legacyUnassigned.records.length,1); assert.equal(s.legacyUnassigned.questions[0].title,'旧题');
});