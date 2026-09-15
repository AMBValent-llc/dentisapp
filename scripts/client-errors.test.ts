import assert from "node:assert/strict";
import { test } from "node:test";
import { getLoginError } from "../lib/client-errors";

const invalidCredentialsMessage = "El correo o la contraseña no son correctos.";

test("login failures do not reveal whether an account exists or is verified", () => {
  for (const error of [
    { status: 401, message: "Unauthorized" },
    { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" },
    { code: "USER_NOT_FOUND", message: "User not found" },
    { code: "CREDENTIAL_ACCOUNT_NOT_FOUND", message: "Credential account not found" },
    { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" },
  ]) {
    assert.equal(getLoginError(error), invalidCredentialsMessage);
  }
});

test("login failures retain safe operational guidance for other errors", () => {
  assert.equal(
    getLoginError({ code: "TOO_MANY_REQUESTS", message: "Too many requests" }),
    "Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo.",
  );
  assert.equal(
    getLoginError({ code: "INVALID_ORIGIN", message: "Invalid origin" }),
    "No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.",
  );
  assert.equal(
    getLoginError(undefined),
    "No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.",
  );
});
