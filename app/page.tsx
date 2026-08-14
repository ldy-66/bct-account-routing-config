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
  id: string;
  market: Market;
  product: Product;
  routeTemplate: string;
  direction: Direction;
};

type RuleGroup = {
  id: string;
  market: Market;
  product: Product;
  buy: Rule;
  sell: Rule;
};

type TemplateRow = {
  businessType: "普通交易" | "融券交易";
  contractType: ContractType;
  marketTags: string[];
  direction: "买入" | "卖出" | "买开" | "卖平" | "开仓";
  routeName: string;
};

type SourceTemplate = {
  name: string;
  remark: string;
  rows: TemplateRow[];
};

type TradingMarketCode = {
  codeValue: "沪深" | "港股" | "美股";
  templateTags: string[];
};

const allMarkets: Market[] = ["沪深", "港股", "美股"];
const allProducts: Product[] = ["股票", "ETF", "可转债"];
const globalRouteTemplate = "全局模板";
const routeTemplates = [globalRouteTemplate, "默认模板", "test1", "test2", "买单模板", "卖单模板"];
const restrictedInvestmentTemplates = ["默认不可投资范围模板", "港股不可投资范围模板"];

// tradingMarket 码表：页面显示中文市场，接口提交码值；模板侧使用码表标签匹配。
const tradingMarketCodeTable: Record<Market, TradingMarketCode> = {
  沪深: { codeValue: "沪深", templateTags: ["SH", "SZ", "SHC", "SZC"] },
  港股: { codeValue: "港股", templateTags: ["HZ", "HS", "HK"] },
  美股: { codeValue: "美股", templateTags: ["N", "A", "O"] },
};

const productContractMap: Record<Product, ContractType> = {
  股票: "股票",
  ETF: "公募基金",
  可转债: "可转债",
};

const marketLabel = (market: Market) => market;
const productLabel = (product: Product) => `${product}（${productContractMap[product]}）`;
const allDirections: Direction[] = ["买", "卖"];
const ruleId = (market: Market, product: Product, direction: Direction) => `${market}-${product}-${direction}`;
const normalizeDirection = (direction: TemplateRow["direction"]): Direction => direction === "卖出" || direction === "卖平" ? "卖" : "买";

const sourceTemplates: SourceTemplate[] = [
  {
    name: "默认模板",
    remark: "通用",
    rows: [
      { businessType: "普通交易", contractType: "股票", marketTags: ["SH", "SZ", "SHC", "SZC"], direction: "买入", routeName: "test1" },
      { businessType: "普通交易", contractType: "股票", marketTags: ["SH", "SZ", "SHC", "SZC"], direction: "卖出", routeName: "卖单模板" },
      { businessType: "普通交易", contractType: "股票", marketTags: ["HZ", "HS", "HK"], direction: "卖出", routeName: "卖单模板" },
      { businessType: "普通交易", contractType: "期货", marketTags: ["DCE", "SHF"], direction: "买开", routeName: "test1" },
    ],
  },
  {
    name: "test",
    remark: "5413",
    rows: [
      { businessType: "普通交易", contractType: "股票", marketTags: ["N", "A", "O"], direction: "买入", routeName: "默认模板" },
      { businessType: "普通交易", contractType: "股票", marketTags: ["SH", "SZ"], direction: "买入", routeName: "默认模板" },
      { businessType: "普通交易", contractType: "可转债", marketTags: ["SH", "SZ"], direction: "卖出", routeName: "test2" },
    ],
  },
  {
    name: "股票与ETF模板",
    remark: "沪深/港股",
    rows: [
      { businessType: "普通交易", contractType: "股票", marketTags: ["SH", "SZ", "SHC", "SZC"], direction: "买入", routeName: "买单模板" },
      { businessType: "普通交易", contractType: "股票", marketTags: ["SH", "SZ", "SHC", "SZC"], direction: "卖出", routeName: "卖单模板" },
      { businessType: "普通交易", contractType: "公募基金", marketTags: ["SH", "SZ", "SHC", "SZC"], direction: "买入", routeName: "买单模板" },
      { businessType: "普通交易", contractType: "公募基金", marketTags: ["SH", "SZ", "SHC", "SZC"], direction: "卖出", routeName: "卖单模板" },
      { businessType: "普通交易", contractType: "股票", marketTags: ["HZ", "HS", "HK"], direction: "买入", routeName: "默认模板" },
      { businessType: "普通交易", contractType: "股票", marketTags: ["HZ", "HS", "HK"], direction: "卖出", routeName: "卖单模板" },
      { businessType: "普通交易", contractType: "公募基金", marketTags: ["HZ", "HS", "HK"], direction: "买入", routeName: "test1" },
      { businessType: "普通交易", contractType: "公募基金", marketTags: ["HZ", "HS", "HK"], direction: "卖出", routeName: "test2" },
    ],
  },
];

