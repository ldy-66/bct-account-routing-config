"use client";

import { useEffect, useMemo, useState } from "react";

type Market = "沪深" | "港股" | "美股";
type Product = "股票" | "ETF" | "可转债";
type ContractType = "股票" | "公募基金" | "可转债" | "期货" | "指数期货";
type Direction = "买" | "卖";

type Permission = {
  id: number;
  market: Market;
  products: Product[];
};

type Rule = {
  id: number;
  market: Market | "";
  product: Product | "";
  routeTemplate: string;
  direction: Direction;
};

type TemplateRow = {
  businessType: "普通交易" | "融券交易";
  contractType: ContractType;
  exchanges: string[];
  direction: "买入" | "卖出" | "买开" | "卖平" | "开仓";
  routeName: string;
};

type SourceTemplate = {
  name: string;
  remark: string;
  rows: TemplateRow[];
};

type ImportIssue = {
  source: string;
  reason: string;
  kind: "permission" | "unsupported";
};

type ImportAnalysis = {
  preview: Rule[];
  issues: ImportIssue[];
  status: "success" | "warning" | "error";
  sourceRowCount: number;
};

const allMarkets: Market[] = ["沪深", "港股", "美股"];
const allProducts: Product[] = ["股票", "ETF", "可转债"];
const routeTemplates = ["默认模板", "test1", "test2", "买单模板", "卖单模板"];
const marketExchangeMap: Record<Market, string[]> = {
  沪深: ["上交所", "深交所"],
  港股: ["香港交易所", "深港通", "沪股通"],
  美股: ["美国证券交易所", "纽约证券交易所"],
};
const productContractMap: Record<Product, ContractType> = {
  股票: "股票",
  ETF: "公募基金",
  可转债: "可转债",
};
const marketLabel = (market: Market) => `${market}（${marketExchangeMap[market].join("、")}）`;
const productLabel = (product: Product) => `${product}（${productContractMap[product]}）`;

const sourceTemplates: SourceTemplate[] = [
  {
    name: "默认模板",
    remark: "通用",
    rows: [
      { businessType: "普通交易", contractType: "股票", exchanges: ["深交所", "上交所", "深港通", "沪股通"], direction: "买入", routeName: "test1" },
      { businessType: "普通交易", contractType: "期货", exchanges: ["大连商品交易所", "上海期货交易所"], direction: "买开", routeName: "test1" },
      { businessType: "融券交易", contractType: "股票", exchanges: ["深交所", "上交所", "香港交易所", "深港通", "沪股通"], direction: "开仓", routeName: "默认模板" },
    ],
  },
  {
    name: "test",
    remark: "5413",
    rows: [
      { businessType: "普通交易", contractType: "股票", exchanges: ["美国证券交易所", "纽约证券交易所"], direction: "买入", routeName: "默认模板" },
      { businessType: "普通交易", contractType: "股票", exchanges: ["深交所", "上交所"], direction: "买入", routeName: "默认模板" },
      { businessType: "普通交易", contractType: "可转债", exchanges: ["深交所", "上交所"], direction: "卖出", routeName: "test2" },
    ],
  },
];

const defaultPermissions: Permission[] = [
  { id: 1, market: "沪深", products: ["股票", "ETF", "可转债"] },
  { id: 2, market: "港股", products: ["股票", "ETF"] },
];
const defaultRules: Rule[] = [
  { id: 1, market: "沪深", product: "股票", routeTemplate: "买单模板", direction: "买" },
  { id: 2, market: "港股", product: "股票", routeTemplate: "卖单模板", direction: "卖" },
];

const storageKey = "bct-account-permission-routing-v2";
const makeId = () => Date.now() + Math.floor(Math.random() * 10000);
const normalizeDirection = (direction: TemplateRow["direction"]): Direction => direction === "卖出" || direction === "卖平" ? "卖" : "买";

