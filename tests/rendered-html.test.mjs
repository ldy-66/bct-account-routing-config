import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the two linked account configuration modules", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>BCT 开户权限与报单排序配置<\/title>/i);
  assert.match(html, />互换交易权限</);
  assert.match(html, />报单排序配置</);
  assert.match(html, /沪深（上交所、深交所）/);
  assert.match(html, /模板导入/);
  assert.match(html, /固定生成买、卖两行/);
  assert.doesNotMatch(html, /映射规则/);
  assert.doesNotMatch(html, />交易类型</);
  assert.doesNotMatch(html, />开平标识/);
});

test("derives fixed buy and sell rows per permission product and maps backend code values", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /沪深:\s*\{\s*codeValue:\s*"A股",\s*templateTags:\s*\["SH",\s*"SZ",\s*"SHC",\s*"SZC"\]/);
  assert.match(page, /港股:\s*\{\s*codeValue:\s*"港股",\s*templateTags:\s*\["HZ",\s*"HS",\s*"HK"\]/);
  assert.match(page, /美股:\s*\{\s*codeValue:\s*"美股",\s*templateTags:\s*\["N",\s*"A",\s*"O"\]/);
  assert.match(page, /function expandPermissionRules/);
  assert.match(page, /permissions\.flatMap/);
  assert.match(page, /const allDirections:\s*Direction\[\]\s*=\s*\["买",\s*"卖"\]/);
  assert.match(page, /id:\s*ruleId\(market, product, direction\)/);
  assert.match(page, /routeTemplate:\s*matched\?\.routeName\s*\?\?\s*""/);
  assert.match(page, /normalizeDirection\(row\.direction\)\s*===\s*direction/);
  assert.match(page, /<span className="readonly-value">\{rule\.direction\}<\/span>/);
  assert.match(page, /<option value="">请选择<\/option>/);
  assert.match(page, /tradingMarket:\s*tradingMarketCodeTable\[rule\.market\]\.codeValue/);
  assert.doesNotMatch(page, /ImportDialog|modal-mask|确认导入|匹配状态|映射规则/);
  assert.doesNotMatch(page, /aria-label=\{`\$\{rule\.market\}\$\{rule\.product\}交易方向`\}/);
  assert.match(css, /\.incomplete-row/);
  assert.match(css, /\.template-import-control/);
});
