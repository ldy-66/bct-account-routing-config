"use client";

import { useEffect, useMemo, useState } from "react";

type Market = "沪深" | "港股" | "美股";

type Rule = {
  id: number;
  market: Market | "";
  routeTemplate: string;
  buySell: "买" | "卖";
  openClose: "默认" | "开仓" | "平仓";
};

const allMarkets: Market[] = ["沪深", "港股", "美股"];
const routeTemplates = ["默认模板", "test1", "test2", "买单模板", "卖单模板"];
const defaultPermissions: Market[] = ["沪深", "港股"];
const defaultRules: Rule[] = [
  { id: 1, market: "沪深", routeTemplate: "买单模板", buySell: "买", openClose: "默认" },
  { id: 2, market: "港股", routeTemplate: "卖单模板", buySell: "卖", openClose: "默认" },
];

const storageKey = "bct-account-permission-routing-v1";
const makeId = () => Date.now() + Math.floor(Math.random() * 1000);

export default function Home() {
  const [permissions, setPermissions] = useState<Market[]>(defaultPermissions);
  const [rules, setRules] = useState<Rule[]>(defaultRules);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { permissions?: Market[]; rules?: Rule[] };
      const savedPermissions = (parsed.permissions ?? []).filter((market): market is Market => allMarkets.includes(market));
      if (savedPermissions.length) setPermissions([...new Set(savedPermissions)]);
      if (Array.isArray(parsed.rules)) setRules(parsed.rules);
    } catch {
      // 本地数据异常时继续使用示例配置。
    }
  }, []);

  const unusedMarkets = useMemo(
    () => allMarkets.filter((market) => !permissions.includes(market)),
    [permissions],
  );

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const updatePermission = (index: number, market: Market) => {
    const nextPermissions = permissions.map((item, itemIndex) => itemIndex === index ? market : item);
    const previousMarket = permissions[index];
    setPermissions(nextPermissions);
    setRules((currentRules) => currentRules.map((rule) =>
      rule.market === previousMarket ? { ...rule, market } : rule,
    ));
  };

  const addPermission = () => {
    if (!unusedMarkets.length) return;
    setPermissions([...permissions, unusedMarkets[0]]);
  };

  const deletePermission = (index: number) => {
    const removedMarket = permissions[index];
    const nextPermissions = permissions.filter((_, itemIndex) => itemIndex !== index);
    const fallbackMarket = nextPermissions[0] ?? "";
    setPermissions(nextPermissions);
    setRules((currentRules) => currentRules.map((rule) =>
      rule.market === removedMarket ? { ...rule, market: fallbackMarket } : rule,
    ));
  };

  const updateRule = (id: number, patch: Partial<Rule>) => {
    setRules(rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
  };

  const addRule = () => {
    setRules([...rules, {
      id: makeId(),
      market: permissions[0] ?? "",
      routeTemplate: "默认模板",
      buySell: "买",
      openClose: "默认",
    }]);
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
              {permissions.map((market, index) => (
                <tr key={`${market}-${index}`}>
                  <td>
                    <select
                      aria-label={`第 ${index + 1} 行市场`}
                      value={market}
                      onChange={(event) => updatePermission(index, event.target.value as Market)}
                    >
                      {allMarkets.filter((option) => option === market || !permissions.includes(option)).map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td>股票</td>
                  <td className="actions"><button onClick={() => deletePermission(index)}>删除</button></td>
                </tr>
              ))}
              {!permissions.length && <tr><td colSpan={3} className="empty-cell">暂未配置股票市场权限</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="count-line">共 {permissions.length} 项</p>
      </section>

      <section className="config-module" aria-labelledby="routing-title">
        <header className="module-header">
          <h2 id="routing-title">报单排序配置</h2>
        </header>

        <div className="table-wrap">
          <table className="rule-table">
            <thead>
              <tr className="group-header">
                <th rowSpan={2}>交易类型</th>
                <th rowSpan={2}><em>*</em> 股票市场</th>
                <th rowSpan={2}><em>*</em> 报单排序模板</th>
                <th colSpan={2} className="direction-group"><em>*</em> 交易方向</th>
                <th rowSpan={2}>操作</th>
              </tr>
              <tr className="direction-subheader"><th>买卖</th><th>开平标识</th></tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>普通交易</td>
                  <td>
                    <select
                      aria-label="股票市场"
                      value={permissions.includes(rule.market as Market) ? rule.market : permissions[0] ?? ""}
                      disabled={!permissions.length}
                      onChange={(event) => updateRule(rule.id, { market: event.target.value as Market })}
                    >
                      {!permissions.length && <option value="">请先配置上方权限</option>}
                      {permissions.map((market) => <option key={market}>{market}</option>)}
                    </select>
                  </td>
                  <td><select aria-label="报单排序模板" value={rule.routeTemplate} onChange={(event) => updateRule(rule.id, { routeTemplate: event.target.value })}>{routeTemplates.map((template) => <option key={template}>{template}</option>)}</select></td>
                  <td><select aria-label="买卖" value={rule.buySell} onChange={(event) => updateRule(rule.id, { buySell: event.target.value as Rule["buySell"] })}><option>买</option><option>卖</option></select></td>
                  <td><select aria-label="开平标识" value={rule.openClose} onChange={(event) => updateRule(rule.id, { openClose: event.target.value as Rule["openClose"] })}><option>默认</option><option>开仓</option><option>平仓</option></select></td>
                  <td className="actions"><button onClick={() => setRules(rules.filter((item) => item.id !== rule.id))}>删除</button></td>
                </tr>
              ))}
              {!rules.length && <tr><td colSpan={6} className="empty-cell">暂无报单排序配置</td></tr>}
            </tbody>
          </table>
        </div>
        <button className="add-row" onClick={addRule}>新增一行</button>
      </section>

      <footer className="page-footer"><button className="save-button" onClick={save}>保存</button></footer>
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}