export default function Home() {
  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);
  const [rules, setRules] = useState<Rule[]>(defaultRules);
  const [importOpen, setImportOpen] = useState(false);
  const [openProductId, setOpenProductId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(sourceTemplates[0].name);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { permissions?: Permission[]; rules?: Rule[] };
      // 浏览器存储只能在挂载后读取，此处恢复用户上次保存的本地配置。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(parsed.permissions)) setPermissions(parsed.permissions);
      if (Array.isArray(parsed.rules)) setRules(parsed.rules);
    } catch {
      // 本地数据异常时继续使用示例配置。
    }
  }, []);

  useEffect(() => {
    const closeProductSelect = (event: PointerEvent) => {
      if (!(event.target as Element).closest(".product-select")) setOpenProductId(null);
    };
    document.addEventListener("pointerdown", closeProductSelect);
    return () => document.removeEventListener("pointerdown", closeProductSelect);
  }, []);

  const unusedMarkets = useMemo(
    () => allMarkets.filter((market) => !permissions.some((permission) => permission.market === market)),
    [permissions],
  );

  const currentTemplate = sourceTemplates.find((template) => template.name === selectedTemplate) ?? sourceTemplates[0];

  const importAnalysis = useMemo<ImportAnalysis>(() => {
    const imported: Rule[] = [];
    const issues: ImportIssue[] = [];
    currentTemplate.rows.forEach((row, rowIndex) => {
      const source = `第 ${rowIndex + 1} 行：${row.businessType} / ${row.contractType} / ${row.exchanges.join("、")}`;
      if (row.businessType !== "普通交易") {
        issues.push({ source, reason: "当前开户仅支持普通交易", kind: "unsupported" });
        return;
      }
      if (row.contractType === "期货" || row.contractType === "指数期货") {
        issues.push({ source, reason: "当前民营券商业务不支持期货", kind: "unsupported" });
        return;
      }
      const product = allProducts.find((item) => productContractMap[item] === row.contractType);
      if (!product) {
        issues.push({ source, reason: `合约类型“${row.contractType}”没有开户品种映射`, kind: "unsupported" });
        return;
      }
      const candidateMarkets = allMarkets.filter((market) => row.exchanges.some((exchange) => marketExchangeMap[market].includes(exchange)));
      if (!candidateMarkets.length) {
        issues.push({ source, reason: "模板交易所没有对应的开户股票市场", kind: "unsupported" });
        return;
      }
      candidateMarkets.forEach((market) => {
        const permission = permissions.find((item) => item.market === market);
        if (!permission) {
          issues.push({ source: `${marketLabel(market)} / ${productLabel(product)}`, reason: `账户未开通${market}市场权限`, kind: "permission" });
          return;
        }
        if (!permission.products.includes(product)) {
          issues.push({ source: `${marketLabel(market)} / ${productLabel(product)}`, reason: `${market}市场未开通${product}品种`, kind: "permission" });
          return;
        }
        imported.push({
          id: makeId() + imported.length,
          market,
          product,
          routeTemplate: row.routeName,
          direction: normalizeDirection(row.direction),
        });
      });
    });
    return {
      preview: imported,
      issues,
      status: imported.length === 0 ? "error" : issues.length ? "warning" : "success",
      sourceRowCount: currentTemplate.rows.length,
    };
  }, [currentTemplate, permissions]);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const syncRulesForPermissions = (nextPermissions: Permission[]) => {
    setRules((current) => current.map((rule) => {
      const permission = nextPermissions.find((item) => item.market === rule.market);
      if (permission?.products.includes(rule.product as Product)) return rule;
      const fallbackPermission = permission ?? nextPermissions[0];
      return {
        ...rule,
        market: fallbackPermission?.market ?? "",
        product: fallbackPermission?.products[0] ?? "",
      };
    }));
  };

  const updateMarket = (id: number, market: Market) => {
    const previous = permissions.find((permission) => permission.id === id);
    const next = permissions.map((permission) => permission.id === id ? { ...permission, market } : permission);
    setPermissions(next);
    setRules((current) => current.map((rule) => {
      if (rule.market === previous?.market) {
        const changedPermission = next.find((permission) => permission.id === id);
        return {
          ...rule,
          market,
          product: changedPermission?.products.includes(rule.product as Product) ? rule.product : changedPermission?.products[0] ?? "",
        };
      }
      const permission = next.find((item) => item.market === rule.market);
      if (permission?.products.includes(rule.product as Product)) return rule;
      const fallback = permission ?? next[0];
      return { ...rule, market: fallback?.market ?? "", product: fallback?.products[0] ?? "" };
    }));
  };

  const updateProducts = (id: number, product: Product, checked: boolean) => {
    const next = permissions.map((permission) => permission.id === id
      ? { ...permission, products: checked ? [...permission.products, product] : permission.products.filter((item) => item !== product) }
      : permission,
    );
    setPermissions(next);
    syncRulesForPermissions(next);
  };

  const addPermission = () => {
    if (!unusedMarkets.length) return;
    setPermissions([...permissions, { id: makeId(), market: unusedMarkets[0], products: ["股票"] }]);
  };

  const deletePermission = (id: number) => {
    const next = permissions.filter((permission) => permission.id !== id);
    setPermissions(next);
    syncRulesForPermissions(next);
  };

  const updateRule = (id: number, patch: Partial<Rule>) => setRules(rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));

  const changeRuleMarket = (rule: Rule, market: Market) => {
    const permission = permissions.find((item) => item.market === market);
    updateRule(rule.id, { market, product: permission?.products[0] ?? "" });
  };

  const addRule = () => setRules([...rules, {
    id: makeId(),
    market: permissions[0]?.market ?? "",
    product: permissions[0]?.products[0] ?? "",
    routeTemplate: "默认模板",
    direction: "买",
  }]);

  const importTemplate = () => {
    setRules(importAnalysis.preview);
    setImportOpen(false);
    flash(`已从“${currentTemplate.name}”导入 ${importAnalysis.preview.length} 条匹配规则`);
  };

  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify({ permissions, rules }));
    flash("开户权限与报单排序配置已保存");
  };

  return (
    <main className="config-page">
      <section className="config-module" aria-labelledby="permission-title">
        <header className="module-header">
          <h1 id="permission-title">互换交易权限</h1>
          <button className="primary-button" onClick={addPermission} disabled={!unusedMarkets.length}>新增</button>
        </header>
        <div className="table-wrap permission-table-wrap">
          <table className="permission-table">
            <thead><tr><th>市场</th><th>品种</th><th>操作</th></tr></thead>
            <tbody>
              {permissions.map((permission, index) => (
                <tr key={permission.id}>
                  <td><select aria-label={`第 ${index + 1} 行市场`} value={permission.market} onChange={(event) => updateMarket(permission.id, event.target.value as Market)}>{allMarkets.filter((market) => market === permission.market || !permissions.some((item) => item.market === market)).map((market) => <option key={market} value={market}>{marketLabel(market)}</option>)}</select></td>
                  <td><ProductSelect permission={permission} open={openProductId === permission.id} onToggle={() => setOpenProductId(openProductId === permission.id ? null : permission.id)} onChange={(product, checked) => updateProducts(permission.id, product, checked)} /></td>
                  <td className="actions"><button onClick={() => deletePermission(permission.id)}>删除</button></td>
                </tr>
              ))}
              {!permissions.length && <tr><td colSpan={3} className="empty-cell">暂未配置股票市场权限</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="count-line">共 {permissions.length} 项</p>
      </section>

      <section className="config-module" aria-labelledby="routing-title">
        <header className="module-header routing-header">
          <div><h2 id="routing-title">报单排序配置</h2><p>仅配置开户应用；模板配置保持只读，不会被修改</p></div>
          <button className="secondary-button" onClick={() => setImportOpen(true)}>模板导入</button>
        </header>
        <div className="table-wrap">
          <table className="rule-table">
            <thead><tr><th><em>*</em> 股票市场</th><th><em>*</em> 品种</th><th><em>*</em> 报单排序模板</th><th><em>*</em> 交易方向</th><th>操作</th></tr></thead>
            <tbody>
              {rules.map((rule) => {
                const permission = permissions.find((item) => item.market === rule.market);
                return <tr key={rule.id}>
                  <td><select aria-label="股票市场" value={rule.market} disabled={!permissions.length} onChange={(event) => changeRuleMarket(rule, event.target.value as Market)}>{!permissions.length && <option value="">请先配置上方权限</option>}{permissions.map((item) => <option key={item.market} value={item.market}>{marketLabel(item.market)}</option>)}</select></td>
                  <td><select aria-label="品种" value={rule.product} disabled={!permission?.products.length} onChange={(event) => updateRule(rule.id, { product: event.target.value as Product })}>{!permission?.products.length && <option value="">请先配置该市场品种</option>}{permission?.products.map((product) => <option key={product} value={product}>{productLabel(product)}</option>)}</select></td>
                  <td><select aria-label="报单排序模板" value={rule.routeTemplate} onChange={(event) => updateRule(rule.id, { routeTemplate: event.target.value })}>{[...new Set([...routeTemplates, rule.routeTemplate])].map((template) => <option key={template}>{template}</option>)}</select></td>
                  <td><select aria-label="交易方向" value={rule.direction} onChange={(event) => updateRule(rule.id, { direction: event.target.value as Direction })}><option>买</option><option>卖</option></select></td>
                  <td className="actions"><button onClick={() => setRules(rules.filter((item) => item.id !== rule.id))}>删除</button></td>
                </tr>;
              })}
              {!rules.length && <tr><td colSpan={5} className="empty-cell">暂无报单排序配置</td></tr>}
            </tbody>
          </table>
        </div>
        <button className="add-row" onClick={addRule}>新增一行</button>
      </section>

      <footer className="page-footer"><button className="save-button" onClick={save}>保存</button></footer>
      {importOpen && <ImportDialog selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} analysis={importAnalysis} onCancel={() => setImportOpen(false)} onImport={importTemplate} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function ProductSelect({ permission, open, onToggle, onChange }: { permission: Permission; open: boolean; onToggle: () => void; onChange: (product: Product, checked: boolean) => void }) {
  return <div className={`product-select${open ? " open" : ""}`}>
    <button type="button" className="product-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={onToggle}>{permission.products.length ? <><span>{productLabel(permission.products[0])}</span>{permission.products.length > 1 && <b>+{permission.products.length - 1}</b>}</> : <span className="placeholder">请选择</span>}</button>
    {open && <div className="product-options" role="listbox">{allProducts.map((product) => <label key={product}><input type="checkbox" checked={permission.products.includes(product)} onChange={(event) => onChange(product, event.target.checked)} /><span>{productLabel(product)}</span></label>)}</div>}
  </div>;
}

function ImportDialog({ selectedTemplate, setSelectedTemplate, analysis, onCancel, onImport }: { selectedTemplate: string; setSelectedTemplate: (name: string) => void; analysis: ImportAnalysis; onCancel: () => void; onImport: () => void }) {
  const statusCopy = analysis.status === "success"
    ? `模板配置 ${analysis.sourceRowCount} 行均可匹配，将生成 ${analysis.preview.length} 条开户规则。`
    : analysis.status === "warning"
      ? `模板配置 ${analysis.sourceRowCount} 行，将生成 ${analysis.preview.length} 条开户规则；${analysis.issues.length} 项因权限不匹配或业务不支持而跳过。`
      : "当前模板没有符合账户交易权限的报单排序规则，请更换模板或先调整交易权限。";
  return <div className="modal-mask" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <header className="dialog-titlebar"><div><h2 id="import-title">从模板配置导入</h2><p>模板配置为只读数据，本操作只更新当前账户的报单排序配置</p></div><button aria-label="关闭" onClick={onCancel}>×</button></header>
      <div className="dialog-content">
        <div className="template-row">
          <label className="template-field"><span>选择模板</span><select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}>{sourceTemplates.map((item) => <option key={item.name} value={item.name}>{item.name}（{item.remark}）</option>)}</select></label>
          <a className="mapping-download" href="/template-import-mapping-guide.docx" download="报单排序模板导入映射规则.docx">下载《模板导入映射规则》</a>
        </div>

        <div className={`import-status ${analysis.status}`} role={analysis.status === "error" ? "alert" : "status"}>
          <b>{analysis.status === "success" ? "全部匹配" : analysis.status === "warning" ? "部分匹配" : "无法导入"}</b>
          <span>{statusCopy}</span>
        </div>

        <div className="import-summary" aria-label="导入校验摘要">
          <span><b>{analysis.sourceRowCount}</b> 模板配置</span>
          <span><b>{analysis.preview.length}</b> 可导入规则</span>
          <span><b>{analysis.issues.length}</b> 跳过项</span>
        </div>

        {!!analysis.issues.length && <details className="issue-details">
          <summary>查看 {analysis.issues.length} 项未导入原因</summary>
          <ul>{analysis.issues.map((issue, index) => <li key={`${issue.source}-${index}`}><span>{issue.source}</span><b>{issue.reason}</b></li>)}</ul>
        </details>}
      </div>
      <footer className="dialog-footer"><span>{analysis.preview.length ? "确认后将使用匹配结果覆盖下方当前配置" : "请更换模板或调整上方交易权限"}</span><button className="secondary-button" onClick={onCancel}>取消</button><button className="save-button" disabled={!analysis.preview.length} onClick={onImport}>{analysis.status === "warning" ? `仅导入 ${analysis.preview.length} 条匹配规则` : analysis.preview.length ? `确认导入 ${analysis.preview.length} 条` : "无可导入规则"}</button></footer>
    </section>
  </div>;
}
