"use client";

import { useEffect, useState } from "react";

type Rule = {
  id: number;
  business: string;
  contract: string;
  exchanges: string[];
  assets: string[];
  direction: string;
  routeTemplate: string;
};

const exchangeOptions = ["深交所", "上交所", "深港通", "沪股通", "香港交易所", "大连商品交易所", "上海期货交易所"];
const routeTemplates = ["默认模板", "test1", "test2", "买单模板", "卖单模板"];

const defaultRules: Rule[] = [
  { id: 1, business: "普通交易", contract: "股票", exchanges: ["深交所", "上交所", "深港通", "沪股通"], assets: ["全部"], direction: "买入", routeTemplate: "test1" },
  { id: 2, business: "普通交易", contract: "期货", exchanges: ["大连商品交易所", "上海期货交易所"], assets: ["聚丙烯", "白银"], direction: "买开", routeTemplate: "test1" },
  { id: 3, business: "融资交易", contract: "股票", exchanges: ["深交所", "上交所", "香港交易所", "深港通", "沪股通"], assets: ["全部"], direction: "开仓", routeTemplate: "默认模板" },
];

function makeRule(): Rule {
  return { id: Date.now(), business: "普通交易", contract: "股票", exchanges: ["深交所", "上交所"], assets: ["全部"], direction: "买入", routeTemplate: "默认模板" };
}

export default function Home() {
  const [account, setAccount] = useState("全局配置");
  const [templateName, setTemplateName] = useState("默认模板");
  const [rules, setRules] = useState<Rule[]>(defaultRules);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Rule | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const data = localStorage.getItem("bct-unified-client-config");
      if (data) {
        const parsed = JSON.parse(data);
        setAccount(parsed.account ?? "全局配置");
        setTemplateName(parsed.templateName ?? "默认模板");
        setRules(parsed.rules ?? defaultRules);
      }
    } catch { /* 使用默认数据 */ }
  }, []);

  const startAdd = () => {
    const next = makeRule();
    setDraft(next);
    setEditingId(next.id);
  };

  const startEdit = (rule: Rule) => {
    setDraft({ ...rule, exchanges: [...rule.exchanges], assets: [...rule.assets] });
    setEditingId(rule.id);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditingId(null);
  };

  const saveDraft = () => {
    if (!draft || !draft.exchanges.length) return;
    setRules((current) => current.some((item) => item.id === draft.id) ? current.map((item) => item.id === draft.id ? draft : item) : [...current, draft]);
    cancelEdit();
  };

  const deleteRule = (rule: Rule) => {
    if (!window.confirm(`确定删除“${rule.business} / ${rule.direction}”配置吗？`)) return;
    setRules((current) => current.filter((item) => item.id !== rule.id));
  };

  const toggleExchange = (exchange: string) => {
    if (!draft) return;
    setDraft({ ...draft, exchanges: draft.exchanges.includes(exchange) ? draft.exchanges.filter((item) => item !== exchange) : [...draft.exchanges, exchange] });
  };

  const saveAll = () => {
    localStorage.setItem("bct-unified-client-config", JSON.stringify({ account, templateName, rules }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <main className="page-canvas">
      <section className="system-dialog" aria-label="新增客户配置">
        <header className="dialog-titlebar">
          <h1>新增客户配置</h1>
          <button type="button" aria-label="关闭">×</button>
        </header>

        <div className="dialog-content">
          <div className="form-row">
            <label>
              <span>交易账户</span>
              <select value={account} onChange={(event) => setAccount(event.target.value)}>
                <option>全局配置</option>
                <option>msycs</option>
                <option>142yyq03</option>
                <option>142yyq01</option>
                <option>李四001</option>
              </select>
            </label>
            <label>
              <span>模板名称</span>
              <select className="focused-select" value={templateName} onChange={(event) => setTemplateName(event.target.value)}>
                <option>默认模板</option>
                <option>沪深普通交易模板</option>
                <option>多市场交易模板</option>
              </select>
            </label>
          </div>

          <div className="table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>业务类型</th>
                    <th>合约类型</th>
                    <th>交易所</th>
                    <th>资产品种</th>
                    <th>交易方向</th>
                    <th>顺序名称</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => editingId === rule.id && draft ? (
                    <EditRow key={rule.id} rule={draft} setRule={setDraft} toggleExchange={toggleExchange} onSave={saveDraft} onCancel={cancelEdit} />
                  ) : (
                    <tr key={rule.id}>
                      <td>{rule.business}</td>
                      <td>{rule.contract}</td>
                      <td><TagList items={rule.exchanges} /></td>
                      <td className={rule.assets[0] === "全部" ? "muted-cell" : ""}><TagList items={rule.assets} plainAll /></td>
                      <td>{rule.direction}</td>
                      <td>{rule.routeTemplate}</td>
                      <td className="actions"><button onClick={() => startEdit(rule)}>编辑</button><button className="delete" onClick={() => deleteRule(rule)}>删除</button></td>
                    </tr>
                  ))}
                  {editingId && draft && !rules.some((item) => item.id === editingId) && <EditRow rule={draft} setRule={setDraft} toggleExchange={toggleExchange} onSave={saveDraft} onCancel={cancelEdit} />}
                </tbody>
              </table>
            </div>

            {!editingId && <button className="add-row" type="button" onClick={startAdd}>新增一行</button>}
          </div>
        </div>

        <footer className="dialog-footer">
          {saved && <span className="save-tip">保存成功</span>}
          <button type="button" className="cancel-button">取消</button>
          <button type="button" className="save-button" onClick={saveAll}>保存</button>
        </footer>
      </section>
    </main>
  );
}

