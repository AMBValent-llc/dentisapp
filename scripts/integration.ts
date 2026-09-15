import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nodeProcess from "node:process";

type Row = Record<string, unknown> & { id: string };
type Payload = Record<string, unknown>;
type Result = { status: number; body: unknown };
type Resource = { path: string; envelope: string; row: Row; patch: Payload; detail: boolean };

const configuredUrl = nodeProcess.env.API_TEST_BASE_URL ?? nodeProcess.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const baseUrl = new URL(configuredUrl);
if (nodeProcess.env.ALLOW_API_TESTS !== "1") throw new Error("API tests create synthetic data. Set ALLOW_API_TESTS=1 explicitly.");
if (!["localhost", "127.0.0.1", "[::1]"].includes(baseUrl.hostname)
  || !["http:", "https:"].includes(baseUrl.protocol)
  || baseUrl.username || baseUrl.password || baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
  throw new Error("API tests require a localhost origin without credentials, path, query, or fragment.");
}

const runId = randomUUID().replaceAll("-", "");
let checks = 0;
const cleanup: { client: Client; path: string }[] = [];

function object(value: unknown): Payload {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), "Expected a JSON object");
  return value as Payload;
}

function row(value: unknown): Row {
  const result = object(value);
  assert.equal(typeof result.id, "string", "Expected a string ID");
  return result as Row;
}

function rows(value: unknown): Row[] {
  assert(Array.isArray(value), "Expected a JSON array");
  return value.map(row);
}

function exactKeys(value: unknown, expected: string[]) {
  assert.deepEqual(Object.keys(object(value)).sort(), [...expected].sort());
  checks++;
}

class Client {
  private cookies = new Map<string, string>();

