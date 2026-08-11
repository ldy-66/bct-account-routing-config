import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the linked account configuration modules with compact routing settings", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>BCT 开户权限与报单排序配置<\/title>/i);
  assert.match(html, />互换交易权限</);
  assert.match(html, />互换交易设置</);
  assert.match(html, />沪深</);
  assert.match(html, /模板导入/);
  assert.match(html, /不导入（使用全局模板）/);
  assert.match(html, /买方向模板/);
  assert.match(html, /卖方向模板/);
  assert.match(html, /合并为一行/);
  assert.match(html, /初始使用全局模板/);
  assert.doesNotMatch(html, /批量删除/);
  assert.doesNotMatch(html, /已删除的明细/);
  assert.doesNotMatch(html, /选择全部互换交易设置/);
  assert.doesNotMatch(html, /映射规则/);
  assert.doesNotMatch(html, />交易类型</);
  assert.doesNotMatch(html, />开平标识/);
});

test("server-renders solution two in global-template mode without changing solution one", async () => {
  const response = await render("/solution-two");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, />互换交易权限</);
  assert.match(html, />互换交易设置</);
  assert.match(html, /默认沿用全局模板/);
  assert.match(html, />全局模板</);
  assert.match(html, />自定义模板</);
  assert.match(html, /当前均使用全局模板/);
  assert.doesNotMatch(html, /批量删除/);
  assert.doesNotMatch(html, /买方向模板/);
  assert.doesNotMatch(html, /卖方向模板/);
});

test("solution two reveals the existing detail form only in custom mode", async () => {
  const page = await readFile(new URL("../app/solution-two/page.tsx", import.meta.url), "utf8");

  assert.match(page, /const \[customMode, setCustomMode\] = useState\(false\)/);
  assert.match(page, /setRules\(\(current\) => current\.map\(\(rule\) => \(\{ \.\.\.rule, routeTemplate: "全局模板" \}\)\)\)/);
  assert.match(page, /customMode && <div className="template-import-control">/);
  assert.match(page, /<th><em>\*<\/em> 买方向模板<\/th><th><em>\*<\/em> 卖方向模板<\/th>/);
  assert.match(page, /template\?\.rows\.find/);
  assert.match(page, /routeTemplate: .*\?\? ""/);
  assert.match(page, /该品种不能为空/);
  assert.match(page, /不导入（使用全局模板）/);
});

test("groups buy and sell templates by permission product and preserves import validation", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /const globalRouteTemplate = "全局模板"/);
  assert.match(page, /const routeTemplates = \[globalRouteTemplate/);
  assert.match(page, /applySourceTemplate\(defaultPermissions, ""\)/);
  assert.match(page, /type RuleGroup/);
  assert.match(page, /const ruleGroups = useMemo<RuleGroup\[\]>/);
  assert.match(page, /ruleId\(permission\.market, product, "买"\)/);
  assert.match(page, /ruleId\(permission\.market, product, "卖"\)/);
  assert.match(page, /routeTemplate: matched\?\.routeName \?\? ""/);
  assert.match(page, /normalizeDirection\(row\.direction\) === direction/);
  assert.match(page, /rules\.filter\(\(rule\) => !rule\.routeTemplate\)/);
  assert.match(page, /该品种不能为空/);
  assert.match(page, /setValidationRuleIds\(incomplete\.map/);
  assert.match(page, /validationRuleIds\.includes\(group\.buy\.id\)/);
  assert.match(page, /validationRuleIds\.includes\(group\.sell\.id\)/);
  assert.match(page, /<th>股票市场<\/th><th>品种<\/th><th><em>\*<\/em> 买方向模板<\/th><th><em>\*<\/em> 卖方向模板<\/th>/);
  assert.match(page, /<option value="">不导入（使用全局模板）<\/option>/);
  assert.match(page, /tradingMarket: tradingMarketCodeTable\[rule\.market\]\.codeValue/);
  assert.doesNotMatch(page, /deletedRuleIds|selectedRuleIds|batchDeleteRules/);
  assert.doesNotMatch(page, /ImportDialog|modal-mask|确认导入|匹配状态|映射规则/);
  assert.match(css, /\.validation-summary/);
  assert.match(css, /\.validation-row/);
  assert.match(css, /\.template-import-control/);
  assert.doesNotMatch(css, /\.batch-delete-button|\.selection-cell|\.help-tooltip|\.help-tip/);
});
