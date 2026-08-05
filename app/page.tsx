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
  const [selectedTemplate, setSelectedTemplate] = useState(sourceTemplates[0].name);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { permissions?: Permission[]; rules?: Rule[] };
      if (Array.isArray(parsed.permissions)) setPermissions(parsed.permissions);
      if (Array.isArray(parsed.rules)) setRules(parsed.rules);
    } catch {
      // 本地数据异常时继续使用示例配置。
    }
  }, []);

  const unusedMarkets = useMemo(
    () => allMarkets.filter((market) => !permissions.some((permission) => permission.market === market)),
    [permissions],
  );

  const currentTemplate = sourceTemplates.find((template) => template.name === selectedTemplate) ?? sourceTemplates[0];

  const importPreview = useMemo(() => {
    const imported: Rule[] = [];
    permissions.forEach((permission) => {
      permission.products.forEach((product) => {
        const exchanges = marketExchangeMap[permission.market];
        currentTemplate.rows
          .filter((row) => row.businessType === "普通交易")
          .filter((row) => row.contractType === productContractMap[product])
          .filter((row) => row.exchanges.some((exchange) => exchanges.includes(exchange)))
          .forEach((row) => imported.push({
            id: makeId() + imported.length,
            market: permission.market,
            product,
            routeTemplate: row.routeName,
            direction: normalizeDirection(row.direction),
          }));
      });
    });
    return imported;
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
    setRules(importPreview);
    setImportOpen(false);
    flash(`已从“${currentTemplate.name}”导入 ${importPreview.length} 条匹配规则`);
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
        <div className="table-wrap">
          <table className="permission-table">
            <thead><tr><th>市场</th><th>品种</th><th>操作</th></tr></thead>
            <tbody>
              {permissions.map((permission, index) => (
                <tr key={permission.id}>
                  <td><select aria-label={`第 ${index + 1} 行市场`} value={permission.market} onChange={(event) => updateMarket(permission.id, event.target.value as Market)}>{allMarkets.filter((market) => market === permission.market || !permissions.some((item) => item.market === market)).map((market) => <option key={market}>{market}</option>)}</select></td>
                  <td><ProductSelect permission={permission} onChange={(product, checked) => updateProducts(permission.id, product, checked)} /></td>
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
                  <td><select aria-label="股票市场" value={rule.market} disabled={!permissions.length} onChange={(event) => changeRuleMarket(rule, event.target.value as Market)}>{!permissions.length && <option value="">请先配置上方权限</option>}{permissions.map((item) => <option key={item.market}>{item.market}</option>)}</select></td>
                  <td><select aria-label="品种" value={rule.product} disabled={!permission?.products.length} onChange={(event) => updateRule(rule.id, { product: event.target.value as Product })}>{!permission?.products.length && <option value="">请先配置该市场品种</option>}{permission?.products.map((product) => <option key={product}>{product}</option>)}</select></td>
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
      {importOpen && <ImportDialog permissions={permissions} template={currentTemplate} selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} preview={importPreview} onCancel={() => setImportOpen(false)} onImport={importTemplate} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function ProductSelect({ permission, onChange }: { permission: Permission; onChange: (product: Product, checked: boolean) => void }) {
  return <details className="product-select">
    <summary>{permission.products.length ? <><span>{permission.products[0]}</span>{permission.products.length > 1 && <b>+{permission.products.length - 1}</b>}</> : <span className="placeholder">请选择</span>}</summary>
    <div className="product-options">{allProducts.map((product) => <label key={product}><input type="checkbox" checked={permission.products.includes(product)} onChange={(event) => onChange(product, event.target.checked)} /><span>{product}</span></label>)}</div>
  </details>;
}

function ImportDialog({ permissions, template, selectedTemplate, setSelectedTemplate, preview, onCancel, onImport }: { permissions: Permission[]; template: SourceTemplate; selectedTemplate: string; setSelectedTemplate: (name: string) => void; preview: Rule[]; onCancel: () => void; onImport: () => void }) {
  return <div className="modal-mask" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <header className="dialog-titlebar"><div><h2 id="import-title">从模板配置导入</h2><p>模板配置为只读数据，本操作只更新当前账户的报单排序配置</p></div><button aria-label="关闭" onClick={onCancel}>×</button></header>
      <div className="dialog-content">
        <label className="template-field"><span>选择模板</span><select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}>{sourceTemplates.map((item) => <option key={item.name} value={item.name}>{item.name}（{item.remark}）</option>)}</select></label>

        <h3>自动映射关系</h3>
        <div className="mapping-grid">
          <div className="mapping-card"><b>股票市场 → 交易所</b>{permissions.map((permission) => <p key={permission.id}><span>{permission.market}</span><i>→</i><em>{marketExchangeMap[permission.market].join("、")}</em></p>)}</div>
          <div className="mapping-card"><b>品种 → 合约类型</b>{allProducts.map((product) => <p key={product}><span>{product}</span><i>→</i><em>{productContractMap[product]}</em></p>)}</div>
        </div>

        <div className="preview-heading"><h3>匹配结果</h3><span>已排除期货及非普通交易，共 {preview.length} 条</span></div>
        <div className="table-wrap preview-table-wrap">
          <table className="preview-table">
            <thead><tr><th>股票市场</th><th>品种</th><th>模板内交易所</th><th>顺序名称</th><th>交易方向</th></tr></thead>
            <tbody>{preview.map((rule) => <tr key={rule.id}><td>{rule.market}</td><td>{rule.product}</td><td>{marketExchangeMap[rule.market as Market].join("、")}</td><td>{rule.routeTemplate}</td><td>{rule.direction}</td></tr>)}{!preview.length && <tr><td colSpan={5} className="empty-cell">当前权限与该模板没有可导入的匹配项</td></tr>}</tbody>
          </table>
        </div>
      </div>
      <footer className="dialog-footer"><span>确认后将使用匹配结果覆盖下方当前配置</span><button className="secondary-button" onClick={onCancel}>取消</button><button className="save-button" disabled={!preview.length} onClick={onImport}>确认导入</button></footer>
    </section>
  </div>;
}
