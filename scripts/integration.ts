const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
let cookie = "";

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json", Origin: baseUrl } : {}), ...(cookie ? { cookie } : {}), ...init?.headers },
  });
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length) cookie = setCookies.map((value) => value.split(";")[0]).join("; ");
  return response;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const anonymous = await request("/api/processes");
  assert(anonymous.status === 401, `Se esperaba 401 anónimo, se recibió ${anonymous.status}`);

  const login = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email: "admin@docli.local", password: "DocliDemo2026!" }),
  });
  assert(login.ok && Boolean(cookie), `Login falló con ${login.status}: ${await login.text()}`);

  const session = await request("/api/auth/get-session");
  const sessionBody = await session.json() as { user?: { email?: string } };
  assert(sessionBody.user?.email === "admin@docli.local", "La sesión no corresponde al usuario demo");

  for (const endpoint of ["/api/processes", "/api/tasks", "/api/documents", "/api/patients", "/api/clinical-histories", "/api/consents", "/api/referrals", "/api/exams", "/api/profile"]) {
    const response = await request(endpoint);
    assert(response.ok, `${endpoint} respondió ${response.status}`);
  }

  const created = await request("/api/processes", {
    method: "POST",
    body: JSON.stringify({ name: "INTEGRATION_TEST_DELETE_ME", steps: ["Verificar API"] }),
  });
  const createdBody = await created.json() as { process?: { id?: string }; error?: string };
  const processId = createdBody.process?.id;
  assert(created.status === 201 && Boolean(processId), `Creación falló: ${createdBody.error ?? created.status}`);
  const removed = await request(`/api/processes/${processId}`, { method: "DELETE" });
  assert(removed.status === 204, `Limpieza falló con ${removed.status}`);
  console.log("Integración OK: 401, login, sesión, lecturas protegidas, creación y limpieza.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
