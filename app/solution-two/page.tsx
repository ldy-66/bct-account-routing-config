"use client";

import { useMemo, useState } from "react";

type Market = "沪深" | "港股" | "美股";
type Product = "股票" | "ETF" | "可转债";
type Direction = "买" | "卖";

type Permission = {
  id: number;
  market: Market;
  products: Product[];
};

type Rule = {
  id: string;
  market: Market;
  product: Product;
  direction: Direction;
  routeTemplate: string;
};

type RuleGroup = {
  id: string;
  market: Market;
  product: Product;
  buy: Rule;
  sell: Rule;
};

type SourceTemplate = {
  name: string;
  remark: string;
  rows: Array<{ market: Market; product: Product; direction: Direction; routeTemplate: string }>;
};

const allMarkets: Market[] = ["沪深", "港股", "美股"];
const allProducts: Product[] = ["股票", "ETF", "可转债"];
const allDirections: Direction[] = ["买", "卖"];
const routeTemplates = ["全局模板", "默认模板", "test1", "test2", "买单模板", "卖单模板"];
const defaultPermissions: Permission[] = [{ id: 1, market: "沪深", products: ["股票", "ETF"] }];

const sourceTemplates: SourceTemplate[] = [
  {
    name: "默认模板",
    remark: "通用",
    rows: [
      { market: "沪深", product: "股票", direction: "买", routeTemplate: "test1" },
      { market: "沪深", product: "股票", direction: "卖", routeTemplate: "卖单模板" },
      { market: "港股", product: "股票", direction: "卖", routeTemplate: "卖单模板" },
    ],
  },
  {
    name: "test",
    remark: "5413",
    rows: [
      { market: "沪深", product: "股票", direction: "买", routeTemplate: "默认模板" },
      { market: "沪深", product: "可转债", direction: "卖", routeTemplate: "test2" },
      { market: "美股", product: "股票", direction: "买", routeTemplate: "默认模板" },
    ],
  },
  {
    name: "股票与ETF模板",
    remark: "沪深/港股",
    rows: ["股票", "ETF"].flatMap((product) =>
      ["沪深", "港股"].flatMap((market) =>
        allDirections.map((direction) => ({
          market: market as Market,
          product: product as Product,
          direction,
          routeTemplate: direction === "买" ? "买单模板" : "卖单模板",
        })),
      ),
    ),
  },
];

const ruleId = (market: Market, product: Product, direction: Direction) => `${market}-${product}-${direction}`;
const makeId = () => Date.now() + Math.floor(Math.random() * 10000);

function rulesFromPermissions(permissions: Permission[], current: Rule[] = []) {
  const currentMap = new Map(current.map((rule) => [rule.id, rule]));
  return permissions.flatMap((permission) =>
    allProducts
      .filter((product) => permission.products.includes(product))
      .flatMap((product) => allDirections.map((direction) => {
        const id = ruleId(permission.market, product, direction);
        return currentMap.get(id) ?? { id, market: permission.market, product, direction, routeTemplate: "全局模板" };
      })),
  );
}