  async page(path: string) {
    const url = new URL(path, baseUrl);
    assert.equal(url.origin, baseUrl.origin, "Only local page URLs are allowed");
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Origin: baseUrl.origin,
        ...(this.cookies.size ? { Cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ") } : {}),
      },
    });
    return { status: response.status, location: response.headers.get("location"), html: await response.text() };
  }

  async request(path: string, method = "GET", body?: Payload): Promise<Result> {
    assert(path.startsWith("/api/") && !path.includes("://"), "Only local API paths are allowed");
    const response = await fetch(new URL(path, baseUrl), {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Origin: baseUrl.origin,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(this.cookies.size ? { Cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ") } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(";")[0];
      const separator = pair.indexOf("=");
      if (separator < 0) continue;
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (!value || /;\s*max-age=0(?:;|$)/i.test(header)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try { parsed = JSON.parse(text); } catch { throw new Error(`${method} ${path}: non-JSON response (${response.status})`); }
    }
    return { status: response.status, body: parsed };
  }
}

async function expect(client: Client, path: string, status = 200, method = "GET", body?: Payload): Promise<unknown> {
  const result = await client.request(path, method, body);
  assert.equal(result.status, status, `${method} ${path}: unexpected HTTP status`);
  if (status === 204) assert.equal(result.body, null, "204 must have no response body");
  if (status >= 400) assert.equal(typeof object(result.body).error, "string", `${path}: missing API error envelope`);
  checks++;
  return result.body;
}

async function entity(client: Client, path: string, envelope: string, method = "GET", body?: Payload) {
  const payload = await expect(client, path, method === "POST" ? 201 : 200, method, body);
  exactKeys(payload, [envelope]);
  return row(object(payload)[envelope]);
}

async function create(client: Client, path: string, envelope: string, body: Payload) {
  const created = await entity(client, path, envelope, "POST", body);
  cleanup.push({ client, path: `${path}/${created.id}` });
  return created;
}

async function collection(client: Client, path: string, envelope: string) {
  const payload = await expect(client, path);
  exactKeys(payload, [envelope]);
  return rows(object(payload)[envelope]);
}

async function noOp(client: Client, path: string, envelope: string, before: Row) {
  for (const body of [{}, { ignoredField: "must not be persisted" }]) {
    const after = await entity(client, path, envelope, "PATCH", body);
    assert.deepEqual(after, before, `${path}: empty/unknown-only PATCH changed a record`);
    checks++;
  }
}

async function signup(client: Client, label: string) {
  const email = `api-${label}-${runId}@example.com`;
  const password = `Api!${randomUUID()}a9`;
  const result = await client.request("/api/auth/sign-up/email", "POST", { name: `API ${label}`, email, password });
  assert.equal(result.status, 200, `${label}: signup failed`);
  const user = row(object(result.body).user);
  assert.equal(user.email, email);
  const session = object(await expect(client, "/api/auth/get-session"));
  assert.equal(row(session.user).id, user.id, `${label}: signup did not establish a session`);
  return { email, password, user };
}

async function signout(client: Client) {
  await expect(client, "/api/auth/sign-out", 200, "POST", {});
  assert((await expect(client, "/api/auth/get-session")) === null, "Signout retained an authenticated session");
  await expect(client, "/api/processes", 401);
}

async function onboard(client: Client, label: string) {
  await expect(client, "/api/processes", 401);
  await expect(client, "/api/workspaces", 422, "POST", {});
  const organization = await entity(client, "/api/workspaces", "organization", "POST", { name: `API ${label} ${runId}`, sector: "test", teamSize: "2" });
  assert.equal(organization.plan, "starter");
  assert.equal(organization.timezone, "America/Bogota");
  const workspace = await expect(client, "/api/workspaces");
  exactKeys(workspace, ["organization", "role"]);
  assert.equal(object(workspace).role, "OWNER");
  assert.equal(row(object(workspace).organization).id, organization.id);
  await expect(client, "/api/workspaces", 409, "POST", { name: "Duplicate workspace" });
  return organization;
}

async function assertSearch(client: Client, path: string, envelope: string, query: string, expectedId: string) {
  const found = await collection(client, `${path}?q=${encodeURIComponent(query)}`, envelope);
  assert.deepEqual(found.map((item) => item.id), [expectedId], `${path}: literal substring search mismatch`);
  checks++;
}

async function authenticatedPages(client: Client) {
  for (const path of [
    "/dashboard", "/procesos", "/tareas", "/documentos", "/pacientes", "/historia-clinica",
    "/consentimientos", "/remisiones", "/examenes", "/perfil", "/reportes",
  ]) {
    const response = await client.page(path);
    assert.equal(response.status, 200, `${path}: authenticated page did not render successfully`);
    assert.equal(response.location, null, `${path}: unexpected redirect`);
    assert(response.html.includes("<html"), `${path}: expected HTML document`);
    assert(!response.html.includes('id="__next_error__"'), `${path}: Next.js rendered an error document`);
    assert(!response.html.includes("NEXT_HTTP_ERROR_FALLBACK;500"), `${path}: server render failed`);
    checks++;
  }
  const registration = await client.page("/registro");
  assert([303, 307, 308].includes(registration.status), "An existing member should be redirected away from registration");
  assert(registration.location, "Registration redirect missing Location");
  assert.equal(new URL(registration.location, baseUrl).pathname, "/dashboard");
  checks++;
  console.log("PASS 11 authenticated page renders and membership registration redirect (manual redirects)");
}

async function memberChecks() {
  const email = nodeProcess.env.API_TEST_MEMBER_EMAIL;
  const password = nodeProcess.env.API_TEST_MEMBER_PASSWORD;
  if (!email || !password) {
    return false;
  }
  const member = new Client();
  const login = await member.request("/api/auth/sign-in/email", "POST", { email, password });
  assert.equal(login.status, 200, "MEMBER fixture login failed");
  const workspace = object(await expect(member, "/api/workspaces"));
  assert.equal(workspace.role, "MEMBER", "Configured role fixture is not MEMBER");
  for (const [path, envelope] of [
    ["/api/patients", "patients"], ["/api/processes", "processes"], ["/api/tasks", "tasks"], ["/api/documents", "documents"],
    ["/api/clinical-histories", "histories"], ["/api/consents", "consents"], ["/api/referrals", "referrals"], ["/api/exams", "exams"],
  ] as const) {
    const visible = await collection(member, path, envelope);
    const target = visible[0]?.id ?? `missing-${runId}`;
    const failure = await expect(member, `${path}/${target}`, 403, "DELETE");
    assert.equal(object(failure).error, "Se requiere rol administrador");
    assert.deepEqual(await collection(member, path, envelope), visible, "Denied MEMBER delete changed visible records");
  }
  await signout(member);
  return true;
}

async function main() {
  const paths = [
    ["/api/processes", "processes"], ["/api/tasks", "tasks"], ["/api/documents", "documents"],
    ["/api/patients", "patients"], ["/api/clinical-histories", "histories"], ["/api/consents", "consents"],
    ["/api/referrals", "referrals"], ["/api/exams", "exams"],
  ] as const;
  const anonymous = new Client();
  for (const [path] of paths) {
    await expect(anonymous, path, 401);
    await expect(anonymous, path, 401, "POST", {});
    await expect(anonymous, `${path}/missing`, 401, "PATCH", {});
    await expect(anonymous, `${path}/missing`, 403, "DELETE");
  }
  await expect(anonymous, "/api/profile", 401);
  await expect(anonymous, "/api/workspaces", 401);
  assert((await expect(anonymous, "/api/auth/get-session")) === null, "Anonymous client unexpectedly has a session");
  console.log("PASS anonymous API access and session checks");

  const owner = new Client();
  const other = new Client();
  const ownerIdentity = await signup(owner, "owner");
  const otherIdentity = await signup(other, "other");
  await signout(owner);
  const wrongLogin = await owner.request("/api/auth/sign-in/email", "POST", { email: ownerIdentity.email, password: `wrong-${randomUUID()}` });
  assert.equal(wrongLogin.status, 401, "Invalid password was accepted");
  const login = await owner.request("/api/auth/sign-in/email", "POST", { email: ownerIdentity.email, password: ownerIdentity.password });
  assert.equal(login.status, 200, "Owner login failed");
  assert.equal(row(object(await expect(owner, "/api/auth/get-session")).user).id, ownerIdentity.user.id);
  const ownerOrganization = await onboard(owner, "owner");
  const otherOrganization = await onboard(other, "other");
  assert.notEqual(ownerOrganization.id, otherOrganization.id);
  console.log("PASS signup, login, session, signout, OWNER onboarding and duplicate rejection");

  const profile = object(await expect(owner, "/api/profile"));
  exactKeys(profile, ["user", "organization", "role"]);
  exactKeys(profile.user, ["id", "name", "email", "phone"]);
  assert.equal(profile.role, "OWNER");
  const profileInitial = object(await expect(owner, "/api/profile", 200, "PATCH", {}));
  exactKeys(profileInitial, ["user", "organization"]);
  const profileAgain = await expect(owner, "/api/profile", 200, "PATCH", { ignored: "value" });
  assert.deepEqual(profileAgain, profileInitial);
  const profileNamed = object(await expect(owner, "/api/profile", 200, "PATCH", { name: "API Updated owner", phone: "1234" }));
  assert.equal(object(profileNamed.user).name, "API Updated owner");
  assert.deepEqual(profileNamed.organization, profileInitial.organization, "User-only profile PATCH changed organization");
  const profileOrg = object(await expect(owner, "/api/profile", 200, "PATCH", { organizationName: "API Updated organization", sector: "clinical", timezone: "UTC" }));
  assert.deepEqual(profileOrg.user, profileNamed.user, "Organization-only profile PATCH changed user");
  assert.equal(object(profileOrg.organization).name, "API Updated organization");
  assert.equal(object(profileOrg.organization).timezone, "UTC");
  const profileCleared = object(await expect(owner, "/api/profile", 200, "PATCH", { phone: null, sector: null }));
  assert.equal(object(profileCleared.user).phone, null);
  assert.equal(object(profileCleared.organization).sector, null);
  await expect(owner, "/api/profile", 422, "PATCH", { name: "" });
  assert.deepEqual(await expect(owner, "/api/profile", 200, "PATCH", {}), profileCleared);
  console.log("PASS atomic profile partial, empty, nullable and validation behavior");

  for (const [path] of paths) await expect(owner, path, 422, "POST", {});
  const process = await create(owner, "/api/processes", "process", { name: `${runId} literal%_mark`, description: "Literal query fixture", steps: ["First", "Second"], dueDate: "2030-01-02T00:00:00.000Z" });
  const processSteps = rows(process.steps);
  assert.deepEqual(processSteps.map((step) => [step.title, step.position, step.completed]), [["First", 0, false], ["Second", 1, false]]);
  assert(processSteps.every((step) => step.processId === process.id));
  const processPlain = await create(owner, "/api/processes", "process", { name: `${runId} literalXXmark`, steps: [] });
  assert.deepEqual(processPlain.steps, []);
  const listedProcess = (await collection(owner, "/api/processes", "processes")).find((item) => item.id === process.id);
  assert(listedProcess);
  assert.deepEqual(listedProcess._count, { tasks: 0, documents: 0 });
  for (const query of [`${runId} literal%`, `${runId} literal%_`]) await assertSearch(owner, "/api/processes", "processes", query, process.id);
  const task = await create(owner, "/api/tasks", "task", { title: `${runId} literal%_task`, processId: process.id, assigneeId: ownerIdentity.user.id, dueDate: "2030-01-03T00:00:00.000Z" });
  await create(owner, "/api/tasks", "task", { title: `${runId} literalXXtask` });
  for (const query of [`${runId} literal%`, `${runId} literal%_`]) await assertSearch(owner, "/api/tasks", "tasks", query, task.id);
  const document = await create(owner, "/api/documents", "document", { name: "API Document", processId: process.id, category: "clinical", externalUrl: "https://example.com/synthetic-document" });
  const patient = await create(owner, "/api/patients", "patient", { documentNumber: `DOC${runId}%_`, fullName: `${runId} literal%_patient`, birthDate: "2000-01-02", phone: "1234" });
  await create(owner, "/api/patients", "patient", { documentNumber: `DOC${runId}XX`, fullName: `${runId} literalXXpatient` });
  await expect(owner, "/api/patients", 409, "POST", { documentNumber: patient.documentNumber, fullName: "Duplicate" });
  for (const query of [`${runId} literal%`, `${runId} literal%_`, `DOC${runId}%`, `DOC${runId}%_`]) await assertSearch(owner, "/api/patients", "patients", query, patient.id);
  assert.deepEqual(await collection(owner, `/api/patients?q=${encodeURIComponent(`doc${runId}%_`)}`, "patients"), []);
  const history = await create(owner, "/api/clinical-histories", "history", { patientId: patient.id, consultationReason: "API consultation", personalHistory: "Synthetic history", familyHistory: "Synthetic family", currentMedication: "None", examination: "Synthetic examination", painScale: 0, metadata: { synthetic: true, nested: { test: 1 } } });
  assert.deepEqual(history.metadata, { synthetic: true, nested: { test: 1 } });
  const consent = await create(owner, "/api/consents", "consent", { patientId: patient.id, title: "API consent", body: "Synthetic body" });
  const referral = await create(owner, "/api/referrals", "referral", { patientId: patient.id, specialty: "Synthetic specialty", reason: "API referral" });
  const exam = await create(owner, "/api/exams", "exam", { patientId: patient.id, name: "API exam" });
  assert.equal(task.status, "TODO");
  assert.equal(process.status, "DRAFT");
  assert.equal(consent.status, "DRAFT");
  assert.equal(referral.status, "DRAFT");
  assert.equal(exam.status, "ORDERED");
  assert.equal(exam.completedAt, null);
  console.log("PASS creation, nested steps, defaults, JSON metadata, duplicate patient and literal searches");

  const resources: Resource[] = [
    { path: "/api/processes", envelope: "process", row: process, patch: { status: "ACTIVE", progress: 30, description: null, dueDate: null }, detail: true },
    { path: "/api/tasks", envelope: "task", row: task, patch: { status: "DONE", progress: 100, description: null, dueDate: null }, detail: true },
    { path: "/api/documents", envelope: "document", row: document, patch: { name: "Updated API Document", externalUrl: null, category: null }, detail: true },
    { path: "/api/patients", envelope: "patient", row: patient, patch: { fullName: "Updated API Patient", birthDate: null, phone: null }, detail: true },
    { path: "/api/clinical-histories", envelope: "history", row: history, patch: { diagnosis: "Updated synthetic diagnosis", treatmentPlan: null, painScale: null }, detail: true },
    { path: "/api/consents", envelope: "consent", row: consent, patch: { status: "SIGNED", signedAt: "2030-01-01T00:00:00.000Z", expiresAt: null }, detail: false },
    { path: "/api/referrals", envelope: "referral", row: referral, patch: { status: "COMPLETED", referredAt: "2030-01-01T00:00:00.000Z", notes: null }, detail: false },
    { path: "/api/exams", envelope: "exam", row: exam, patch: { status: "COMPLETED", completedAt: "2030-01-01T00:00:00.000Z", scheduledAt: null, result: "Synthetic result" }, detail: false },
  ];
  for (const item of resources) {
    const path = `${item.path}/${item.row.id}`;
    const { steps: ignoredSteps, ...processScalars } = item.row;
    void ignoredSteps;
    await noOp(owner, path, item.envelope, item.envelope === "process" ? processScalars as Row : item.row);
    const updated = await entity(owner, path, item.envelope, "PATCH", item.patch);
    for (const [key, value] of Object.entries(item.patch)) assert.deepEqual(updated[key], value, `${path}: PATCH field ${key}`);
    assert.notEqual(updated.updatedAt, item.row.updatedAt, `${path}: nonempty PATCH did not advance updatedAt`);
    assert.equal(updated.organizationId, ownerOrganization.id);
    await noOp(owner, path, item.envelope, updated);
    await expect(owner, `${item.path}/missing-${runId}`, 404, "PATCH", {});
    await expect(owner, `${item.path}/missing-${runId}`, 404, "DELETE");
    if (item.detail) {
      assert.equal((await entity(owner, path, item.envelope)).id, item.row.id);
      await expect(owner, `${item.path}/missing-${runId}`, 404);
    }
  }
  await expect(owner, `/api/tasks/${task.id}`, 422, "PATCH", { status: "INVALID" });
  await expect(owner, `/api/clinical-histories/${history.id}`, 422, "PATCH", { painScale: 11 });
  const historyFiltered = await collection(owner, `/api/clinical-histories?patientId=${patient.id}`, "histories");
  assert.deepEqual(historyFiltered.map((item) => item.id), [history.id]);
  assert.deepEqual(await collection(owner, "/api/clinical-histories?patientId=", "histories"), []);
  const currentHistory = await entity(owner, `/api/clinical-histories/${history.id}`, "history");
  assert.equal(currentHistory.personalHistory, "Synthetic history", "Partial history update lost omitted fields");
  exactKeys(currentHistory.author, ["id", "name"]);
  assert.equal(row(currentHistory.patient).id, patient.id);
  const currentPatient = await entity(owner, `/api/patients/${patient.id}`, "patient");
  for (const relation of ["histories", "consents", "referrals", "exams"]) assert.equal(rows(currentPatient[relation]).length, 1);
  const patientList = await collection(owner, "/api/patients", "patients");
  assert.deepEqual(patientList.find((item) => item.id === patient.id)?._count, { histories: 1, consents: 1, referrals: 1, exams: 1 });
  for (const [path, envelope] of paths.slice(4)) {
    const record = (await collection(owner, path, envelope))[0];
    exactKeys(record.patient, ["id", "fullName", "documentNumber"]);
    if (path === "/api/clinical-histories") exactKeys(record.author, ["id", "name"]);
  }
  const taskList = await collection(owner, "/api/tasks", "tasks");
  const relatedTask = taskList.find((item) => item.id === task.id);
  assert(relatedTask);
  exactKeys(relatedTask.process, ["id", "name"]);
  exactKeys(relatedTask.assignee, ["id", "name"]);
  assert.equal(row(relatedTask.assignee).id, ownerIdentity.user.id);
  const unrelatedTask = taskList.find((item) => item.id !== task.id);
  assert(unrelatedTask);
  assert.equal(unrelatedTask.process, null);
  assert.equal(unrelatedTask.assignee, null);
  const relatedDocument = (await collection(owner, "/api/documents", "documents"))[0];
  exactKeys(relatedDocument.process, ["id", "name"]);
  exactKeys(relatedDocument.uploadedBy, ["id", "name"]);
  const processDetail = await entity(owner, `/api/processes/${process.id}`, "process");
  assert.deepEqual(rows(processDetail.tasks).map((item) => item.id), [task.id]);
  assert.deepEqual(rows(processDetail.documents).map((item) => item.id), [document.id]);
  assert.deepEqual((await collection(owner, "/api/processes", "processes")).find((item) => item.id === process.id)?._count, { tasks: 1, documents: 1 });
  console.log("PASS PATCH/null/no-op semantics, timestamps, relations, filters and correlated counts");

  const otherProcess = await create(other, "/api/processes", "process", { name: "Other tenant process" });
  const otherPatient = await create(other, "/api/patients", "patient", { documentNumber: patient.documentNumber, fullName: "Other tenant patient" });
  const otherRecords = [
    otherProcess,
    await create(other, "/api/tasks", "task", { title: "Other tenant task", processId: otherProcess.id, assigneeId: otherIdentity.user.id }),
    await create(other, "/api/documents", "document", { name: "Other tenant document", processId: otherProcess.id }),
    otherPatient,
    await create(other, "/api/clinical-histories", "history", { patientId: otherPatient.id, consultationReason: "Other tenant history" }),
    await create(other, "/api/consents", "consent", { patientId: otherPatient.id, title: "Other tenant consent" }),
    await create(other, "/api/referrals", "referral", { patientId: otherPatient.id, specialty: "Other specialty", reason: "Other tenant referral" }),
    await create(other, "/api/exams", "exam", { patientId: otherPatient.id, name: "Other tenant exam" }),
  ];
  for (let index = 0; index < resources.length; index++) {
    const item = resources[index];
    const [path, envelope] = paths[index];
    const others = await collection(other, path, envelope);
    assert.deepEqual(others.map((record) => record.id), [otherRecords[index].id]);
    assert(!(await collection(owner, path, envelope)).some((record) => record.id === otherRecords[index].id));
    for (const [client, target] of [[other, item.row.id], [owner, otherRecords[index].id]] as const) {
      if (item.detail) await expect(client, `${path}/${target}`, 404);
      await expect(client, `${path}/${target}`, 404, "PATCH", item.patch);
      await expect(client, `${path}/${target}`, 404, "DELETE");
    }
  }
  assert.deepEqual(await collection(other, `/api/clinical-histories?patientId=${patient.id}`, "histories"), []);
  await expect(owner, "/api/tasks", 422, "POST", { title: "Invalid linked process", processId: otherProcess.id });
  await expect(owner, "/api/tasks", 422, "POST", { title: "Invalid assignee", assigneeId: otherIdentity.user.id });
  await expect(owner, "/api/documents", 422, "POST", { name: "Invalid linked document", processId: otherProcess.id });
  for (const [path, body] of [
    ["/api/clinical-histories", { consultationReason: "Invalid linked history" }],
    ["/api/consents", { title: "Invalid linked consent" }],
    ["/api/referrals", { specialty: "Invalid specialty", reason: "Invalid linked referral" }],
    ["/api/exams", { name: "Invalid linked exam" }],
  ] as const) await expect(owner, path, 422, "POST", { ...body, patientId: otherPatient.id });
  assert.equal(row(object(await expect(other, "/api/profile")).user).id, otherIdentity.user.id);
  assert.equal(row(object(await expect(other, "/api/workspaces")).organization).id, otherOrganization.id);
  console.log("PASS independent cookie jars and bidirectional tenant read/write/reference isolation");

  await authenticatedPages(owner);

  for (const item of resources.filter((item) => !["patient", "process"].includes(item.envelope))) {
    await expect(owner, `${item.path}/${item.row.id}`, 204, "DELETE");
    await expect(owner, `${item.path}/${item.row.id}`, 404, "DELETE");
  }
  assert.deepEqual((await collection(owner, "/api/patients", "patients")).find((item) => item.id === patient.id)?._count, { histories: 0, consents: 0, referrals: 0, exams: 0 });
  assert.deepEqual((await collection(owner, "/api/processes", "processes")).find((item) => item.id === process.id)?._count, { tasks: 0, documents: 0 });
  await expect(owner, `/api/patients/${patient.id}`, 204, "DELETE");
  await expect(owner, `/api/patients/${patient.id}`, 404);
  await expect(owner, `/api/processes/${process.id}`, 204, "DELETE");
  await expect(owner, `/api/processes/${process.id}`, 404);
  console.log("PASS deletes, 204 bodies, repeated 404s and zero relation counts");

  const memberVerified = await memberChecks();
  // Cleanup happens while OWNER sessions are still valid; synthetic auth/workspace rows intentionally remain.
  await clean();
  await signout(owner);
  await signout(other);
  if (!memberVerified) throw new Error(`Core regression passed (${checks} checks); MEMBER coverage requires API_TEST_MEMBER_EMAIL and API_TEST_MEMBER_PASSWORD for an isolated seeded MEMBER fixture. No full-suite success claimed.`);
  console.log(`PASS API regression (${checks} checks), including MEMBER admin-operation denial. Synthetic account/workspace fixtures remain.`);
}

async function clean() {
  for (const item of cleanup.splice(0).reverse()) {
    const result = await item.client.request(item.path, "DELETE");
    assert([204, 404].includes(result.status), `Fixture cleanup failed: DELETE ${item.path} returned ${result.status}`);
  }
}

main().catch(async (error: unknown) => {
  try { await clean(); } catch { console.error("Fixture cleanup incomplete; inspect isolated test database."); }
  console.error(error instanceof Error ? error.message : "API regression failed");
  nodeProcess.exitCode = 1;
});