function TagList({ items, plainAll = false }: { items: string[]; plainAll?: boolean }) {
  if (plainAll && items.length === 1 && items[0] === "全部") return <>全部</>;
  return <div className="tags">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

function EditRow({ rule, setRule, toggleExchange, onSave, onCancel }: { rule: Rule; setRule: (rule: Rule) => void; toggleExchange: (exchange: string) => void; onSave: () => void; onCancel: () => void }) {
  return <tr className="editing-row">
    <td><select value={rule.business} onChange={(event) => setRule({ ...rule, business: event.target.value })}><option>普通交易</option><option>融资交易</option></select></td>
    <td><select value={rule.contract} onChange={(event) => setRule({ ...rule, contract: event.target.value, assets: event.target.value === "股票" ? ["全部"] : ["聚丙烯"] })}><option>股票</option><option>期货</option></select></td>
    <td>
      <details className="multi-select">
        <summary>{rule.exchanges.length ? `已选 ${rule.exchanges.length} 项` : "请选择"}</summary>
        <div>{exchangeOptions.map((item) => <label key={item}><input type="checkbox" checked={rule.exchanges.includes(item)} onChange={() => toggleExchange(item)} />{item}</label>)}</div>
      </details>
    </td>
    <td><select value={rule.assets[0]} onChange={(event) => setRule({ ...rule, assets: [event.target.value] })}>{rule.contract === "股票" ? <><option>全部</option><option>A股</option><option>港股</option></> : <><option>聚丙烯</option><option>白银</option><option>全部</option></>}</select></td>
    <td><select value={rule.direction} onChange={(event) => setRule({ ...rule, direction: event.target.value })}><option>买入</option><option>卖出</option><option>买开</option><option>卖平</option><option>开仓</option></select></td>
    <td><select value={rule.routeTemplate} onChange={(event) => setRule({ ...rule, routeTemplate: event.target.value })}>{routeTemplates.map((item) => <option key={item}>{item}</option>)}</select></td>
    <td className="actions"><button onClick={onSave}>保存</button><button onClick={onCancel}>取消</button></td>
  </tr>;
}