export default function SolutionTwo() {
  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);
  const [rules, setRules] = useState<Rule[]>(() => rulesFromPermissions(defaultPermissions));
  const [customMode, setCustomMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [validationRuleIds, setValidationRuleIds] = useState<string[]>([]);
  const [openProductId, setOpenProductId] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const unusedMarkets = useMemo(
    () => allMarkets.filter((market) => !permissions.some((permission) => permission.market === market)),
    [permissions],
  );

  const ruleGroups = useMemo<RuleGroup[]>(() => {
    const map = new Map(rules.map((rule) => [rule.id, rule]));
    return permissions.flatMap((permission) => permission.products.flatMap((product) => {
      const buy = map.get(ruleId(permission.market, product, "买"));
      const sell = map.get(ruleId(permission.market, product, "卖"));
      return buy && sell ? [{ id: `${permission.market}-${product}`, market: permission.market, product, buy, sell }] : [];
    }));
  }, [permissions, rules]);

  const validationRules = rules.filter((rule) => validationRuleIds.includes(rule.id));

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const syncPermissions = (nextPermissions: Permission[]) => {
    setPermissions(nextPermissions);
    setRules((current) => rulesFromPermissions(nextPermissions, current));
    setValidationRuleIds([]);
  };

  const updateMarket = (id: number, market: Market) => {
    syncPermissions(permissions.map((permission) => permission.id === id ? { ...permission, market } : permission));
  };

  const updateProducts = (id: number, product: Product, checked: boolean) => {
    syncPermissions(permissions.map((permission) => permission.id === id
      ? { ...permission, products: checked ? [...permission.products, product] : permission.products.filter((item) => item !== product) }
      : permission));
  };

  const addPermission = () => {
    if (unusedMarkets.length) syncPermissions([...permissions, { id: makeId(), market: unusedMarkets[0], products: ["股票"] }]);
  };

  const setMode = (custom: boolean) => {
    setCustomMode(custom);
    setValidationRuleIds([]);
    if (!custom) {
      setSelectedTemplate("");
      setRules((current) => current.map((rule) => ({ ...rule, routeTemplate: "全局模板" })));
      flash("已恢复为全局模板");
    }
  };

  const importTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    setValidationRuleIds([]);
    if (!templateName) {
      setRules((current) => current.map((rule) => ({ ...rule, routeTemplate: "全局模板" })));
      flash("已恢复为全局模板");
      return;
    }
    const template = sourceTemplates.find((item) => item.name === templateName);
    const next = rules.map((rule) => ({
      ...rule,
      routeTemplate: template?.rows.find((row) => row.market === rule.market && row.product === rule.product && row.direction === rule.direction)?.routeTemplate ?? "",
    }));
    setRules(next);
    const emptyCount = next.filter((rule) => !rule.routeTemplate).length;
    flash(emptyCount ? `已匹配模板，${emptyCount} 个方向需手工补充` : `已按“${templateName}”完成全部匹配`);
  };

  const updateRule = (id: string, routeTemplate: string) => {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, routeTemplate } : rule));
    if (routeTemplate) setValidationRuleIds((current) => current.filter((item) => item !== id));
  };

  const save = () => {
    const incomplete = customMode ? rules.filter((rule) => !rule.routeTemplate) : [];
    if (incomplete.length) {
      setValidationRuleIds(incomplete.map((rule) => rule.id));
      return;
    }
    setValidationRuleIds([]);
    flash(customMode ? `已保存 ${rules.length} 条自定义配置` : "已使用全局模板完成配置");
  };

  return (
    <main className="config-page solution-two-page">
      <section className="config-module" aria-labelledby="permission-title-two">
        <header className="module-header">
          <h1 id="permission-title-two">互换交易权限</h1>
          <button className="primary-button" onClick={addPermission} disabled={!unusedMarkets.length}>新增</button>
        </header>
        <div className="table-wrap permission-table-wrap">
          <table className="permission-table">
            <thead><tr><th>市场</th><th>品种</th><th>操作</th></tr></thead>
            <tbody>
              {permissions.map((permission, index) => <tr key={permission.id}>
                <td><select aria-label={`第 ${index + 1} 行市场`} value={permission.market} onChange={(event) => updateMarket(permission.id, event.target.value as Market)}>{allMarkets.filter((market) => market === permission.market || !permissions.some((item) => item.market === market)).map((market) => <option key={market}>{market}</option>)}</select></td>
                <td><ProductSelector permission={permission} open={openProductId === permission.id} onToggle={() => setOpenProductId(openProductId === permission.id ? null : permission.id)} onChange={(product, checked) => updateProducts(permission.id, product, checked)} /></td>
                <td className="actions"><button onClick={() => syncPermissions(permissions.filter((item) => item.id !== permission.id))}>删除</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <p className="count-line">共 {permissions.length} 项市场权限</p>
      </section>

      <section className="config-module" aria-labelledby="routing-title-two">
        <header className="module-header routing-header">
          <div><h2 id="routing-title-two">互换交易设置</h2><p>{customMode ? "按市场、品种分别配置买卖方向模板" : "默认沿用全局模板，特殊账户可切换为自定义模板"}</p></div>
          <div className="routing-controls">
            {validationRules.length > 0 && <span className="validation-summary" role="alert">该品种不能为空（{validationRules.length}条）</span>}
            <div className="template-mode-switch" aria-label="模板配置方式">
              <button type="button" className={!customMode ? "active" : ""} aria-pressed={!customMode} onClick={() => setMode(false)}>全局模板</button>
              <button type="button" className={customMode ? "active" : ""} aria-pressed={customMode} onClick={() => setMode(true)}>自定义模板</button>
            </div>
            {customMode && <div className="template-import-control">
              <label htmlFor="source-template-two">模板导入</label>
              <select id="source-template-two" value={selectedTemplate} onChange={(event) => importTemplate(event.target.value)}><option value="">不导入（使用全局模板）</option>{sourceTemplates.map((item) => <option key={item.name} value={item.name}>{item.name}（{item.remark}）</option>)}</select>
            </div>}
          </div>
        </header>
        {customMode ? <>
          <div className="table-wrap">
            <table className="rule-table">
              <thead><tr><th>股票市场</th><th>品种</th><th><em>*</em> 买方向模板</th><th><em>*</em> 卖方向模板</th></tr></thead>
              <tbody>{ruleGroups.map((group) => <tr key={group.id} className={validationRuleIds.includes(group.buy.id) || validationRuleIds.includes(group.sell.id) ? "validation-row" : undefined}>
                <td>{group.market}</td><td>{group.product}</td>
                <td><select aria-label={`${group.market}${group.product}买方向模板`} value={group.buy.routeTemplate} onChange={(event) => updateRule(group.buy.id, event.target.value)}><option value="">请选择</option>{routeTemplates.map((template) => <option key={template}>{template}</option>)}</select></td>
                <td><select aria-label={`${group.market}${group.product}卖方向模板`} value={group.sell.routeTemplate} onChange={(event) => updateRule(group.sell.id, event.target.value)}><option value="">请选择</option>{routeTemplates.map((template) => <option key={template}>{template}</option>)}</select></td>
              </tr>)}</tbody>
            </table>
          </div>
          <p className="count-line">共 {ruleGroups.length} 个市场品种组合，当前使用自定义配置</p>
        </> : <div className="global-template-summary" role="status"><span>报单排序模板</span><strong>全局模板</strong></div>}
      </section>

      <footer className="page-footer"><button className="save-button" onClick={save}>保存</button></footer>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function ProductSelector({ permission, open, onToggle, onChange }: { permission: Permission; open: boolean; onToggle: () => void; onChange: (product: Product, checked: boolean) => void }) {
  return <div className={`product-select${open ? " open" : ""}`}>
    <button type="button" className="product-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={onToggle}>{permission.products.length ? <><span>{permission.products[0]}</span>{permission.products.length > 1 && <b>+{permission.products.length - 1}</b>}</> : <span className="placeholder">请选择</span>}</button>
    {open && <div className="product-options" role="listbox">{allProducts.map((product) => <label key={product}><input type="checkbox" checked={permission.products.includes(product)} onChange={(event) => onChange(product, event.target.checked)} /><span>{product}</span></label>)}</div>}
  </div>;
}
