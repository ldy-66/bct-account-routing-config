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

type SpecialRule = {
  id: string;
  market: Market;
  product: Product;
  direction: Direction;
  routeTemplate: string;
};

type SourceTemplate = {
  name: string;
  remark: string;
  rows: Array<Omit<SpecialRule, "id">>;
};

const allMarkets: Market[] = ["沪深", "港股", "美股"];
const allProducts: Product[] = ["股票", "ETF", "可转债"];
const allDirections: Direction[] = ["买", "卖"];
const routeTemplates = ["默认模板", "test1", "test2", "买单模板", "卖单模板"];
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

const makeId = () => `special-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const combinationKey = (rule: Pick<SpecialRule, "market" | "product" | "direction">) => `${rule.market}-${rule.product}-${rule.direction}`;

function isAllowed(rule: Pick<SpecialRule, "market" | "product">, permissions: Permission[]) {
  return permissions.some((permission) => permission.market === rule.market && permission.products.includes(rule.product));
}

export default function SolutionThree() {
  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);
  const [specialRules, setSpecialRules] = useState<SpecialRule[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [openProductId, setOpenProductId] = useState<number | null>(null);
  const [validationIds, setValidationIds] = useState<string[]>([]);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  const unusedMarkets = useMemo(
    () => allMarkets.filter((market) => !permissions.some((permission) => permission.market === market)),
    [permissions],
  );

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const syncPermissions = (nextPermissions: Permission[]) => {
    setPermissions(nextPermissions);
    setSpecialRules((current) => current.filter((rule) => isAllowed(rule, nextPermissions)));
    setValidationIds([]);
    setDuplicateIds([]);
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
    if (unusedMarkets.length) syncPermissions([...permissions, { id: Date.now(), market: unusedMarkets[0], products: ["股票"] }]);
  };

  const availableCombinations = useMemo(
    () => permissions.flatMap((permission) => permission.products.flatMap((product) => allDirections.map((direction) => ({ market: permission.market, product, direction })))),
    [permissions],
  );

  const addSpecialRule = () => {
    const used = new Set(specialRules.map(combinationKey));
    const next = availableCombinations.find((item) => !used.has(combinationKey(item)));
    if (!next) {
      flash("当前权限下已没有可新增的特殊配置");
      return;
    }
    setSpecialRules((current) => [...current, { id: makeId(), ...next, routeTemplate: "" }]);
    setValidationIds([]);
    setDuplicateIds([]);
  };

  const updateSpecialRule = (id: string, patch: Partial<SpecialRule>) => {
    setSpecialRules((current) => current.map((rule) => {
      if (rule.id !== id) return rule;
      const next = { ...rule, ...patch };
      if (patch.market) {
        const permission = permissions.find((item) => item.market === patch.market);
        next.product = permission?.products[0] ?? rule.product;
      }
      return next;
    }));
    setValidationIds((current) => current.filter((item) => item !== id));
    setDuplicateIds([]);
  };

  const importTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    setValidationIds([]);
    setDuplicateIds([]);
    const template = sourceTemplates.find((item) => item.name === templateName);
    if (!template) return;

    const next = template.rows
      .filter((row) => isAllowed(row, permissions))
      .map((row, index) => ({ ...row, id: `import-${templateName}-${index}` }));
    setSpecialRules(next);
    flash(next.length ? `已全量覆盖为“${templateName}”的 ${next.length} 条特殊配置` : "模板在当前权限下无匹配项，全部使用全局模板");
  };

  const save = () => {
    const emptyRows = specialRules.filter((rule) => !rule.routeTemplate).map((rule) => rule.id);
    const keys = new Map<string, string[]>();
    specialRules.forEach((rule) => keys.set(combinationKey(rule), [...(keys.get(combinationKey(rule)) ?? []), rule.id]));
    const duplicates = [...keys.values()].filter((ids) => ids.length > 1).flat();

    setValidationIds(emptyRows);
    setDuplicateIds(duplicates);
    if (emptyRows.length || duplicates.length) return;
    flash(`已保存 ${specialRules.length} 条特殊配置，其余配置使用全局模板`);
  };

  const errorCount = validationIds.length + duplicateIds.length;

  return (
    <main className="config-page solution-three-page">
      <section className="config-module" aria-labelledby="permission-title-three">
        <header className="module-header">
          <h1 id="permission-title-three">互换交易权限</h1>
          <button className="primary-button" onClick={addPermission} disabled={!unusedMarkets.length}>新增</button>
        </header>
        <div className="table-wrap permission-table-wrap">
          <table className="permission-table">
            <thead><tr><th>市场</th><th>品种</th><th>操作</th></tr></thead>
            <tbody>{permissions.map((permission, index) => <tr key={permission.id}>
              <td><select aria-label={`第 ${index + 1} 行市场`} value={permission.market} onChange={(event) => updateMarket(permission.id, event.target.value as Market)}>{allMarkets.filter((market) => market === permission.market || !permissions.some((item) => item.market === market)).map((market) => <option key={market}>{market}</option>)}</select></td>
              <td><ProductSelector permission={permission} open={openProductId === permission.id} onToggle={() => setOpenProductId(openProductId === permission.id ? null : permission.id)} onChange={(product, checked) => updateProducts(permission.id, product, checked)} /></td>
              <td className="actions"><button onClick={() => syncPermissions(permissions.filter((item) => item.id !== permission.id))}>删除</button></td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="count-line">共 {permissions.length} 项市场权限</p>
      </section>

      <section className="config-module" aria-labelledby="routing-title-three">
        <header className="module-header routing-header">
          <div><h2 id="routing-title-three">互换交易设置</h2><p>仅维护特殊配置，未添加的市场、品种及方向均使用全局模板</p></div>
          <div className="routing-controls">
            {errorCount > 0 && <span className="validation-summary" role="alert">{duplicateIds.length ? "存在重复的特殊配置" : `模板不能为空（${validationIds.length}条）`}</span>}
            <div className="template-import-control">
              <label htmlFor="source-template-three">模板导入</label>
              <select id="source-template-three" value={selectedTemplate} onChange={(event) => importTemplate(event.target.value)}><option value="">请选择报单排序模板</option>{sourceTemplates.map((item) => <option key={item.name} value={item.name}>{item.name}（{item.remark}）</option>)}</select>
            </div>
            <button className="primary-button" onClick={addSpecialRule}>新增</button>
          </div>
        </header>
        <div className="table-wrap">
          <table className="exception-table">
            <thead><tr><th><em>*</em> 股票市场</th><th><em>*</em> 品种</th><th><em>*</em> 交易方向</th><th><em>*</em> 报单排序模板</th><th>操作</th></tr></thead>
            <tbody>
              {specialRules.map((rule, index) => {
                const permission = permissions.find((item) => item.market === rule.market);
                const invalid = validationIds.includes(rule.id) || duplicateIds.includes(rule.id);
                return <tr key={rule.id} className={invalid ? "validation-row" : undefined}>
                  <td><select aria-label={`第 ${index + 1} 条特殊配置市场`} value={rule.market} onChange={(event) => updateSpecialRule(rule.id, { market: event.target.value as Market })}>{permissions.map((item) => <option key={item.market}>{item.market}</option>)}</select></td>
                  <td><select aria-label={`第 ${index + 1} 条特殊配置品种`} value={rule.product} onChange={(event) => updateSpecialRule(rule.id, { product: event.target.value as Product })}>{permission?.products.map((product) => <option key={product}>{product}</option>)}</select></td>
                  <td><select aria-label={`第 ${index + 1} 条特殊配置交易方向`} value={rule.direction} onChange={(event) => updateSpecialRule(rule.id, { direction: event.target.value as Direction })}>{allDirections.map((direction) => <option key={direction}>{direction}</option>)}</select></td>
                  <td><select aria-label={`第 ${index + 1} 条特殊配置模板`} aria-invalid={invalid} value={rule.routeTemplate} onChange={(event) => updateSpecialRule(rule.id, { routeTemplate: event.target.value })}><option value="">请选择</option>{routeTemplates.map((template) => <option key={template}>{template}</option>)}</select></td>
                  <td className="actions"><button onClick={() => setSpecialRules((current) => current.filter((item) => item.id !== rule.id))}>删除</button></td>
                </tr>;
              })}
              {!specialRules.length && <tr><td colSpan={5} className="empty-cell">暂无特殊配置，全部使用全局模板</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="count-line">共 {specialRules.length} 条特殊配置，未配置项使用全局模板</p>
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