const defaultPermissions: Permission[] = [
  { id: 1, market: "沪深", products: ["股票", "ETF"] },
];

const storageKey = "bct-account-permission-routing-v5";
const makeId = () => Date.now() + Math.floor(Math.random() * 10000);

function findTemplateRow(templateName: string, market: Market, product: Product, direction: Direction) {
  const template = sourceTemplates.find((item) => item.name === templateName);
  const marketTags = tradingMarketCodeTable[market].templateTags;
  return template?.rows.find((row) =>
    row.businessType === "普通交易"
    && row.contractType === productContractMap[product]
    && row.marketTags.some((tag) => marketTags.includes(tag))
    && normalizeDirection(row.direction) === direction,
  );
}

function ruleFromTemplate(market: Market, product: Product, direction: Direction, templateName: string): Rule {
  if (!templateName) {
    return {
      id: ruleId(market, product, direction),
      market,
      product,
      routeTemplate: globalRouteTemplate,
      direction,
    };
  }
  const matched = findTemplateRow(templateName, market, product, direction);
  return {
    id: ruleId(market, product, direction),
    market,
    product,
    routeTemplate: matched?.routeName ?? globalRouteTemplate,
    direction,
  };
}

function expandPermissionRules(permissions: Permission[], current: Rule[], templateName: string) {
  const currentMap = new Map(current.map((rule) => [ruleId(rule.market, rule.product, rule.direction), rule]));
  return permissions.flatMap((permission) =>
    allProducts
      .filter((product) => permission.products.includes(product))
      .flatMap((product) => allDirections.map((direction) => {
          const existing = currentMap.get(ruleId(permission.market, product, direction));
          if (!existing) return ruleFromTemplate(permission.market, product, direction, templateName);
          return {
            ...existing,
            id: ruleId(permission.market, product, direction),
            market: permission.market,
            product,
            routeTemplate: existing.routeTemplate ?? "",
            direction,
          };
        })),
  );
}

function applySourceTemplate(permissions: Permission[], templateName: string) {
  return permissions.flatMap((permission) =>
    allProducts
      .filter((product) => permission.products.includes(product))
      .flatMap((product) => allDirections.map((direction) => ruleFromTemplate(permission.market, product, direction, templateName))),
  );
}

