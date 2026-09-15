export type DemoLoginCredentials = {
  email: string;
  password: string;
};

function hostname(value?: string) {
  if (!value) return undefined;
  try {
    return new URL(value.includes("://") ? value : `http://${value}`).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function databaseHostname(value?: string) {
  if (!value) return undefined;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function httpsOrigin(value?: string) {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
}

export function getDemoLoginCredentials(
  env: Record<string, string | undefined>,
  requestHost?: string,
): DemoLoginCredentials | null {
  if (env.ENABLE_DEMO_LOGIN !== "true") return null;
  const requestHostname = hostname(requestHost);
  const appEnvironment = env.APP_ENV;
  const local = appEnvironment !== "staging" && env.NODE_ENV !== "production";
  if (local) {
    if (requestHostname && !["localhost", "127.0.0.1", "[::1]"].includes(requestHostname)) return null;
  } else {
    const allowedHostname = hostname(env.DEMO_ALLOWED_HOSTNAME);
    const allowedOrigin = httpsOrigin(env.DEMO_ALLOWED_ORIGIN);
    const authOrigin = httpsOrigin(env.BETTER_AUTH_URL);
    const productionHostname = hostname(env.PRODUCTION_HOSTNAME);
    const targetDatabaseHostname = hostname(env.DATABASE_TARGET_HOST);
    const productionDatabaseHostname = hostname(env.PRODUCTION_DATABASE_HOST);
    const configuredDatabaseHostname = databaseHostname(env.DATABASE_URL);
    if (
      appEnvironment !== "staging" ||
      !requestHostname ||
      !allowedHostname ||
      !productionHostname ||
      requestHostname !== allowedHostname ||
      allowedOrigin !== `https://${allowedHostname}` ||
      authOrigin !== allowedOrigin ||
      allowedHostname === productionHostname ||
      !configuredDatabaseHostname ||
      !productionDatabaseHostname ||
      configuredDatabaseHostname !== targetDatabaseHostname ||
      configuredDatabaseHostname === productionDatabaseHostname
    ) return null;
  }
  const email = env.DEMO_EMAIL?.trim().toLowerCase();
  const password = env.DEMO_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export function fillDemoLoginCredentials(credentials: DemoLoginCredentials) {
  return { email: credentials.email, password: credentials.password };
}
