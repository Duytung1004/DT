/**
 * Standalone API use-case test runner for the Tam Thanh task progress system.
 *
 * Run:
 *   node testcases.usecase.js
 *
 * Safety notes:
 * - Uses HTTP fetch only; does not import backend services/controllers.
 * - Creates test data with AUTO_TEST prefix.
 * - Does not call DELETE by default. Created IDs are printed for manual cleanup.
 */

const CONFIG = {
  baseUrl: "http://localhost:3000/api",
  accounts: {
    admin: { username: "ruytugg", password: "Duytung1004" },
    vanThu: { username: "vanthu", password: "123456" },
    chanhVanPhong: { username: "user01", password: "123456" },
    lanhDao: { username: "duytung1401", password: "123456" },
    truongPhong: { username: "truongban", password: "123456" },
    nhanVien: { username: "admin", password: "123456" },
  },
};

const TEST_PREFIX = "AUTO_TEST";
const REPORT_MONTH = "2026-06";

class SkipTest extends Error {
  constructor(message) {
    super(message);
    this.name = "SkipTest";
  }
}

const ctx = {
  tokens: {},
  users: {},
  refs: {},
  currentApis: [],
  created: {
    documents: [],
    tasks: [],
    subtasks: [],
    reports: [],
  },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function skip(message) {
  throw new SkipTest(message);
}

function expectStatus(res, statuses) {
  assert(
    statuses.includes(res.status),
    `Expected status ${statuses.join("/")} but got ${res.status}. Body: ${res.text || res.error || "<empty>"}`
  );
}

function expect2xx(res) {
  assert(res.status >= 200 && res.status < 300, `Expected 2xx but got ${res.status}. Body: ${res.text || res.error || "<empty>"}`);
}

function responseMessage(res) {
  return String(res.json?.message || res.json?.error || res.text || "");
}

function compact(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 240 ? `${text.slice(0, 240)}...` : text;
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["data", "items", "rows", "users", "roles", "units", "tasks", "documents", "notifications", "conversations", "reports"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function extractId(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const id = extractId(item);
      if (id) return id;
    }
    return null;
  }
  if (typeof payload !== "object") return null;
  for (const key of ["id", "task_id", "document_id", "subtask_id", "conversation_id", "report_id"]) {
    if (payload[key]) return payload[key];
  }
  for (const key of ["data", "result", "document", "task", "subtask", "report", "created", "createdTask", "createdTasks"]) {
    const id = extractId(payload[key]);
    if (id) return id;
  }
  return null;
}

function userId(roleKey) {
  return ctx.users[roleKey]?.userId || ctx.users[roleKey]?.id || null;
}

function unitId(roleKey) {
  return ctx.users[roleKey]?.unit_id || ctx.users[roleKey]?.unitId || null;
}

async function api(method, path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const init = { method, headers };
  if (options.body !== undefined) {
    if (typeof FormData !== "undefined" && options.body instanceof FormData) {
      init.body = options.body;
    } else {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
  }

  ctx.currentApis.push(`${method} ${path}`);

  try {
    const response = await fetch(`${CONFIG.baseUrl}${path}`, init);
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_) {
      json = null;
    }
    return { status: response.status, ok: response.ok, text, json };
  } catch (error) {
    return { status: 0, ok: false, text: "", json: null, error: error.message };
  }
}

async function login(roleKey) {
  if (ctx.tokens[roleKey]) return ctx.tokens[roleKey];
  const account = CONFIG.accounts[roleKey];
  assert(account, `Chua cau hinh tai khoan cho roleKey=${roleKey}`);

  const res = await api("POST", "/auth/login", {
    body: { username: account.username, password: account.password },
  });
  expectStatus(res, [200]);
  assert(res.json?.token, `Dang nhap ${roleKey} khong tra ve JWT token`);
  ctx.tokens[roleKey] = res.json.token;
  ctx.users[roleKey] = res.json.user || {};
  return ctx.tokens[roleKey];
}

async function getMe(roleKey) {
  await login(roleKey);
  const res = await api("GET", "/auth/me", { token: ctx.tokens[roleKey] });
  expectStatus(res, [200]);
  ctx.users[roleKey] = { ...ctx.users[roleKey], ...(res.json || {}) };
  return ctx.users[roleKey];
}

function documentPayload(suffix) {
  return {
    so_ky_hieu: `${TEST_PREFIX}_DOC_${suffix}`,
    tieu_de: `${TEST_PREFIX} - Ke hoach kiem tra cong tac thang 6 ${suffix}`,
    trich_yeu: "Du lieu kiem thu tu dong, co the xoa sau khi test",
    ngay_ban_hanh: "2026-06-01",
    ngay_nhan: "2026-06-02",
    don_vi_ban_hanh: "Dang uy phuong Tam Thanh",
    nguoi_ky: "AUTO_TEST_USER",
    muc_do_uu_tien: "binh_thuong",
    muc_do_bao_mat: "noi_bo",
    cap_ban_hanh: "noi_bo",
  };
}

function taskPayload(suffix, extra = {}) {
  return {
    tieu_de: `${TEST_PREFIX} - Nhiem vu kiem thu quy trinh ${suffix}`,
    mo_ta: "Nhiem vu duoc tao boi file test tu dong",
    han_chot: "2026-06-30",
    muc_do: "cao",
    muc_do_uu_tien: "cao",
    chu_ky_bao_cao: "thang",
    ...extra,
  };
}

function track(kind, id) {
  if (id) ctx.created[kind].push(id);
  return id;
}

async function createDocumentForTest(suffix) {
  await login("vanThu");
  const res = await api("POST", "/documents", {
    token: ctx.tokens.vanThu,
    body: documentPayload(suffix),
  });
  expect2xx(res);
  const id = extractId(res.json);
  assert(id, `API tao van ban khong tra ve id. Body: ${res.text}`);
  return track("documents", id);
}

async function createDirectTaskForTest(suffix) {
  await getMe("lanhDao");
  await getMe("truongPhong");
  const targetUnitId = unitId("truongPhong") || unitId("lanhDao");
  assert(targetUnitId, "Khong xac dinh duoc unit_id de tao task");
  const res = await api("POST", "/tasks", {
    token: ctx.tokens.lanhDao,
    body: taskPayload(suffix, { unit_id: targetUnitId }),
  });
  expect2xx(res);
  const id = extractId(res.json);
  assert(id, `API tao task khong tra ve id. Body: ${res.text}`);
  return track("tasks", id);
}

async function createSubtaskForTask(taskId, suffix) {
  await getMe("truongPhong");
  await getMe("nhanVien");
  const assignee = userId("nhanVien");
  assert(assignee, "Khong xac dinh duoc user id cua nhanVien");
  const res = await api("POST", `/tasks/${taskId}/subtask`, {
    token: ctx.tokens.truongPhong,
    body: {
      tieu_de: `${TEST_PREFIX} - Phan viec ${suffix}`,
      mo_ta: `${TEST_PREFIX} - Phan viec tao rieng cho ${suffix}`,
      assignee_user_id: assignee,
      han_chot: "2026-06-20",
    },
  });
  expect2xx(res);
  const id = extractId(res.json);
  assert(id, `API tao subtask khong tra ve id. Body: ${res.text}`);
  return track("subtasks", id);
}

async function startSubtask(taskId, subtaskId) {
  await login("nhanVien");
  const res = await api("PUT", `/tasks/${taskId}/subtasks/${subtaskId}/start`, {
    token: ctx.tokens.nhanVien,
  });
  expect2xx(res);
  return res;
}

async function submitSubtask(taskId, subtaskId) {
  await login("nhanVien");
  const body = new FormData();
  body.append("noi_dung_nop", `${TEST_PREFIX} - Ket qua thuc hien phan viec`);
  const res = await api("POST", `/tasks/${taskId}/subtasks/${subtaskId}/submit`, {
    token: ctx.tokens.nhanVien,
    body,
  });
  expect2xx(res);
  return res;
}

async function approveSubtask(taskId, subtaskId, decision = "chap_thuan") {
  await login("truongPhong");
  const res = await api("PUT", `/tasks/${taskId}/subtasks/${subtaskId}/approve`, {
    token: ctx.tokens.truongPhong,
    body: {
      decision,
      quyet_dinh: decision,
      ghi_chu: `${TEST_PREFIX} - Truong phong ${decision === "chap_thuan" ? "duyet" : "yeu cau chinh sua"} phan viec`,
    },
  });
  expect2xx(res);
  return res;
}

async function prepareTaskReadyForLeader(suffix) {
  const taskId = await createDirectTaskForTest(`READY_${suffix}`);
  const subtaskId = await createSubtaskForTask(taskId, `READY_${suffix}`);
  await startSubtask(taskId, subtaskId);
  await submitSubtask(taskId, subtaskId);
  await approveSubtask(taskId, subtaskId, "chap_thuan");

  await login("truongPhong");
  const sendRes = await api("PUT", `/tasks/${taskId}/send-to-leader`, {
    token: ctx.tokens.truongPhong,
  });
  if (!(sendRes.status >= 200 && sendRes.status < 300)) {
    const subtasksRes = await api("GET", `/tasks/${taskId}/subtasks`, {
      token: ctx.tokens.truongPhong,
    });
    const subtasks = extractList(subtasksRes.json);
    const unfinished = subtasks.filter((item) => item.trang_thai !== "hoan_thanh" && item.status !== "hoan_thanh");
    throw new Error(
      `Khong gui duoc lanh dao duyet. Status ${sendRes.status}. Body: ${sendRes.text}. Subtask chua hoan thanh: ${compact(unfinished)}`
    );
  }
  return { taskId, subtaskId };
}

async function ensureMainTask() {
  if (!ctx.refs.taskId) ctx.refs.taskId = await createDirectTaskForTest("MAIN");
  return ctx.refs.taskId;
}

async function ensureMainSubtask() {
  const taskId = await ensureMainTask();
  if (!ctx.refs.subtaskId) ctx.refs.subtaskId = await createSubtaskForTask(taskId, "MAIN");
  return ctx.refs.subtaskId;
}

function handleDuplicateOrCreatePass(res, duplicateNeedle, firstCreateText, duplicateText) {
  if (res.status >= 200 && res.status < 300) return firstCreateText;
  const msg = responseMessage(res).toLowerCase();
  if (res.status === 400 && msg.includes(duplicateNeedle.toLowerCase())) return duplicateText;
  throw new Error(`Expected 2xx or duplicate 400 but got ${res.status}. Body: ${res.text}`);
}

const TEST_CASES = [
  {
    id: "TC_AUTH_01",
    usecase: "Dang nhap he thong",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra lanh dao dang nhap thanh cong va nhan JWT token",
    expected: "He thong tra ve token va thong tin nguoi dung",
    steps: async () => {
      await login("lanhDao");
      return `Status 200, co token, user=${CONFIG.accounts.lanhDao.username}`;
    },
  },
  {
    id: "TC_AUTH_02",
    usecase: "Dang nhap that bai khi sai mat khau",
    actor: "Can bo thuc hien",
    description: "Kiem tra he thong tu choi dang nhap khi mat khau khong dung",
    expected: "He thong tra ve 401/403 va khong tra ve token",
    steps: async () => {
      const res = await api("POST", "/auth/login", {
        body: { username: CONFIG.accounts.nhanVien.username, password: `${TEST_PREFIX}_SAI_MAT_KHAU` },
      });
      expectStatus(res, [401, 403]);
      assert(!res.json?.token, "Khong duoc tra ve token khi sai mat khau");
      return `Status ${res.status}, khong co token`;
    },
  },
  {
    id: "TC_AUTH_03",
    usecase: "Truy cap API can xac thuc khi khong co token",
    actor: "Nguoi dung chua dang nhap",
    description: "Kiem tra API /auth/me bi chan neu khong gui JWT",
    expected: "He thong tra ve 401/403",
    steps: async () => {
      const res = await api("GET", "/auth/me");
      expectStatus(res, [401, 403]);
      return `Status ${res.status}, endpoint yeu cau xac thuc`;
    },
  },
  {
    id: "TC_AUTH_04",
    usecase: "Truy cap API can xac thuc khi co token hop le",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra token hop le lay duoc thong tin tai khoan hien tai",
    expected: "He thong tra ve thong tin nguoi dung dang dang nhap",
    steps: async () => {
      const me = await getMe("lanhDao");
      return `Status 200, user=${me.username || me.id}`;
    },
  },
  {
    id: "TC_AUTH_05",
    usecase: "Phan quyen chuc nang quan tri",
    actor: "Can bo thuc hien",
    description: "Kiem tra nguoi khong du quyen khong duoc truy cap danh sach nguoi dung",
    expected: "He thong tra ve 401/403 cho GET /users",
    steps: async () => {
      await login("nhanVien");
      const res = await api("GET", "/users", { token: ctx.tokens.nhanVien });
      expectStatus(res, [401, 403]);
      return `Status ${res.status}, bi chan boi phan quyen`;
    },
  },
  {
    id: "TC_ADMIN_01",
    usecase: "Quan tri vien xem danh sach nguoi dung",
    actor: "Quan tri vien",
    description: "Kiem tra admin lay danh sach nguoi dung",
    expected: "He thong tra ve danh sach nguoi dung",
    steps: async () => {
      await login("admin");
      const res = await api("GET", "/users", { token: ctx.tokens.admin });
      expectStatus(res, [200]);
      return `Status 200, so ban ghi=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_ADMIN_02",
    usecase: "Quan tri vien xem danh sach vai tro",
    actor: "Quan tri vien",
    description: "Kiem tra admin xem danh sach vai tro",
    expected: "He thong tra ve danh sach vai tro",
    steps: async () => {
      await login("admin");
      const res = await api("GET", "/roles", { token: ctx.tokens.admin });
      expectStatus(res, [200]);
      return `Status 200, so vai tro=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_ADMIN_03",
    usecase: "Quan tri vien xem danh sach don vi",
    actor: "Quan tri vien",
    description: "Kiem tra admin xem danh sach don vi",
    expected: "He thong tra ve danh sach don vi",
    steps: async () => {
      await login("admin");
      const res = await api("GET", "/units", { token: ctx.tokens.admin });
      expectStatus(res, [200]);
      return `Status 200, so don vi=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_ADMIN_04",
    usecase: "Quan tri vien xem danh sach trang thai nhiem vu",
    actor: "Quan tri vien",
    description: "Kiem tra admin xem danh muc trang thai nhiem vu",
    expected: "He thong tra ve danh sach trang thai nhiem vu",
    steps: async () => {
      await login("admin");
      const res = await api("GET", "/task-statuses", { token: ctx.tokens.admin });
      expectStatus(res, [200]);
      return `Status 200, so trang thai=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_ADMIN_05",
    usecase: "Nguoi khong phai admin khong duoc quan ly nguoi dung",
    actor: "Can bo thuc hien",
    description: "Kiem tra can bo khong the xem danh sach nguoi dung",
    expected: "He thong tra ve 401/403",
    steps: async () => {
      await login("nhanVien");
      const res = await api("GET", "/users", { token: ctx.tokens.nhanVien });
      expectStatus(res, [401, 403]);
      return `Status ${res.status}, khong co quyen quan ly nguoi dung`;
    },
  },
  {
    id: "TC_DOC_01",
    usecase: "Van thu lay danh sach van ban",
    actor: "Van thu",
    description: "Kiem tra van thu xem danh sach van ban",
    expected: "He thong tra ve danh sach van ban",
    steps: async () => {
      await login("vanThu");
      const res = await api("GET", "/documents", { token: ctx.tokens.vanThu });
      expectStatus(res, [200]);
      return `Status 200, so van ban=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_DOC_02",
    usecase: "Van thu tao moi van ban voi du lieu hop le",
    actor: "Van thu",
    description: "Kiem tra van thu tao moi van ban co prefix AUTO_TEST",
    expected: "Van ban duoc tao va tra ve id",
    steps: async () => {
      const id = await createDocumentForTest("001");
      ctx.refs.documentId = id;
      return `Status 2xx, documentId=${id}`;
    },
  },
  {
    id: "TC_DOC_03",
    usecase: "Van thu gui van ban den Van phong Dang uy",
    actor: "Van thu",
    description: "Kiem tra van thu chuyen van ban sang buoc kiem tra",
    expected: "Van ban duoc gui review thanh cong",
    steps: async () => {
      const id = ctx.refs.documentId || (ctx.refs.documentId = await createDocumentForTest("WORKFLOW"));
      await login("vanThu");
      const res = await api("PUT", `/documents/${id}/submit-review`, { token: ctx.tokens.vanThu });
      expect2xx(res);
      return `Status ${res.status}, documentId=${id} da submit-review`;
    },
  },
  {
    id: "TC_DOC_04",
    usecase: "Chanh van phong duyet van ban",
    actor: "Chanh van phong",
    description: "Kiem tra Chanh van phong phe duyet van ban da gui kiem tra",
    expected: "Van ban duoc duyet o cap Van phong Dang uy",
    steps: async () => {
      const id = ctx.refs.documentId || skip("Chua co documentId");
      await login("chanhVanPhong");
      const res = await api("PUT", `/documents/${id}/office-approve`, {
        token: ctx.tokens.chanhVanPhong,
        body: { ghi_chu: `${TEST_PREFIX} - Van ban hop le` },
      });
      expect2xx(res);
      return `Status ${res.status}, documentId=${id} da office-approve`;
    },
  },
  {
    id: "TC_DOC_05",
    usecase: "Chanh van phong yeu cau bo sung van ban",
    actor: "Chanh van phong",
    description: "Kiem tra Chanh van phong yeu cau bo sung cho van ban test rieng",
    expected: "Van ban chuyen sang trang thai yeu cau bo sung",
    steps: async () => {
      const id = await createDocumentForTest("REJECT");
      await login("vanThu");
      await login("chanhVanPhong");
      expect2xx(await api("PUT", `/documents/${id}/submit-review`, { token: ctx.tokens.vanThu }));
      const res = await api("PUT", `/documents/${id}/office-reject`, {
        token: ctx.tokens.chanhVanPhong,
        body: { ly_do: `${TEST_PREFIX} - Thieu file scan`, ghi_chu: `${TEST_PREFIX} - Can bo sung` },
      });
      expect2xx(res);
      return `Status ${res.status}, documentId=${id} da office-reject`;
    },
  },
  {
    id: "TC_DOC_06",
    usecase: "Chanh van phong trinh van ban len lanh dao",
    actor: "Chanh van phong",
    description: "Kiem tra van ban da duyet duoc trinh len lanh dao",
    expected: "Van ban chuyen sang trang thai da trinh lanh dao",
    steps: async () => {
      const id = ctx.refs.documentId || skip("Chua co documentId da duyet");
      await login("chanhVanPhong");
      const res = await api("PUT", `/documents/${id}/send-to-leader`, { token: ctx.tokens.chanhVanPhong });
      expect2xx(res);
      return `Status ${res.status}, documentId=${id} da send-to-leader`;
    },
  },
  {
    id: "TC_TASK_01",
    usecase: "Lanh dao xem danh sach nhiem vu",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra lanh dao lay danh sach nhiem vu",
    expected: "He thong tra ve danh sach nhiem vu theo quyen",
    steps: async () => {
      await login("lanhDao");
      const res = await api("GET", "/tasks", { token: ctx.tokens.lanhDao });
      expectStatus(res, [200]);
      return `Status 200, so nhiem vu=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_TASK_02",
    usecase: "Lanh dao tao nhiem vu truc tiep",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra lanh dao tao nhiem vu truc tiep co prefix AUTO_TEST",
    expected: "Nhiem vu duoc tao va tra ve id",
    steps: async () => {
      const id = await createDirectTaskForTest("TASK_02");
      ctx.refs.taskId = id;
      return `Status 2xx, taskId=${id}`;
    },
  },
  {
    id: "TC_TASK_03",
    usecase: "Lanh dao tao nhiem vu tu van ban",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra tao nhiem vu tu van ban da trinh lanh dao",
    expected: "He thong tao nhiem vu tu document_id hop le",
    steps: async () => {
      const documentId = ctx.refs.documentId || skip("Chua co van ban da trinh lanh dao");
      await getMe("lanhDao");
      await getMe("truongPhong");
      const res = await api("POST", "/tasks/bulk-from-document", {
        token: ctx.tokens.lanhDao,
        body: { document_id: documentId, tasks: [taskPayload("FROM_DOC", { unit_id: unitId("truongPhong") || unitId("lanhDao") })] },
      });
      expect2xx(res);
      const id = extractId(res.json);
      if (id) track("tasks", id);
      return `Status ${res.status}, createdTaskId=${id || "khong tra ve truc tiep"}`;
    },
  },
  {
    id: "TC_TASK_04",
    usecase: "Lanh dao giao nhiem vu cho don vi/can bo",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra lanh dao giao nhiem vu cho truong phong phu trach",
    expected: "Nhiem vu duoc giao va cap nhat nguoi nhan",
    steps: async () => {
      const taskId = await ensureMainTask();
      await getMe("truongPhong");
      const res = await api("POST", `/tasks/${taskId}/assign`, {
        token: ctx.tokens.lanhDao,
        body: { assignee_user_id: userId("truongPhong") },
      });
      expect2xx(res);
      ctx.refs.assignedTaskId = taskId;
      return `Status ${res.status}, taskId=${taskId} da assign`;
    },
  },
  {
    id: "TC_TASK_05",
    usecase: "Khong cho xac nhan tiep nhan khi nhiem vu khong dung trang thai",
    actor: "Truong phong",
    description: "Kiem tra he thong chan confirm-unit khi task da qua trang thai cho xac nhan",
    expected: "He thong tra ve 400 va thong bao task khong dung trang thai",
    steps: async () => {
      const taskId = ctx.refs.assignedTaskId || (await ensureMainTask());
      await login("truongPhong");
      const res = await api("PUT", `/tasks/${taskId}/confirm-unit`, { token: ctx.tokens.truongPhong });
      const msg = responseMessage(res).toLowerCase();
      assert(res.status === 400 && msg.includes("task") && msg.includes("trang"), `Expected 400 task khong dung trang thai but got ${res.status}. Body: ${res.text}`);
      return `Status 400, he thong chan confirm-unit dung nghiep vu: ${responseMessage(res)}`;
    },
  },
  {
    id: "TC_TASK_06",
    usecase: "Truong phong tao phan viec cho can bo",
    actor: "Truong phong",
    description: "Kiem tra truong phong tao phan viec noi bo cho can bo",
    expected: "Phan viec duoc tao va tra ve id",
    steps: async () => {
      const id = await ensureMainSubtask();
      return `Status 2xx, subtaskId=${id}`;
    },
  },
  {
    id: "TC_TASK_07",
    usecase: "Can bo bat dau thuc hien phan viec",
    actor: "Can bo thuc hien",
    description: "Kiem tra can bo chuyen phan viec sang dang thuc hien",
    expected: "Phan viec duoc bat dau thanh cong",
    steps: async () => {
      const taskId = await ensureMainTask();
      const subtaskId = await ensureMainSubtask();
      const res = await startSubtask(taskId, subtaskId);
      return `Status ${res.status}, subtaskId=${subtaskId} da start`;
    },
  },
  {
    id: "TC_TASK_08",
    usecase: "Can bo cap nhat tien do",
    actor: "Can bo thuc hien",
    description: "Kiem tra endpoint cap nhat tien do hoac ghi nhan chan quyen dung nghiep vu",
    expected: "He thong tra ve 2xx khi duoc phep hoac 403 khi khong du quyen/pham vi",
    steps: async () => {
      const taskId = await ensureMainTask();
      await login("nhanVien");
      const res = await api("POST", `/tasks/${taskId}/progress`, {
        token: ctx.tokens.nhanVien,
        body: {
          noi_dung: `${TEST_PREFIX} - Cap nhat tien do phan viec`,
          trang_thai_sau: "dang_thuc_hien",
          kpi_sau: 60,
        },
      });
      if (res.status >= 200 && res.status < 300) return `Status ${res.status}, cap nhat tien do thanh cong`;
      if (res.status === 403) return `Status 403, he thong chan cap nhat khi khong du quyen/pham vi dung nghiep vu`;
      throw new Error(`Expected 2xx or 403 but got ${res.status}. Body: ${res.text}`);
    },
  },
  {
    id: "TC_TASK_09",
    usecase: "Can bo nop ket qua va minh chung",
    actor: "Can bo thuc hien",
    description: "Kiem tra can bo nop ket qua phan viec qua HTTP",
    expected: "Phan viec duoc nop va chuyen sang cho duyet cap don vi",
    steps: async () => {
      const taskId = await ensureMainTask();
      const subtaskId = await ensureMainSubtask();
      const res = await submitSubtask(taskId, subtaskId);
      return `Status ${res.status}, subtaskId=${subtaskId} da submit`;
    },
  },
  {
    id: "TC_APPROVAL_01",
    usecase: "Truong phong duyet phan viec cap don vi",
    actor: "Truong phong",
    description: "Kiem tra truong phong chap thuan phan viec da nop",
    expected: "Phan viec duoc duyet cap don vi",
    steps: async () => {
      const taskId = await ensureMainTask();
      const subtaskId = await ensureMainSubtask();
      const res = await approveSubtask(taskId, subtaskId, "chap_thuan");
      return `Status ${res.status}, subtaskId=${subtaskId} da duyet`;
    },
  },
  {
    id: "TC_APPROVAL_02",
    usecase: "Truong phong yeu cau can bo chinh sua phan viec",
    actor: "Truong phong",
    description: "Kiem tra dung luong tao task rieng, start, submit roi reject phan viec",
    expected: "Phan viec rieng chuyen sang trang thai yeu cau chinh sua",
    steps: async () => {
      const taskId = await createDirectTaskForTest("APPROVAL_REJECT");
      const subtaskId = await createSubtaskForTask(taskId, "APPROVAL_REJECT");
      ctx.refs.approvalRejectTaskId = taskId;
      ctx.refs.approvalRejectSubtaskId = subtaskId;
      await startSubtask(taskId, subtaskId);
      await submitSubtask(taskId, subtaskId);
      const res = await approveSubtask(taskId, subtaskId, "tu_choi");
      return `Status ${res.status}, subtaskId=${subtaskId} bi yeu cau chinh sua`;
    },
  },
  {
    id: "TC_APPROVAL_03",
    usecase: "Truong phong chuyen nhiem vu len lanh dao phe duyet",
    actor: "Truong phong",
    description: "Kiem tra task rieng chi co subtask da hoan thanh duoc gui len lanh dao",
    expected: "Nhiem vu chuyen sang cho lanh dao phe duyet",
    steps: async () => {
      const ready = await prepareTaskReadyForLeader("APPROVAL_03");
      ctx.refs.sentToLeaderTaskId = ready.taskId;
      return `Status 2xx, taskId=${ready.taskId} da send-to-leader`;
    },
  },
  {
    id: "TC_APPROVAL_04",
    usecase: "Lanh dao phe duyet nhiem vu",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra lanh dao chap thuan task da duoc truong phong gui len",
    expected: "Nhiem vu duoc phe duyet hoan thanh",
    steps: async () => {
      const taskId = ctx.refs.sentToLeaderTaskId || skip("Chua co sentToLeaderTaskId tu TC_APPROVAL_03");
      await login("lanhDao");
      const res = await api("POST", `/tasks/${taskId}/approve`, {
        token: ctx.tokens.lanhDao,
        body: {
          decision: "chap_thuan",
          quyet_dinh: "chap_thuan",
          ghi_chu: `${TEST_PREFIX} - Lanh dao phe duyet nhiem vu`,
        },
      });
      expect2xx(res);
      return `Status ${res.status}, taskId=${taskId} da approve`;
    },
  },
  {
    id: "TC_APPROVAL_05",
    usecase: "Lanh dao yeu cau don vi chinh sua nhiem vu",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra lanh dao tu choi mot task rieng da duoc gui len dung luong",
    expected: "He thong khong duoc tra 500 cho loi nghiep vu; 2xx la tu choi thanh cong",
    steps: async () => {
      const ready = await prepareTaskReadyForLeader("APPROVAL_05_REJECT");
      await login("lanhDao");
      const res = await api("POST", `/tasks/${ready.taskId}/approve`, {
        token: ctx.tokens.lanhDao,
        body: {
          decision: "tu_choi",
          quyet_dinh: "tu_choi",
          ghi_chu: `${TEST_PREFIX} - Lanh dao yeu cau don vi chinh sua`,
        },
      });
      if (res.status === 500) throw new Error(`Backend tra 500 cho loi nghiep vu. Body: ${res.text}`);
      expect2xx(res);
      return `Status ${res.status}, taskId=${ready.taskId} da bi lanh dao yeu cau chinh sua`;
    },
  },
  {
    id: "TC_REPORT_01",
    usecase: "Can bo xem danh sach phan viec can bao cao thang",
    actor: "Can bo thuc hien",
    description: "Kiem tra can bo lay danh sach bao cao ca nhan den han",
    expected: "He thong tra ve danh sach can bao cao",
    steps: async () => {
      await login("nhanVien");
      const res = await api("GET", "/employee-reports/due", { token: ctx.tokens.nhanVien });
      expectStatus(res, [200]);
      return `Status 200, so muc can bao cao=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_REPORT_02",
    usecase: "Khong cho can bo gui trung bao cao thang ca nhan",
    actor: "Can bo thuc hien",
    description: "Kiem tra he thong chan can bo gui bao cao ca nhan lan thu hai trong cung ky thang",
    expected: "He thong tra ve 400 va thong bao da gui bao cao cho thang nay, hoac 2xx neu tao lan dau",
    steps: async () => {
      await login("nhanVien");
      const body = new FormData();
      body.append("month", REPORT_MONTH);
      body.append("ky_bao_cao", REPORT_MONTH);
      body.append("noi_dung", `${TEST_PREFIX} - Bao cao ca nhan thang ${REPORT_MONTH}`);
      body.append("ghi_chu", `${TEST_PREFIX} - Du lieu kiem thu tu dong`);
      const res = await api("POST", "/employee-reports", { token: ctx.tokens.nhanVien, body });
      const actual = handleDuplicateOrCreatePass(res, "da gui bao cao", "Tao bao cao lan dau thanh cong", "He thong chan gui trung dung nghiep vu");
      const id = extractId(res.json);
      if (id) track("reports", id);
      return `Status ${res.status}, ${actual}`;
    },
  },
  {
    id: "TC_REPORT_03",
    usecase: "Truong phong xem danh sach nhiem vu can tong hop bao cao",
    actor: "Truong phong",
    description: "Kiem tra truong phong lay danh sach nhiem vu can tong hop bao cao thang",
    expected: "He thong tra ve danh sach nhiem vu can bao cao",
    steps: async () => {
      await login("truongPhong");
      const res = await api("GET", "/task-reports/monthly/due", { token: ctx.tokens.truongPhong });
      expectStatus(res, [200]);
      return `Status 200, so muc can tong hop=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_REPORT_04",
    usecase: "Khong cho phong ban gui trung bao cao thang don vi",
    actor: "Truong phong",
    description: "Kiem tra he thong chan phong ban gui trung bao cao thang don vi",
    expected: "He thong tra ve 400 thong bao phong ban da gui bao cao thang nay, hoac 2xx neu tao lan dau",
    steps: async () => {
      await login("truongPhong");
      const body = new FormData();
      body.append("month", REPORT_MONTH);
      body.append("ky_bao_cao", REPORT_MONTH);
      body.append("noi_dung", `${TEST_PREFIX} - Bao cao thang don vi`);
      body.append("nhan_xet", `${TEST_PREFIX} - Don vi hoan thanh cac nhiem vu trong thang`);
      const res = await api("POST", "/task-reports/monthly", { token: ctx.tokens.truongPhong, body });
      const actual = handleDuplicateOrCreatePass(res, "da gui bao cao", "Tao bao cao don vi lan dau thanh cong", "He thong chan phong ban gui trung dung nghiep vu");
      const id = extractId(res.json);
      if (id) track("reports", id);
      return `Status ${res.status}, ${actual}`;
    },
  },
  {
    id: "TC_REPORT_05",
    usecase: "Lanh dao xem danh sach bao cao thang",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra lanh dao xem danh sach bao cao thang",
    expected: "He thong tra ve danh sach bao cao",
    steps: async () => {
      await login("lanhDao");
      const res = await api("GET", "/task-reports", { token: ctx.tokens.lanhDao });
      expectStatus(res, [200]);
      return `Status 200, so bao cao=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_NOTIFY_01",
    usecase: "Nguoi dung xem danh sach thong bao",
    actor: "Can bo thuc hien",
    description: "Kiem tra nguoi dung lay danh sach thong bao cua minh",
    expected: "He thong tra ve danh sach thong bao",
    steps: async () => {
      await login("nhanVien");
      const res = await api("GET", "/notifications", { token: ctx.tokens.nhanVien });
      expectStatus(res, [200]);
      return `Status 200, so thong bao=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_NOTIFY_02",
    usecase: "Nguoi dung xem so thong bao chua doc",
    actor: "Can bo thuc hien",
    description: "Kiem tra API dem so thong bao chua doc",
    expected: "He thong tra ve so luong thong bao chua doc",
    steps: async () => {
      await login("nhanVien");
      const res = await api("GET", "/notifications/unread-count", { token: ctx.tokens.nhanVien });
      expectStatus(res, [200]);
      return `Status 200, unread=${res.json?.count ?? res.json?.unreadCount ?? res.json?.total ?? compact(res.json)}`;
    },
  },
  {
    id: "TC_NOTIFY_03",
    usecase: "Nguoi dung danh dau mot thong bao da doc",
    actor: "Can bo thuc hien",
    description: "Kiem tra danh dau thong bao dau tien thanh da doc",
    expected: "Thong bao duoc cap nhat trang thai da doc",
    steps: async () => {
      await login("nhanVien");
      const listRes = await api("GET", "/notifications", { token: ctx.tokens.nhanVien });
      expectStatus(listRes, [200]);
      const notification = extractList(listRes.json)[0];
      if (!notification?.id) skip("Khong co thong bao de danh dau da doc");
      const res = await api("PATCH", `/notifications/${notification.id}/read`, { token: ctx.tokens.nhanVien });
      expect2xx(res);
      return `Status ${res.status}, notificationId=${notification.id} da read`;
    },
  },
  {
    id: "TC_CHAT_01",
    usecase: "Nguoi dung xem danh sach hoi thoai",
    actor: "Can bo thuc hien",
    description: "Kiem tra nguoi dung xem danh sach hoi thoai ma minh tham gia",
    expected: "He thong tra ve danh sach hoi thoai",
    steps: async () => {
      await login("nhanVien");
      const res = await api("GET", "/conversations/my", { token: ctx.tokens.nhanVien });
      expectStatus(res, [200]);
      return `Status 200, so hoi thoai=${extractList(res.json).length}`;
    },
  },
  {
    id: "TC_CHAT_02",
    usecase: "Nguoi dung mo hoi thoai ma minh tham gia",
    actor: "Can bo thuc hien",
    description: "Kiem tra lay hoi thoai dau tien cua tai khoan nhanVien de tranh loi 403 khong thuoc hoi thoai",
    expected: "Neu co hoi thoai thi set conversationId; neu khong co thi SKIPPED",
    steps: async () => {
      await login("nhanVien");
      const res = await api("GET", "/conversations/my", { token: ctx.tokens.nhanVien });
      expectStatus(res, [200]);
      const conversation = extractList(res.json)[0];
      const conversationId = extractId(conversation);
      if (!conversationId) skip("Khong co hoi thoai nao cua tai khoan test");
      ctx.refs.conversationId = conversationId;
      return `Status 200, conversationId=${conversationId}`;
    },
  },
  {
    id: "TC_CHAT_03",
    usecase: "Nguoi dung gui tin nhan trong hoi thoai nhiem vu",
    actor: "Can bo thuc hien",
    description: "Kiem tra gui tin nhan bang dung tai khoan da lay conversationId",
    expected: "Tin nhan duoc gui thanh cong qua API chat",
    steps: async () => {
      const conversationId = ctx.refs.conversationId || skip("Chua co conversationId tu TC_CHAT_02");
      await login("nhanVien");
      const text = `${TEST_PREFIX} - Tin nhan kiem thu realtime qua HTTP`;
      const res = await api("POST", "/chat/send", {
        token: ctx.tokens.nhanVien,
        body: { conversation_id: conversationId, conversationId, content: text, message: text },
      });
      expect2xx(res);
      return `Status ${res.status}, da gui tin nhan conversationId=${conversationId}`;
    },
  },
  {
    id: "TC_DASHBOARD_01",
    usecase: "Nguoi dung xem dashboard theo vai tro",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra dashboard tra ve du lieu theo vai tro dang dang nhap",
    expected: "He thong tra ve thong tin dashboard",
    steps: async () => {
      await login("lanhDao");
      const res = await api("GET", "/dashboard", { token: ctx.tokens.lanhDao });
      expectStatus(res, [200]);
      return `Status 200, dashboard=${compact(res.json)}`;
    },
  },
  {
    id: "TC_KPI_01",
    usecase: "Lanh dao xem thong ke KPI tong quan",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra lanh dao lay KPI overview",
    expected: "He thong tra ve thong ke KPI tong quan",
    steps: async () => {
      await login("lanhDao");
      const res = await api("GET", "/kpi/overview", { token: ctx.tokens.lanhDao });
      expectStatus(res, [200]);
      return `Status 200, kpi=${compact(res.json)}`;
    },
  },
  {
    id: "TC_KPI_02",
    usecase: "Lanh dao xem bang xep hang KPI",
    actor: "Lanh dao Dang uy",
    description: "Kiem tra lanh dao lay bang xep hang KPI",
    expected: "He thong tra ve danh sach xep hang KPI",
    steps: async () => {
      await login("lanhDao");
      const res = await api("GET", "/kpi/rankings", { token: ctx.tokens.lanhDao });
      expectStatus(res, [200]);
      return `Status 200, so dong xep hang=${extractList(res.json).length}`;
    },
  },
];

async function runTest(testCase) {
  ctx.currentApis = [];
  console.log(`\n[${testCase.id}] ${testCase.usecase} - ${testCase.actor}`);
  console.log(`Description: ${testCase.description}`);
  console.log(`Expected: ${testCase.expected}`);
  try {
    const actual = await testCase.steps(ctx);
    console.log(`API: ${ctx.currentApis.join(", ") || "Khong goi API"}`);
    console.log(`Actual: ${actual}`);
    console.log("Result: PASS");
    return { id: testCase.id, status: "PASS", actual };
  } catch (error) {
    const status = error instanceof SkipTest ? "SKIPPED" : "FAIL";
    console.log(`API: ${ctx.currentApis.join(", ") || "Khong goi API"}`);
    console.log(`Actual: ${error.message}`);
    console.log(`Result: ${status}`);
    return { id: testCase.id, status, actual: error.message };
  }
}

async function cleanupNote() {
  console.log("\n===== CLEANUP NOTE =====");
  console.log("Mac dinh khong goi API DELETE de tranh anh huong du lieu that.");
  console.log("Cac ID du lieu test da tao, vui long kiem tra/xoa mem thu cong neu can:");
  console.log(JSON.stringify(ctx.created, null, 2));
}

async function main() {
  console.log("===== USE CASE API TEST RUNNER =====");
  console.log(`Base URL: ${CONFIG.baseUrl}`);
  console.log(`Total test cases: ${TEST_CASES.length}`);
  console.log("Neu backend chua chay hoac tai khoan test chua dung, cac test lien quan se FAIL/SKIPPED.\n");

  const results = [];
  for (const testCase of TEST_CASES) {
    results.push(await runTest(testCase));
  }

  await cleanupNote();

  const passed = results.filter((item) => item.status === "PASS");
  const failed = results.filter((item) => item.status === "FAIL");
  const skipped = results.filter((item) => item.status === "SKIPPED");

  console.log("\n===== TEST SUMMARY =====");
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Skipped: ${skipped.length}`);

  if (failed.length) {
    console.log("Failed cases:");
    for (const item of failed) console.log(`- ${item.id}: ${item.actual}`);
  }
  if (skipped.length) {
    console.log("Skipped cases:");
    for (const item of skipped) console.log(`- ${item.id}: ${item.actual}`);
  }

  process.exitCode = failed.length > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error("Loi khong mong doi khi chay test runner:", error);
  process.exitCode = 1;
});
