import type supertest from "supertest";

export async function getLoginForm(
  request: ReturnType<typeof supertest>,
  fields: Record<string, string>,
  headers: Record<string, string> = {},
) {
  const { username: _username, password: _password, ...query } = fields;
  const response = await request
    .get("/oauth2/authorize")
    .set(headers)
    .query({ ...query, prompt: "login" });
  if (response.status !== 200)
    throw new Error(`Login form returned ${response.status}`);
  const csrf_token = response.text.match(
    /name="csrf_token" value="([A-Za-z0-9_-]+)"/,
  )?.[1];
  if (!csrf_token) throw new Error("Login form is missing CSRF token");
  const cookie = response.header["set-cookie"]
    .map((value: string) => value.split(";")[0])
    .join("; ");
  return { cookie, csrf_token, response };
}

export async function submitLogin(
  request: ReturnType<typeof supertest>,
  fields: Record<string, string>,
  sessionCookie = "",
  headers: Record<string, string> = {},
) {
  const form = await getLoginForm(request, fields, headers);
  return request
    .post("/oauth2/authorize")
    .set(headers)
    .set("Cookie", [sessionCookie, form.cookie].filter(Boolean).join("; "))
    .type("form")
    .send({ ...fields, csrf_token: form.csrf_token });
}
