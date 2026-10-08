import assert from "node:assert/strict";
import test from "node:test";

test("optional AI clients can be imported without purchasing or configuring AI access", async () => {
  delete process.env.OPENAI_API_KEY;
  process.env.DATABASE_URL = "postgres://unused:unused@localhost/unused";
  const audio = await import("../server/integrations/audio/client");
  const image = await import("../server/integrations/image/client");
  await import("../server/integrations/chat/routes");
  assert.throws(() => audio.getOpenAI(), { status: 503 });
  assert.throws(() => image.getOpenAI(), { status: 503 });
});
