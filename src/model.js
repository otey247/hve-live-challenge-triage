// Optional model access, provided by the platform team.
//
// When AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT are
// set, complete() calls that Azure OpenAI deployment. Otherwise the model is
// unavailable and complete() returns null, so every caller must work without it.
// The demo runs fully offline by default.

export function createModel(env = process.env) {
  const endpoint = env.AZURE_OPENAI_ENDPOINT;
  const key = env.AZURE_OPENAI_API_KEY;
  const deployment = env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = env.AZURE_OPENAI_API_VERSION || "2024-10-21";

  if (!endpoint || !key || !deployment) {
    return { available: false, async complete() { return null; } };
  }

  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${apiVersion}`;

  return {
    available: true,
    async complete(messages) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "api-key": key, "content-type": "application/json" },
          body: JSON.stringify({ messages, temperature: 0.2, max_tokens: 400 }),
          signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) return null;
        const body = await res.json();
        return body.choices?.[0]?.message?.content ?? null;
      } catch {
        return null;
      }
    }
  };
}
