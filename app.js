// Project Hub — personal project tracker (static, no build step)
// Data lives in localStorage; optional cross-device sync through Supabase
// (same "sync code" pattern as flowcraft-studio: one shared code on every device).
(function () {
  'use strict';

  // ---------- Config ----------
  const STORE_KEY = 'project_hub_v1';
  const CODE_KEY = 'PROJECT_HUB_SYNC_CODE';
  const THEME_KEY = 'PROJECT_HUB_THEME';
  const SUPABASE_URL = 'https://djzzjezjlemvxzjiusly.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_axIbnWAf3nLWvTYjEyXI6A_omvOu1nT';
  const SYNC_TABLE = 'flowcraft_sync'; // shared table; rows are keyed "hub:<code>"
  const SEED_AT = '2026-09-27T00:00:00.000Z'; // seeds lose to any real edit when merging

  const STATUSES = [
    { key: 'todo', label: '할 일', color: 'var(--text-3)' },
    { key: 'doing', label: '진행 중', color: 'var(--info)' },
    { key: 'blocked', label: '막힘', color: 'var(--danger)' },
    { key: 'done', label: '완료', color: 'var(--ok)' }
  ];
  const PROJECT_STATUSES = [
    { key: 'live', label: '운영 중' },
    { key: 'dev', label: '개발 중' },
    { key: 'issue', label: '문제 있음' },
    { key: 'hold', label: '보류' }
  ];
  const PRIORITIES = [
    { key: 'high', label: '높음' },
    { key: 'mid', label: '보통' },
    { key: 'low', label: '낮음' }
  ];
  const COLORS = ['#818cf8', '#34d399', '#f59e0b', '#38bdf8', '#f472b6', '#a78bfa', '#94a3b8', '#f87171'];

  // ---------- Seed data (2026-09-27) ----------
  const P = (id, name, desc, status, deploy, url, repo, color, order) =>
    ({ id, name, desc, status, deploy, url, repo, color, order, updatedAt: SEED_AT });
  const C = (...items) => items.map((text, i) => ({ id: 'c' + i, text, done: false }));
  const T = (id, projectId, title, status, priority, due, note = '', checklist = []) =>
    ({ id, projectId, title, status, priority, due, note, checklist, createdAt: SEED_AT, updatedAt: SEED_AT });

  function seed() {
    return {
      projects: [
        P('p_flowcraft', 'flowcraft-studio', '개인 워크플로우·순서도 편집기', 'live', 'Vercel', 'https://flowcraft-studio-iota.vercel.app', 'https://github.com/april774936/flowcraft-studio', '#818cf8', 1),
        P('p_passmaster', 'passmaster', 'CFA L1(+투자자산운용사) 문제풀이', 'issue', 'Vercel', 'https://passmaster-cfa.vercel.app', 'https://github.com/april774936/passmaster', '#f59e0b', 2),
        P('p_leet', 'leet_master', 'LEET 기출문제 풀이', 'live', 'GitHub Pages', 'https://april774936.github.io/leet_master/', 'https://github.com/april774936/leet_master', '#34d399', 3),
        P('p_bokwatch', 'bokwatch', '한국은행 금리결정 확률모델', 'issue', 'GitHub Pages + Actions', 'https://april774936.github.io/bokwatch/', 'https://github.com/april774936/bokwatch', '#38bdf8', 4),
        P('p_reporthub', 'report-hub', '기관 리포트 수집·알림 대시보드', 'live', 'Vercel + 맥미니 크롤러', 'https://report-hub-pied.vercel.app', 'https://github.com/april774936/report-hub', '#f472b6', 5),
        P('p_common', '허브 공통', '계정·보안·에이전트 운영 등 공통 작업', 'dev', '', '', '', '#94a3b8', 6)
      ],
      tasks: [
        T('t_krx', 'p_bokwatch', 'KRX Open API 키 갱신 여부 + Actions 실행 로그 확인', 'todo', 'high', '2026-09-28', '9/25 무렵 만료 예정, 마지막 자동 동기화 커밋 9/24.',
          C('최근 Actions 실행 성공/실패 확인', '만료됐으면 KRX에서 키 재발급', 'GitHub Secrets 값 교체 후 수동 실행')),
        T('t_rate1022', 'p_bokwatch', '10/22 금통위 결과 RATE_STEPS 추가', 'todo', 'mid', '2026-10-23', '자동화 안 됨 — 수동 한 줄 추가.'),
        T('t_rate1126', 'p_bokwatch', '11/26 금통위 결과 RATE_STEPS 추가', 'todo', 'mid', '2026-11-27'),
        T('t_pm_supabase', 'p_passmaster', 'Supabase 저장 이관 완료 여부 + 배포본 저장 동작 확인', 'doing', 'high', '2026-09-30', 'passmaster_docs 테이블. 원래 window.claude.use("db") 의존이라 배포본 저장 불가였음.'),
        T('t_pm_stem', 'p_passmaster', '발문 획일화 되돌리기', 'todo', 'mid', '', 'HANDOFF.md §7'),
        T('t_pm_types', 'p_passmaster', '문항 유형 다양화', 'todo', 'mid', ''),
        T('t_pm_los', 'p_passmaster', '빈 LOS 132개 채우기', 'todo', 'low', ''),
        T('t_pm_invest', 'p_passmaster', '투자자산운용사 전용 프레임워크 설계', 'todo', 'low', ''),
        T('t_fc_rls', 'p_flowcraft', 'Supabase 보안 정책(RLS) 점검', 'todo', 'high', '2026-10-04', 'flowcraft_sync 테이블 (project-hub도 같은 테이블 사용).',
          C('Supabase 대시보드에서 flowcraft_sync RLS 켜짐 여부 확인', '익명 키로 전체 목록 조회가 막히는지 확인', 'leet_master · passmaster 테이블도 같은 방식으로 점검')),
        T('t_fc_cleanup', 'p_flowcraft', '미사용 ProjectModal.js 정리', 'todo', 'low', ''),
        T('t_leet_rls', 'p_leet', 'Supabase 보안 정책(RLS) 적용 여부 결정', 'todo', 'low', ''),
        T('t_rh_tailscale', 'p_reporthub', 'Tailscale Funnel 유지/해지 결정', 'todo', 'low', '', '서빙은 Vercel로 이전 완료. 맥 전용 기능(텔레그램 설정 등)용으로만 남아 있음.'),
        T('t_common_token', 'p_common', 'GitHub 토큰 교체 (fine-grained · 저장소 한정 · 만료일 지정)', 'todo', 'high', '2026-10-04'),
        T('t_common_ci', 'p_common', '나머지 4개 저장소에 CI 빌드 검사 추가', 'todo', 'mid', ''),
        T('t_common_jobs', 'p_common', '채용공고 스크리너 폴더 용도 결정', 'todo', 'low', ''),
        T('t_done_fc', 'p_flowcraft', '빌드 오류·툴바 먹통 수정, 동기화 병합, 노드 디자인 개편 (PR #1)', 'done', 'mid', '2026-09-27')
      ],
      tombstones: {}
    };
  }

  // ---------- State ----------
  let db = load();
  const ui = { view: 'overview', projectFilter: 'all', quickAdd: null };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY));
      if (raw && Array.isArray(raw.projects) && Array.isArray(raw.tasks)) {
        raw.tombstones = raw.tombstones || {};
        return raw;
      }
    } catch (e) { /* fall through to seed */ }
    return seed();
  }

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* storage full / blocked */ }
    Sync.schedule();
  }

  const now = () => new Date().toISOString();
  const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const projectById = (id) => db.projects.find((p) => p.id === id);

  function upsert(list, item) {
    item.updatedAt = now();
    const i = db[list].findIndex((x) => x.id === item.id);
    if (i >= 0) db[list][i] = item; else db[list].push(item);
    persist();
    render();
  }

  function remove(list, id) {
    db[list] = db[list].filter((x) => x.id !== id);
    db.tombstones[id] = now();
    if (list === 'projects') {
      db.tasks.filter((t) => t.projectId === id).forEach((t) => { db.tombstones[t.id] = now(); });
      db.tasks = db.tasks.filter((t) => t.projectId !== id);
    }
    persist();
    render();
  }

  // ---------- Helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
  const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#94a3b8');

  function today() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function parseDay(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function daysUntil(s) {
    const d = parseDay(s);
    return d ? Math.round((d - today()) / 86400000) : null;
  }
  // rel: always relative (used next to an explicit date in the schedule view)
  function dueLabel(s, rel = false) {
    const n = daysUntil(s);
    if (n === null) return '';
    if (rel && n > 1) return `D-${n}`;
    if (n === 0) return '오늘';
    if (n === 1) return '내일';
    if (n === -1) return '어제';
    if (n < 0) return `${-n}일 지남`;
    if (n < 7) return `D-${n}`;
    const d = parseDay(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  function dueClass(t) {
    if (t.status === 'done') return '';
    const n = daysUntil(t.due);
    if (n === null) return '';
    if (n < 0) return 'overdue';
    if (n <= 3) return 'soon';
    return '';
  }
  const prioRank = { high: 0, mid: 1, low: 2 };
  function taskSort(a, b) {
    const da = parseDay(a.due), dbb = parseDay(b.due);
    if (da && dbb && +da !== +dbb) return da - dbb;
    if (da && !dbb) return -1;
    if (!da && dbb) return 1;
    return (prioRank[a.priority] ?? 1) - (prioRank[b.priority] ?? 1);
  }
  const sortedProjects = () => [...db.projects].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, 2200);
  }

  // ---------- Render ----------
  function render() {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === ui.view));
    ['overview', 'board', 'schedule'].forEach((v) => { document.getElementById('view-' + v).hidden = v !== ui.view; });
    if (ui.view === 'overview') renderOverview();
    if (ui.view === 'board') renderBoard();
    if (ui.view === 'schedule') renderSchedule();
  }

  function renderOverview() {
    const open = db.tasks.filter((t) => t.status !== 'done');
    const overdue = open.filter((t) => (daysUntil(t.due) ?? 1) < 0);
    const week = open.filter((t) => { const n = daysUntil(t.due); return n !== null && n >= 0 && n <= 7; });
    const blocked = open.filter((t) => t.status === 'blocked');
    document.getElementById('stats').innerHTML = [
      ['열린 할 일', open.length, '', 'board'],
      ['기한 지남', overdue.length, overdue.length ? 'danger' : '', 'schedule'],
      ['7일 내 마감', week.length, week.length ? 'warn' : '', 'schedule'],
      ['막힘', blocked.length, blocked.length ? 'danger' : '', 'board']
    ].map(([label, v, cls, view]) =>
      `<button class="stat ${cls}" data-goto="${view}"><div class="stat-label">${label}</div><div class="stat-value">${v}</div></button>`
    ).join('');

    const grid = document.getElementById('project-grid');
    grid.innerHTML = sortedProjects().map((p) => {
      const tasks = db.tasks.filter((t) => t.projectId === p.id && t.status !== 'done').sort(taskSort);
      const st = PROJECT_STATUSES.find((s) => s.key === p.status) || PROJECT_STATUSES[1];
      const url = safeUrl(p.url), repo = safeUrl(p.repo);
      return `
        <article class="project-card" style="--pc:${safeColor(p.color)}">
          <div class="pc-head">
            ${url
              ? `<a class="pc-title pc-title-link" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(url)} 열기"><span class="pc-dot"></span><span class="pc-name">${esc(p.name)}</span><span class="ext" aria-hidden="true">↗</span></a>`
              : `<div class="pc-title"><span class="pc-dot"></span><span class="pc-name">${esc(p.name)}</span></div>`}
            <span class="pill s-${esc(p.status)}">${st.label}</span>
            <button class="pc-edit" data-edit-project="${esc(p.id)}" title="프로젝트 편집" aria-label="프로젝트 편집">✎</button>
          </div>
          ${p.desc ? `<div class="pc-desc">${esc(p.desc)}</div>` : ''}
          ${(p.deploy || repo) ? `<div class="pc-meta">
            ${p.deploy ? `<span>${esc(p.deploy)}</span>` : ''}
            ${repo ? `<a href="${esc(repo)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}
          </div>` : ''}
          <div class="pc-tasks">
            ${tasks.length ? tasks.slice(0, 4).map((t) => `
              <div class="pc-task" data-edit-task="${esc(t.id)}">
                <span class="dot p-${esc(t.priority)}"></span>
                <span class="t">${esc(t.title)}</span>
                ${(t.checklist || []).length ? `<span class="mini-progress">${t.checklist.filter((c) => c.done).length}/${t.checklist.length}</span>` : ''}
                ${t.due ? `<span class="due ${dueClass(t)}">${dueLabel(t.due)}</span>` : ''}
              </div>`).join('') : '<div class="pc-empty">열린 할 일 없음</div>'}
          </div>
          <div class="pc-foot">
            <span>열린 할 일 ${tasks.length}개${tasks.length > 4 ? ` · ${tasks.length - 4}개 더` : ''}</span>
            <button data-board-project="${esc(p.id)}">보드 →</button>
          </div>
        </article>`;
    }).join('');
  }

  function renderBoard() {
    const chips = [{ id: 'all', name: '전체', color: '' }, ...sortedProjects()];
    document.getElementById('filter-row').innerHTML = chips.map((p) =>
      `<button class="chip ${ui.projectFilter === p.id ? 'active' : ''}" data-filter="${esc(p.id)}" style="--cc:${p.color ? safeColor(p.color) : 'var(--text-3)'}">
        ${p.id !== 'all' ? '<span class="dot"></span>' : ''}${esc(p.name)}
      </button>`).join('');

    const visible = db.tasks.filter((t) => ui.projectFilter === 'all' || t.projectId === ui.projectFilter);
    document.getElementById('board').innerHTML = STATUSES.map((s) => {
      let items = visible.filter((t) => t.status === s.key);
      items = s.key === 'done'
        ? items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
        : items.sort(taskSort);
      const quick = ui.quickAdd === s.key
        ? `<input class="quick-input" data-quick="${s.key}" placeholder="할 일 입력 후 Enter (Esc 취소)" />`
        : `<button class="add-task" data-add="${s.key}">+ 추가</button>`;
      return `
        <div class="column" data-status="${s.key}">
          <div class="col-head"><span class="bar" style="--c:${s.color}"></span>${s.label}<span class="count">${items.length}</span></div>
          ${items.map(cardHtml).join('')}
          ${s.key !== 'done' ? quick : ''}
        </div>`;
    }).join('');
    const qi = document.querySelector('.quick-input');
    if (qi) qi.focus();
  }

  // "2/5" + thin bar for tasks that have a checklist
  function progressHtml(t) {
    const items = Array.isArray(t.checklist) ? t.checklist : [];
    if (!items.length) return '';
    const done = items.filter((c) => c.done).length;
    return `<div class="progress" title="체크리스트 ${done}/${items.length}">
      <span class="progress-bar"><span style="width:${Math.round((done / items.length) * 100)}%"></span></span>
      <span class="progress-text">${done}/${items.length}</span>
    </div>`;
  }

  function cardHtml(t) {
    const p = projectById(t.projectId);
    return `
      <div class="card ${t.status === 'done' ? 'done' : ''}" draggable="true" data-task="${esc(t.id)}" style="--pc:${p ? safeColor(p.color) : 'var(--border-strong)'}">
        <div class="card-title">${esc(t.title)}</div>
        ${t.note ? `<div class="card-note">${esc(t.note)}</div>` : ''}
        ${progressHtml(t)}
        <div class="card-meta">
          ${p ? `<span class="proj"><span class="dot"></span>${esc(p.name)}</span>` : ''}
          ${t.priority === 'high' ? '<span class="prio-high">높음</span>' : ''}
          ${t.due ? `<span class="due ${dueClass(t)}">${dueLabel(t.due)}</span>` : ''}
        </div>
      </div>`;
  }

  function renderSchedule() {
    const open = db.tasks.filter((t) => t.status !== 'done' && parseDay(t.due)).sort(taskSort);
    const groups = [
      ['기한 지남', 'overdue', (n) => n < 0],
      ['이번 주 (7일 내)', '', (n) => n >= 0 && n <= 7],
      ['30일 내', '', (n) => n > 7 && n <= 30],
      ['그 이후', '', (n) => n > 30]
    ];
    const noDate = db.tasks.filter((t) => t.status !== 'done' && !parseDay(t.due)).length;
    const wd = ['일', '월', '화', '수', '목', '금', '토'];
    const html = groups.map(([title, cls, test]) => {
      const items = open.filter((t) => test(daysUntil(t.due)));
      if (!items.length) return '';
      return `
        <div class="sch-group ${cls}">
          <h3>${title}<span class="count">${items.length}</span></h3>
          <div class="sch-list">
            ${items.map((t) => {
              const d = parseDay(t.due);
              const p = projectById(t.projectId);
              const st = STATUSES.find((s) => s.key === t.status);
              return `
                <div class="sch-item" data-edit-task="${esc(t.id)}" style="--pc:${p ? safeColor(p.color) : 'var(--text-2)'}">
                  <div class="sch-date">${d.getMonth() + 1}/${d.getDate()} (${wd[d.getDay()]})<small class="due ${dueClass(t)}">${dueLabel(t.due, true)}</small></div>
                  <div>
                    <div class="sch-title">${esc(t.title)}</div>
                    <div class="sch-sub">${p ? `<span class="proj"><span class="dot"></span>${esc(p.name)}</span>` : ''}${t.priority === 'high' ? '<span class="prio-high">높음</span>' : ''}</div>
                  </div>
                  <span class="status-tag">${st ? st.label : ''}</span>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');
    document.getElementById('schedule').innerHTML =
      (html || '<div class="empty">마감일이 정해진 열린 할 일이 없습니다.</div>') +
      (noDate ? `<div class="pc-empty">마감일 없는 할 일 ${noDate}개는 보드에서 확인하세요.</div>` : '');
  }

  // ---------- Modals ----------
  const modal = document.getElementById('modal');

  function openTaskModal(task, defaults = {}) {
    const isNew = !task;
    const t = task ? { ...task } : {
      id: uid('t'), title: '', note: '', status: defaults.status || 'todo', priority: 'mid', due: '',
      projectId: defaults.projectId || (ui.projectFilter !== 'all' ? ui.projectFilter : (sortedProjects()[0] || {}).id),
      createdAt: now()
    };
    modal.innerHTML = `
      <form method="dialog">
        <h3>${isNew ? '할 일 추가' : '할 일 편집'}</h3>
        <div class="field"><label for="f-title">제목</label><input id="f-title" required maxlength="200" value="${esc(t.title)}" /></div>
        <div class="row">
          <div class="field"><label for="f-project">프로젝트</label><select id="f-project">
            ${sortedProjects().map((p) => `<option value="${esc(p.id)}" ${p.id === t.projectId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
          </select></div>
          <div class="field"><label for="f-status">상태</label><select id="f-status">
            ${STATUSES.map((s) => `<option value="${s.key}" ${s.key === t.status ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select></div>
        </div>
        <div class="row">
          <div class="field"><label for="f-priority">우선순위</label><select id="f-priority">
            ${PRIORITIES.map((s) => `<option value="${s.key}" ${s.key === t.priority ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select></div>
          <div class="field"><label for="f-due">마감일</label><input id="f-due" type="date" value="${esc(t.due)}" /></div>
        </div>
        <div class="field"><label for="f-note">메모</label><textarea id="f-note" maxlength="2000">${esc(t.note)}</textarea></div>
        <div class="field">
          <label>체크리스트 <span class="cl-count" id="cl-count"></span></label>
          <div class="checklist" id="checklist"></div>
          <input class="cl-new" id="cl-new" maxlength="200" placeholder="항목 추가 후 Enter" />
        </div>
        <div class="modal-actions">
          ${isNew ? '' : '<button type="button" class="btn danger" data-act="delete">삭제</button>'}
          <span class="spacer"></span>
          <button type="button" class="btn ghost" data-act="cancel">취소</button>
          <button type="submit" class="btn primary">저장</button>
        </div>
      </form>`;
    modal.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const title = modal.querySelector('#f-title').value.trim();
      if (!title) return;
      const pending = modal.querySelector('#cl-new').value.trim();
      if (pending) checklist.push({ id: uid('c'), text: pending, done: false });
      upsert('tasks', {
        ...t, title,
        projectId: modal.querySelector('#f-project').value,
        status: modal.querySelector('#f-status').value,
        priority: modal.querySelector('#f-priority').value,
        due: modal.querySelector('#f-due').value,
        note: modal.querySelector('#f-note').value.trim(),
        checklist: checklist.filter((c) => c.text.trim())
      });
      modal.close();
    };
    bindModalButtons(() => { if (confirm('이 할 일을 삭제할까요?')) { remove('tasks', t.id); modal.close(); } });

    // Checklist editor (applied on 저장, discarded on 취소)
    const checklist = (Array.isArray(t.checklist) ? t.checklist : []).map((c) => ({ ...c }));
    const listEl = modal.querySelector('#checklist');
    const renderChecklist = () => {
      const done = checklist.filter((c) => c.done).length;
      modal.querySelector('#cl-count').textContent = checklist.length ? `${done}/${checklist.length}` : '';
      listEl.innerHTML = checklist.map((c, i) => `
        <div class="cl-item ${c.done ? 'done' : ''}">
          <input type="checkbox" data-cl-toggle="${i}" ${c.done ? 'checked' : ''} aria-label="완료" />
          <input class="cl-text" data-cl-text="${i}" value="${esc(c.text)}" maxlength="200" />
          <button type="button" class="cl-del" data-cl-del="${i}" title="삭제">×</button>
        </div>`).join('');
    };
    listEl.addEventListener('change', (e) => {
      const i = e.target.dataset.clToggle;
      if (i !== undefined) { checklist[i].done = e.target.checked; renderChecklist(); }
    });
    listEl.addEventListener('input', (e) => {
      const i = e.target.dataset.clText;
      if (i !== undefined) checklist[i].text = e.target.value;
    });
    listEl.addEventListener('click', (e) => {
      const i = e.target.dataset.clDel;
      if (i !== undefined) { checklist.splice(Number(i), 1); renderChecklist(); }
    });
    listEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing && e.target.dataset.clText !== undefined) {
        e.preventDefault();
        modal.querySelector('#cl-new').focus();
      }
    });
    modal.querySelector('#cl-new').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      const text = e.target.value.trim();
      if (!text) return;
      checklist.push({ id: uid('c'), text, done: false });
      e.target.value = '';
      renderChecklist();
    });
    renderChecklist();
    modal.showModal();
    modal.querySelector('#f-title').focus();
  }

  function openProjectModal(project) {
    const isNew = !project;
    const p = project ? { ...project } : {
      id: uid('p'), name: '', desc: '', status: 'dev', deploy: '', url: '', repo: '',
      color: COLORS[db.projects.length % COLORS.length], order: db.projects.length + 1
    };
    modal.innerHTML = `
      <form method="dialog">
        <h3>${isNew ? '프로젝트 추가' : '프로젝트 편집'}</h3>
        <div class="field"><label for="f-name">이름</label><input id="f-name" required maxlength="80" value="${esc(p.name)}" /></div>
        <div class="field"><label for="f-desc">설명</label><input id="f-desc" maxlength="160" value="${esc(p.desc)}" /></div>
        <div class="row">
          <div class="field"><label for="f-pstatus">상태</label><select id="f-pstatus">
            ${PROJECT_STATUSES.map((s) => `<option value="${s.key}" ${s.key === p.status ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select></div>
          <div class="field"><label for="f-deploy">배포 방식</label><input id="f-deploy" maxlength="60" value="${esc(p.deploy)}" placeholder="예: Vercel" /></div>
        </div>
        <div class="field"><label for="f-url">사이트 URL</label><input id="f-url" type="url" value="${esc(p.url)}" placeholder="https://" /></div>
        <div class="field"><label for="f-repo">GitHub URL</label><input id="f-repo" type="url" value="${esc(p.repo)}" placeholder="https://github.com/..." /></div>
        <div class="field"><label>색상</label><div class="swatches">
          ${COLORS.map((c) => `<button type="button" class="swatch ${c === p.color ? 'on' : ''}" data-color="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}
        </div></div>
        <div class="modal-actions">
          ${isNew ? '' : '<button type="button" class="btn danger" data-act="delete">삭제</button>'}
          <span class="spacer"></span>
          <button type="button" class="btn ghost" data-act="cancel">취소</button>
          <button type="submit" class="btn primary">저장</button>
        </div>
      </form>`;
    let color = p.color;
    modal.querySelectorAll('.swatch').forEach((b) => b.addEventListener('click', () => {
      color = b.dataset.color;
      modal.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === b));
    }));
    modal.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const name = modal.querySelector('#f-name').value.trim();
      if (!name) return;
      upsert('projects', {
        ...p, name, color,
        desc: modal.querySelector('#f-desc').value.trim(),
        status: modal.querySelector('#f-pstatus').value,
        deploy: modal.querySelector('#f-deploy').value.trim(),
        url: modal.querySelector('#f-url').value.trim(),
        repo: modal.querySelector('#f-repo').value.trim()
      });
      modal.close();
    };
    bindModalButtons(() => {
      const n = db.tasks.filter((t) => t.projectId === p.id).length;
      if (confirm(`'${p.name}' 프로젝트${n ? `와 할 일 ${n}개` : ''}를 삭제할까요?`)) { remove('projects', p.id); modal.close(); }
    });
    modal.showModal();
    modal.querySelector('#f-name').focus();
  }

  function bindModalButtons(onDelete) {
    modal.querySelector('[data-act="cancel"]').onclick = () => modal.close();
    const del = modal.querySelector('[data-act="delete"]');
    if (del) del.onclick = onDelete;
  }

  // ---------- Events ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-view],[data-goto],[data-edit-task],[data-edit-project],[data-board-project],[data-filter],[data-add],[data-task]');
    if (!el) return;
    if (el.dataset.view) { ui.view = el.dataset.view; render(); return; }
    if (el.dataset.goto) { ui.view = el.dataset.goto; render(); return; }
    if (el.dataset.editProject) { openProjectModal(projectById(el.dataset.editProject)); return; }
    if (el.dataset.editTask) { openTaskModal(db.tasks.find((t) => t.id === el.dataset.editTask)); return; }
    if (el.dataset.boardProject) { ui.projectFilter = el.dataset.boardProject; ui.view = 'board'; render(); return; }
    if (el.dataset.filter) { ui.projectFilter = el.dataset.filter; render(); return; }
    if (el.dataset.add) { ui.quickAdd = el.dataset.add; render(); return; }
    if (el.dataset.task) { openTaskModal(db.tasks.find((t) => t.id === el.dataset.task)); }
  });

  document.getElementById('add-project').addEventListener('click', () => openProjectModal(null));

  // Quick add: Enter saves, Esc cancels. Project = current filter, else asks via modal.
  document.addEventListener('keydown', (e) => {
    const qi = e.target.closest && e.target.closest('.quick-input');
    if (!qi) return;
    if (e.key === 'Escape') { ui.quickAdd = null; render(); return; }
    if (e.key !== 'Enter' || e.isComposing) return;
    const title = qi.value.trim();
    const status = qi.dataset.quick;
    ui.quickAdd = null;
    if (!title) { render(); return; }
    if (ui.projectFilter === 'all') {
      render();
      openTaskModal(null, { status });
      modal.querySelector('#f-title').value = title;
      return;
    }
    upsert('tasks', {
      id: uid('t'), projectId: ui.projectFilter, title, note: '', status,
      priority: 'mid', due: '', createdAt: now()
    });
  });
  document.addEventListener('focusout', (e) => {
    if (e.target.classList && e.target.classList.contains('quick-input') && !e.target.value.trim()) {
      setTimeout(() => { if (ui.quickAdd) { ui.quickAdd = null; render(); } }, 120);
    }
  });

  // Drag & drop between columns
  let dragId = null;
  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if (!card) return;
    dragId = card.dataset.task;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  document.addEventListener('dragend', () => {
    dragId = null;
    document.querySelectorAll('.dragging,.drop').forEach((el) => el.classList.remove('dragging', 'drop'));
  });
  document.addEventListener('dragover', (e) => {
    const col = e.target.closest && e.target.closest('.column');
    if (!col || !dragId) return;
    e.preventDefault();
    document.querySelectorAll('.column.drop').forEach((c) => c !== col && c.classList.remove('drop'));
    col.classList.add('drop');
  });
  document.addEventListener('drop', (e) => {
    const col = e.target.closest && e.target.closest('.column');
    if (!col || !dragId) return;
    e.preventDefault();
    const t = db.tasks.find((x) => x.id === dragId);
    if (t && t.status !== col.dataset.status) upsert('tasks', { ...t, status: col.dataset.status });
  });

  // Touch: HTML5 drag & drop doesn't fire on phones, so long-press a card (~0.35s) to pick it up,
  // drag it over a column (the page auto-scrolls near the edges) and lift to drop
  let touchDrag = null;
  document.addEventListener('touchstart', (e) => {
    const card = e.target.closest && e.target.closest('#board .card');
    if (!card || e.touches.length !== 1) return;
    const t0 = e.touches[0];
    const st = { card, id: card.dataset.task, x: t0.clientX, y: t0.clientY, active: false, ghost: null, col: null, raf: 0, vy: 0 };
    st.timer = setTimeout(() => {
      st.active = true;
      const r = card.getBoundingClientRect();
      st.dx = st.x - r.left; st.dy = st.y - r.top;
      st.ghost = card.cloneNode(true);
      Object.assign(st.ghost.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', zIndex: 60, pointerEvents: 'none', opacity: '0.92', transform: 'rotate(1.5deg) scale(1.02)', boxShadow: 'var(--shadow)' });
      document.body.appendChild(st.ghost);
      card.classList.add('dragging');
      if (navigator.vibrate) navigator.vibrate(12);
      const tick = () => { if (st.vy) window.scrollBy(0, st.vy); st.raf = requestAnimationFrame(tick); };
      st.raf = requestAnimationFrame(tick);
    }, 350);
    touchDrag = st;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    const st = touchDrag;
    if (!st) return;
    const t0 = e.touches[0];
    if (!st.active) {
      if (Math.hypot(t0.clientX - st.x, t0.clientY - st.y) > 8) { clearTimeout(st.timer); touchDrag = null; } // it's a scroll
      return;
    }
    e.preventDefault();
    st.x = t0.clientX; st.y = t0.clientY;
    st.ghost.style.left = st.x - st.dx + 'px';
    st.ghost.style.top = st.y - st.dy + 'px';
    const edge = 70;
    st.vy = st.y < edge ? -12 : st.y > window.innerHeight - edge ? 12 : 0;
    const under = document.elementFromPoint(st.x, st.y);
    const col = under && under.closest('.column');
    if (col !== st.col) {
      st.col && st.col.classList.remove('drop');
      col && col.classList.add('drop');
      st.col = col;
    }
  }, { passive: false });
  const endTouchDrag = (e) => {
    const st = touchDrag;
    if (!st) return;
    clearTimeout(st.timer);
    touchDrag = null;
    if (!st.active) return;
    e.preventDefault(); // no click → no edit modal after a drag
    cancelAnimationFrame(st.raf);
    st.ghost.remove();
    st.card.classList.remove('dragging');
    document.querySelectorAll('.column.drop').forEach((c) => c.classList.remove('drop'));
    const t = db.tasks.find((x) => x.id === st.id);
    if (st.col && t && t.status !== st.col.dataset.status) upsert('tasks', { ...t, status: st.col.dataset.status });
  };
  document.addEventListener('touchend', endTouchDrag, { passive: false });
  document.addEventListener('touchcancel', endTouchDrag, { passive: false });

  // Menu
  const menuPop = document.getElementById('menu-pop');
  document.getElementById('menu-btn').addEventListener('click', (e) => { e.stopPropagation(); menuPop.hidden = !menuPop.hidden; });
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) menuPop.hidden = true; });
  menuPop.addEventListener('click', (e) => {
    const act = e.target.dataset.action;
    menuPop.hidden = true;
    if (act === 'theme') toggleTheme();
    if (act === 'export') exportJson();
    if (act === 'import') document.getElementById('import-file').click();
    if (act === 'sync') Sync.prompt();
  });

  function exportJson() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `project-hub-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.projects) || !Array.isArray(data.tasks)) throw new Error('형식 오류');
      if (!confirm('현재 데이터를 백업 파일 내용으로 바꿀까요?')) return;
      db = { projects: data.projects, tasks: data.tasks, tombstones: data.tombstones || {} };
      const t = now();
      db.projects.forEach((p) => { p.updatedAt = t; });
      db.tasks.forEach((x) => { x.updatedAt = t; });
      persist();
      render();
      toast('백업을 불러왔습니다');
    } catch (err) {
      alert('불러오기 실패: ' + err.message);
    }
  });

  function applyTheme(theme) {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }
  function toggleTheme() {
    const cur = document.documentElement.dataset.theme ||
      (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next = cur === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
  }
  try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (e) { /* ignore */ }

  // ---------- Sync (per-item merge, newer updatedAt wins, deletes via tombstones) ----------
  const Sync = (function () {
    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
    const badge = document.getElementById('sync-badge');
    let timer = null, inFlight = null, dirty = false;

    const code = () => { try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; } };
    const rowId = () => 'hub:' + code();
    const ts = (s) => Date.parse(s) || 0;

    function setBadge(state) {
      const map = {
        off: ['동기화 꺼짐', ''], pending: ['저장 대기…', ''], syncing: ['동기화 중…', ''],
        ok: ['동기화됨', 'ok'], err: ['동기화 오류', 'err'], remote: ['다른 기기 변경 · 불러오기', 'remote']
      };
      const [text, cls] = map[state] || map.off;
      badge.textContent = text;
      badge.className = 'sync-badge ' + cls;
      badge.dataset.state = state;
    }

    function merge(a, b) {
      const tomb = { ...(b.tombstones || {}) };
      Object.entries(a.tombstones || {}).forEach(([id, t]) => { if (!tomb[id] || ts(t) > ts(tomb[id])) tomb[id] = t; });
      const mergeList = (la = [], lb = []) => {
        const map = new Map();
        [...la, ...lb].forEach((x) => {
          if (!x || !x.id) return;
          const cur = map.get(x.id);
          if (!cur || ts(x.updatedAt) > ts(cur.updatedAt)) map.set(x.id, x);
        });
        return [...map.values()].filter((x) => !(tomb[x.id] && ts(tomb[x.id]) >= ts(x.updatedAt)));
      };
      return { projects: mergeList(a.projects, b.projects), tasks: mergeList(a.tasks, b.tasks), tombstones: tomb };
    }
    const sig = (d) => JSON.stringify([
      [...d.projects].sort((x, y) => x.id.localeCompare(y.id)),
      [...d.tasks].sort((x, y) => x.id.localeCompare(y.id))
    ]);

    async function pull() {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${SYNC_TABLE}?id=eq.${encodeURIComponent(rowId())}&select=data,updated_at`, { headers, cache: 'no-store' });
      if (!r.ok) throw new Error('pull ' + r.status);
      const rows = await r.json();
      return rows[0] || null;
    }
    async function write(data, prev) {
      const updated_at = now();
      if (prev) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${SYNC_TABLE}?id=eq.${encodeURIComponent(rowId())}&updated_at=eq.${encodeURIComponent(prev)}`, {
          method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify({ data, updated_at })
        });
        if (!r.ok) throw new Error('push ' + r.status);
        return (await r.json()).length > 0;
      }
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${SYNC_TABLE}`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ id: rowId(), data, updated_at })
      });
      if (r.status === 409) return false;
      if (!r.ok) throw new Error('push ' + r.status);
      return true;
    }
    const remoteOf = (row) => {
      try { return row && row.data && row.data.hub ? JSON.parse(row.data.hub) : { projects: [], tasks: [], tombstones: {} }; }
      catch (e) { return { projects: [], tasks: [], tombstones: {} }; }
    };

    // Pull → merge → write back if the server is behind (retry on concurrent write)
    async function syncOnce() {
      for (let i = 0; i < 3; i++) {
        const row = await pull();
        const remote = remoteOf(row);
        const merged = merge(db, remote);
        if (sig(merged) !== sig(db)) { db = merged; try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } render(); }
        if (row && sig(merged) === sig(remote)) return;
        if (await write({ hub: JSON.stringify(merged) }, row && row.updated_at)) return;
      }
      throw new Error('conflict');
    }

    async function run() {
      clearTimeout(timer);
      if (!code()) { setBadge('off'); return; }
      if (inFlight) { await inFlight; if (!dirty) return; }
      dirty = false;
      setBadge('syncing');
      inFlight = syncOnce()
        .then(() => setBadge(dirty ? 'pending' : 'ok'))
        .catch((err) => { dirty = true; console.warn('[hub sync]', err); setBadge('err'); })
        .finally(() => { inFlight = null; });
      return inFlight;
    }

    function schedule() {
      if (!code()) return;
      dirty = true;
      setBadge('pending');
      clearTimeout(timer);
      timer = setTimeout(run, 1500);
    }

    async function check() {
      if (!code() || dirty || inFlight) return;
      try {
        const merged = merge(db, remoteOf(await pull()));
        if (sig(merged) !== sig(db)) setBadge('remote');
      } catch (e) { /* offline */ }
    }

    function prompt() {
      const input = window.prompt(
        '기기 간 동기화 코드를 입력하세요.\n모든 기기(PC/폰)에 같은 코드를 넣으면 할 일이 동기화됩니다.\n다른 사람이 추측하기 어려운 문자열로 정하세요. (빈칸 = 동기화 끄기)',
        code()
      );
      if (input === null) return;
      try {
        if (input.trim()) localStorage.setItem(CODE_KEY, input.trim());
        else localStorage.removeItem(CODE_KEY);
      } catch (e) { /* ignore */ }
      dirty = true;
      run();
    }

    badge.addEventListener('click', () => {
      if (badge.dataset.state === 'remote' || badge.dataset.state === 'err') { dirty = true; run(); }
      else if (!code()) prompt();
      else { dirty = true; run(); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { if (dirty) run(); } else check();
    });

    return { schedule, run: () => { dirty = true; return run(); }, prompt, init: () => { if (code()) { dirty = true; run(); } else setBadge('off'); } };
  })();

  // Re-evaluate due labels after midnight
  setInterval(() => { if (!modal.open) render(); }, 60 * 60 * 1000);

  render();
  Sync.init();
})();