export default function Home() {
  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [restrictedInvestmentTemplate, setRestrictedInvestmentTemplate] = useState("");
  const [rules, setRules] = useState<Rule[]>(() => applySourceTemplate(defaultPermissions, ""));
  const [validationRuleIds, setValidationRuleIds] = useState<string[]>([]);
  const [openProductId, setOpenProductId] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { permissions?: Permission[]; rules?: Rule[]; selectedTemplate?: string; restrictedInvestmentTemplate?: string };
      const nextPermissions = Array.isArray(parsed.permissions) ? parsed.permissions : defaultPermissions;
      const nextTemplate = sourceTemplates.some((item) => item.name === parsed.selectedTemplate) ? parsed.selectedTemplate as string : "";
      const nextRules = expandPermissionRules(nextPermissions, Array.isArray(parsed.rules) ? parsed.rules : [], nextTemplate);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermissions(nextPermissions);
      setSelectedTemplate(nextTemplate);
      setRestrictedInvestmentTemplate(parsed.restrictedInvestmentTemplate ?? "");
      setRules(nextRules);
    } catch {
      // 本地示例数据异常时继续使用默认权限与模板。
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
  const validationRules = rules.filter((rule) => validationRuleIds.includes(rule.id));
  const ruleGroups = useMemo<RuleGroup[]>(() => {
    const ruleMap = new Map(rules.map((rule) => [rule.id, rule]));
    return permissions.flatMap((permission) =>
      allProducts
        .filter((product) => permission.products.includes(product))
        .flatMap((product) => {
          const buy = ruleMap.get(ruleId(permission.market, product, "买"));
          const sell = ruleMap.get(ruleId(permission.market, product, "卖"));
          return buy && sell ? [{ id: `${permission.market}-${product}`, market: permission.market, product, buy, sell }] : [];
        }),
    );
  }, [permissions, rules]);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const syncRules = (nextPermissions: Permission[]) => {
    const nextRules = expandPermissionRules(nextPermissions, rules, selectedTemplate);
    setPermissions(nextPermissions);
    setRules(nextRules);
    setValidationRuleIds([]);
  };

  const updateMarket = (id: number, market: Market) => {
    const next = permissions.map((permission) => permission.id === id ? { ...permission, market } : permission);
    syncRules(next);
  };

  const updateProducts = (id: number, product: Product, checked: boolean) => {
    const next = permissions.map((permission) => permission.id === id
      ? { ...permission, products: checked ? [...permission.products, product] : permission.products.filter((item) => item !== product) }
      : permission,
    );
    syncRules(next);
  };

  const addPermission = () => {
    if (!unusedMarkets.length) return;
    syncRules([...permissions, { id: makeId(), market: unusedMarkets[0], products: ["股票"] }]);
  };

  const deletePermission = (id: number) => syncRules(permissions.filter((permission) => permission.id !== id));

  const updateRule = (id: string, patch: Partial<Rule>) => {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
    if (patch.routeTemplate) setValidationRuleIds((current) => current.filter((item) => item !== id));
  };

  const changeSourceTemplate = (templateName: string) => {
    const next = applySourceTemplate(permissions, templateName);
    setSelectedTemplate(templateName);
    setRules(next);
    setValidationRuleIds([]);
    if (!templateName) flash("已恢复为全局模板");
    else flash(`已导入“${templateName}”，未匹配项继续使用全局模板`);
  };

  const save = () => {
    const incomplete = rules.filter((rule) => !rule.routeTemplate);
    if (incomplete.length) {
      setValidationRuleIds(incomplete.map((rule) => rule.id));
      window.setTimeout(() => document.getElementById("routing-validation")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return;
    }
    setValidationRuleIds([]);

    const backendPayload = {
      restrictedInvestmentTemplate,
      tradePermissions: permissions.map((permission) => ({
        tradingMarket: tradingMarketCodeTable[permission.market].codeValue,
        tradingMarketTags: tradingMarketCodeTable[permission.market].templateTags,
        products: permission.products,
      })),
      reportOrderRules: rules.map((rule) => ({
        tradingMarket: tradingMarketCodeTable[rule.market].codeValue,
        tradingMarketTags: tradingMarketCodeTable[rule.market].templateTags,
        product: rule.product,
        contractType: productContractMap[rule.product],
        routeTemplate: rule.routeTemplate,
        direction: rule.direction,
      })),
    };
    localStorage.setItem(storageKey, JSON.stringify({ permissions, rules, selectedTemplate, restrictedInvestmentTemplate, backendPayload }));
    flash(`已按 tradingMarket 码表转换并保存 ${rules.length} 条配置`);
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
        <p className="count-line">共 {permissions.length} 项市场权限</p>
      </section>

      <section className="config-module" aria-labelledby="routing-title">
        <header className="module-header">
          <h2 id="routing-title">互换交易设置</h2>
        </header>
        <div className="routing-base-fields">
          <label htmlFor="restricted-investment-template">不可投资范围模板</label>
          <select id="restricted-investment-template" value={restrictedInvestmentTemplate} onChange={(event) => setRestrictedInvestmentTemplate(event.target.value)}><option value="">请选择</option>{restrictedInvestmentTemplates.map((template) => <option key={template} value={template}>{template}</option>)}</select>
        </div>
        <div className="routing-header routing-detail-header">
          <div><h3>智能路由配置明细</h3><p>每个“市场 × 品种”合并为一行，买、卖方向分别配置模板</p></div>
          <div className="routing-controls">
            {validationRules.length > 0 && <span id="routing-validation" className="validation-summary" role="alert">该品种不能为空（{validationRules.length}条）</span>}
            <div className="template-import-control">
              <label htmlFor="source-template">模板导入</label>
              <select id="source-template" value={selectedTemplate} onChange={(event) => changeSourceTemplate(event.target.value)}><option value="">不导入（使用全局模板）</option>{sourceTemplates.map((item) => <option key={item.name} value={item.name}>{item.name}（{item.remark}）</option>)}</select>
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="rule-table">
            <thead><tr><th>股票市场</th><th>品种</th><th><em>*</em> 买方向模板</th><th><em>*</em> 卖方向模板</th></tr></thead>
            <tbody>
              {ruleGroups.map((group) => <tr key={group.id} className={validationRuleIds.includes(group.buy.id) || validationRuleIds.includes(group.sell.id) ? "validation-row" : undefined}>
                <td><span className="readonly-value">{group.market}</span></td>
                <td><span className="readonly-value">{group.product}</span></td>
                <td><select aria-label={`${group.market}${group.product}买方向模板`} aria-invalid={validationRuleIds.includes(group.buy.id)} value={group.buy.routeTemplate} onChange={(event) => updateRule(group.buy.id, { routeTemplate: event.target.value })}><option value="">请选择</option>{routeTemplates.map((template) => <option key={template} value={template}>{template}</option>)}</select></td>
                <td><select aria-label={`${group.market}${group.product}卖方向模板`} aria-invalid={validationRuleIds.includes(group.sell.id)} value={group.sell.routeTemplate} onChange={(event) => updateRule(group.sell.id, { routeTemplate: event.target.value })}><option value="">请选择</option>{routeTemplates.map((template) => <option key={template} value={template}>{template}</option>)}</select></td>
              </tr>)}
              {!ruleGroups.length && <tr><td colSpan={4} className="empty-cell">请先在上方配置市场和品种权限</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="count-line">共 {ruleGroups.length} 个市场品种组合，初始使用全局模板</p>
      </section>

      <footer className="page-footer"><button className="save-button" onClick={save}>保存</button></footer>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function ProductSelect({ permission, open, onToggle, onChange }: { permission: Permission; open: boolean; onToggle: () => void; onChange: (product: Product, checked: boolean) => void }) {
  return <div className={`product-select${open ? " open" : ""}`}>
    <button type="button" className="product-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={onToggle}>{permission.products.length ? <><span>{productLabel(permission.products[0])}</span>{permission.products.length > 1 && <b>+{permission.products.length - 1}</b>}</> : <span className="placeholder">请选择</span>}</button>
    {open && <div className="product-options" role="listbox">{allProducts.map((product) => <label key={product}><input type="checkbox" checked={permission.products.includes(product)} onChange={(event) => onChange(product, event.target.checked)} /><span>{productLabel(product)}</span></label>)}</div>}
  </div>;
}
