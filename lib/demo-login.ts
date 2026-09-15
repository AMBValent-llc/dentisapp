export type DemoLoginCredentials = {
  email: string;
  password: string;
};

export function getDemoLoginCredentials(
  env: Record<string, string | undefined>,
): DemoLoginCredentials | null {
  if (env.NODE_ENV === "production" || env.ENABLE_DEMO_LOGIN !== "true") return null;
  const email = env.DEMO_EMAIL?.trim().toLowerCase();
  const password = env.DEMO_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export function fillDemoLoginCredentials(credentials: DemoLoginCredentials) {
  return { email: credentials.email, password: credentials.password };
}
