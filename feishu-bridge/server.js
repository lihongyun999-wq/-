
import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

async function getTenantToken() {
  const resp = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: mustEnv("FEISHU_APP_ID"),
      app_secret: mustEnv("FEISHU_APP_SECRET")
    })
  });
  const data = await resp.json();
  if (!resp.ok || data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`tenant_access_token failed: ${JSON.stringify(data)}`);
  }
  return data.tenant_access_token;
}

async function feishuGet(path, token) {
  const resp = await fetch(`${FEISHU_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!resp.ok || (typeof data.code === "number" && data.code !== 0)) {
    const err = new Error(`Feishu API failed ${resp.status}: ${JSON.stringify(data)}`);
    err.status = resp.status;
    err.feishu = data;
    throw err;
  }
  return data;
}

function extractWikiToken(input) {
  if (!input) return "";
  const s = String(input).trim();
  const m = s.match(/\/wiki\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : s;
}

async function resolveWikiNode(wikiToken, token) {
  return feishuGet(`/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`, token);
}

async function readDocxRaw(documentId, token) {
  return feishuGet(`/docx/v1/documents/${encodeURIComponent(documentId)}/raw_content`, token);
}

async function readDocxBlocks(documentId, token) {
  let pageToken = "";
  const items = [];
  for (let i = 0; i < 20; i++) {
    const qs = new URLSearchParams({ page_size: "500" });
    if (pageToken) qs.set("page_token", pageToken);
    const data = await feishuGet(`/docx/v1/documents/${encodeURIComponent(documentId)}/blocks?${qs.toString()}`, token);
    items.push(...(data?.data?.items || []));
    if (!data?.data?.has_more) break;
    pageToken = data?.data?.page_token || "";
    if (!pageToken) break;
  }
  return items;
}

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "feishu-bridge", time: new Date().toISOString() });
});

app.get("/auth-test", async (req, res) => {
  try {
    const token = await getTenantToken();
    res.json({ ok: true, token_received: !!token, token_prefix: token.slice(0, 6) + "***" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/wiki", async (req, res) => {
  try {
    const wikiToken = extractWikiToken(req.query.url || req.query.token);
    if (!wikiToken) return res.status(400).json({ ok: false, error: "Missing url or token" });

    const token = await getTenantToken();
    const nodeResp = await resolveWikiNode(wikiToken, token);
    const node = nodeResp?.data?.node;
    if (!node) return res.status(502).json({ ok: false, error: "Wiki node not found", raw: nodeResp });

    const result = {
      ok: true,
      wiki_token: wikiToken,
      node: {
        title: node.title,
        obj_type: node.obj_type,
        obj_token: node.obj_token,
        space_id: node.space_id,
        node_token: node.node_token
      }
    };

    if (node.obj_type === "docx") {
      try {
        const raw = await readDocxRaw(node.obj_token, token);
        result.content = raw?.data?.content ?? raw?.data ?? raw;
        result.content_mode = "raw_content";
      } catch (rawErr) {
        const blocks = await readDocxBlocks(node.obj_token, token);
        result.content = blocks;
        result.content_mode = "blocks";
        result.raw_content_error = rawErr.message;
      }
    } else {
      result.note = `Wiki resolved. obj_type=${node.obj_type}. Reader for this type can be added after the first test.`;
    }

    res.json(result);
  } catch (e) {
    res.status(e.status || 500).json({
      ok: false,
      error: e.message,
      feishu: e.feishu || undefined
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`feishu-bridge listening on ${port}`));
