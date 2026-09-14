const translations: Array<[RegExp, string]> = [
  [/invalid (email|username) or password|invalid credentials|incorrect password/i, "El correo o la contraseña no son correctos."],
  [/user already exists|already registered|email.*already.*use/i, "Ya existe una cuenta registrada con este correo."],
  [/user not found|account not found/i, "No encontramos una cuenta asociada a este correo."],
  [/password.*too short|password.*at least/i, "La contraseña debe tener al menos 8 caracteres."],
  [/password.*too long/i, "La contraseña supera la longitud permitida."],
  [/email.*invalid|invalid email/i, "Ingresa un correo electrónico válido."],
  [/too many requests|rate limit/i, "Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo."],
  [/failed to fetch|network ?error|load failed/i, "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo."],
  [/session.*expired|invalid session/i, "Tu sesión venció. Inicia sesión nuevamente."],
  [/unauthorized|not authorized/i, "No tienes autorización para realizar esta acción."],
  [/forbidden|insufficient permission/i, "Tu cuenta no tiene permisos suficientes para realizar esta acción."],
];

export function getSpanishError(message: string | null | undefined, fallback: string) {
  if (!message) return fallback;
  const translation = translations.find(([pattern]) => pattern.test(message));
  if (translation) return translation[1];
  const looksEnglish = /\b(the|invalid|failed|error|user|password|email|session|request|account)\b/i.test(message);
  return looksEnglish ? fallback : message;
}

export async function readApiError(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: string };
    return getSpanishError(body.error, fallback);
  } catch {
    return response.status >= 500
      ? "El servidor no pudo completar la operación. Inténtalo nuevamente en unos minutos."
      : fallback;
  }
}
