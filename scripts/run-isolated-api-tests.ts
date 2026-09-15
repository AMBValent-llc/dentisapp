import { spawnSync } from "node:child_process";
import { createMemberFixture } from "./test-fixtures";

async function main() {
  const fixture = await createMemberFixture();
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/integration.ts"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: fixture.origin.origin,
      API_TEST_MEMBER_EMAIL: fixture.email,
      API_TEST_MEMBER_PASSWORD: fixture.password,
    },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
