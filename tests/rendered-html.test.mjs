import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the two account configuration modules", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>BCT 开户权限与报单排序配置<\/title>/i);
  assert.match(html, />互换交易权限</);
  assert.match(html, />报单排序配置</);
  assert.match(html, /沪深（上交所、深交所）/);
  assert.match(html, /港股（香港交易所、深港通、沪股通）/);
  assert.match(html, /ETF（公募基金）/);
  assert.match(html, />模板导入</);
  assert.doesNotMatch(html, />交易类型</);
  assert.doesNotMatch(html, />开平标识</);
});

test("implements permission-aware three-state template import", async () => {
  const [page, css, mappingGuide] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/template-import-mapping-guide.docx", import.meta.url)),
  ]);

  assert.match(page, /status:\s*"success"\s*\|\s*"warning"\s*\|\s*"error"/);
  assert.match(page, /全部匹配/);
  assert.match(page, /部分匹配/);
  assert.match(page, /无法导入/);
  assert.match(page, /账户未开通.*市场权限/);
  assert.match(page, /当前民营券商业务不支持期货/);
  assert.match(page, /仅导入.*条匹配规则/);
  assert.match(page, /disabled=\{!analysis\.preview\.length\}/);
  assert.match(css, /\.import-status\.success/);
  assert.match(css, /\.import-status\.warning/);
  assert.match(css, /\.import-status\.error/);
  assert.match(page, /下载《模板导入映射规则》/);
  assert.match(page, /导入校验摘要/);
  assert.doesNotMatch(page, /自动映射关系/);
  assert.doesNotMatch(page, /可导入结果/);
  assert.equal(mappingGuide.subarray(0, 2).toString("ascii"), "PK");
});
