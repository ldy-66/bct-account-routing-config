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
const directory = ["基础信息", "账户参数", "期权交易权限", "期权保证金设置", "互换交易权限", "互换融资设置", "互换收费设置", "互换交易设置", "互换风控设置"];

const defaultRules: Rule[] = [
  { id: 1, business: "普通交易", contract: "股票", exchanges: ["深交所", "上交所", "深港通", "沪股通"], assets: ["全部"], direction: "买入", routeTemplate: "test1" },
  { id: 2, business: "普通交易", contract: "期货", exchanges: ["大连商品交易所", "上海期货交易所"], assets: ["聚丙烯", "白银"], direction: "买开", routeTemplate: "test1" },
  { id: 3, business: "融资交易", contract: "股票", exchanges: ["深交所", "上交所", "香港交易所", "深港通", "沪股通"], assets: ["全部"], direction: "开仓", routeTemplate: "默认模板" },
];

const cloneRules = (rules: Rule[]) => rules.map((rule) => ({ ...rule, exchanges: [...rule.exchanges], assets: [...rule.assets] }));
const makeRule = (): Rule => ({ id: Date.now(), business: "普通交易", contract: "股票", exchanges: ["深交所", "上交所"], assets: ["全部"], direction: "买入", routeTemplate: "默认模板" });

export default function Home() {
  const [rules, setRules] = useState<Rule[]>(defaultRules);
  const [templateName, setTemplateName] = useState("默认模板");
  const [modalOpen, setModalOpen] = useState(false);
  const [workingRules, setWorkingRules] = useState<Rule[]>(defaultRules);
  const [workingTemplate, setWorkingTemplate] = useState("默认模板");
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bct-full-account-opening");
      if (saved) {
        const data = JSON.parse(saved);
        setRules(data.rules ?? defaultRules);
        setTemplateName(data.templateName ?? "默认模板");
      }
    } catch { /* 使用默认数据 */ }
  }, []);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const openTemplateConfig = () => {
    setWorkingRules(cloneRules(rules));
    setWorkingTemplate(templateName);
    setModalOpen(true);
  };

  const applyTemplateConfig = () => {
    setRules(cloneRules(workingRules));
    setTemplateName(workingTemplate);
    setModalOpen(false);
    flash("报单排序配置已应用");
  };

  const saveAccount = () => {
    localStorage.setItem("bct-full-account-opening", JSON.stringify({ rules, templateName }));
    flash("交易账户开户配置已保存");
  };

  return (
    <main className="opening-page">
      <header className="app-header">
        <div className="app-logo">T</div>
        <span className="app-brand">BCT</span>
        <strong>新增</strong>
        <button aria-label="关闭">×</button>
      </header>

      <div className="opening-body">
        <aside className="opening-directory">
          <h2>目录</h2>
          <nav>{directory.map((item, index) => <button key={item} className={index === 7 ? "active" : ""}><span className={index === 7 ? "active-dot" : ""} />{item}</button>)}</nav>
        </aside>

        <section className="opening-content">
          <div className="item-count">共&nbsp; 2 &nbsp;项</div>

          <section className="fee-section">
            <h3>交易费用模板</h3>
            <div className="simple-table fee-table">
              <div className="simple-head"><span>交易市场</span><span>交易品种</span><span>费用模板</span></div>
              <div className="simple-row"><span>沪深</span><span>股票</span><span className="empty-cell" /></div>
              <div className="simple-row"><span>港股</span><span>股票</span><span className="empty-cell" /></div>
              <div className="fee-space" />
              <button className="column-setting">▥<br />列<br />设<br />置</button>
            </div>
          </section>

          <section className="form-section expanded">
            <header><h3>互换交易设置</h3><span>⌃</span></header>
            <div className="section-fields">
              <label><span>不可投资范围模板</span><input value="" readOnly /></label>
              <label className="route-field"><span><em>*</em> 报单排序配置</span><button className="template-picker" onClick={openTemplateConfig}><span><b>{templateName}</b><small>{rules.length} 条场景规则</small></span><i>⌄</i></button></label>
              <div className="route-summary"><span>已配置方向</span><div>{Array.from(new Set(rules.map((rule) => rule.direction))).map((item) => <b key={item}>{item}</b>)}</div><button onClick={openTemplateConfig}>配置</button></div>
            </div>
          </section>

          <section className="form-section risk-section">
            <header><h3>互换风控设置</h3><span>⌃</span></header>
            <div className="risk-fields">
              <label><span>到期/申请终止后持仓策略</span><select disabled><option>保留持仓</option></select></label>
              <label><span><em>*</em> 风控指标&nbsp; ⓘ</span><select defaultValue="保证金损耗比例"><option>保证金损耗比例</option><option>维持担保比例</option></select></label>
            </div>
            <div className="quota-heading"><span>账户单票比例限制</span><button>新增</button></div>
            <div className="empty-grid"><div><span>控制维度</span><span>证券代码</span><span>证券池名称</span><span>控制模式</span><span>控制阈值</span><span>操作</span></div><p>暂无数据</p><button className="column-setting">▥<br />列<br />设<br />置</button></div>
          </section>
        </section>
      </div>

      <footer className="opening-footer">
        <button className="secondary">模板设置</button>
        <button className="primary">另存为模板</button>
        <button className="secondary">取消</button>
        <button className="primary" onClick={saveAccount}>确定</button>
      </footer>

      {modalOpen && <TemplateConfigModal account="当前开户账户" templateName={workingTemplate} setTemplateName={setWorkingTemplate} rules={workingRules} setRules={setWorkingRules} onCancel={() => setModalOpen(false)} onSave={applyTemplateConfig} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function TemplateConfigModal({ account, templateName, setTemplateName, rules, setRules, onCancel, onSave }: { account: string; templateName: string; setTemplateName: (name: string) => void; rules: Rule[]; setRules: (rules: Rule[]) => void; onCancel: () => void; onSave: () => void }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Rule | null>(null);

  const startAdd = () => { const next = makeRule(); setDraft(next); setEditingId(next.id); };
  const startEdit = (rule: Rule) => { setDraft({ ...rule, exchanges: [...rule.exchanges], assets: [...rule.assets] }); setEditingId(rule.id); };
  const cancelEdit = () => { setDraft(null); setEditingId(null); };
  const saveDraft = () => {
    if (!draft || !draft.exchanges.length) return;
    setRules(rules.some((item) => item.id === draft.id) ? rules.map((item) => item.id === draft.id ? draft : item) : [...rules, draft]);
    cancelEdit();
  };
  const deleteRule = (rule: Rule) => { if (window.confirm(`确定删除“${rule.business} / ${rule.direction}”配置吗？`)) setRules(rules.filter((item) => item.id !== rule.id)); };
  const toggleExchange = (exchange: string) => { if (draft) setDraft({ ...draft, exchanges: draft.exchanges.includes(exchange) ? draft.exchanges.filter((item) => item !== exchange) : [...draft.exchanges, exchange] }); };

  return <div className="modal-mask" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="template-dialog" role="dialog" aria-modal="true" aria-label="报单排序模板配置">
      <header className="dialog-titlebar"><h2>新增客户配置</h2><button aria-label="关闭" onClick={onCancel}>×</button></header>
      <div className="dialog-content">
        <div className="modal-form-row">
          <label><span>交易账户</span><select value={account} disabled><option>{account}</option></select></label>
          <label><span>模板名称</span><select className="focused-select" value={templateName} onChange={(event) => setTemplateName(event.target.value)}><option>默认模板</option><option>沪深普通交易模板</option><option>多市场交易模板</option></select></label>
        </div>
        <div className="table-panel">
          <div className="table-scroll"><table><thead><tr><th>业务类型</th><th>合约类型</th><th>交易所</th><th>资产品种</th><th>交易方向</th><th>顺序名称</th><th>操作</th></tr></thead><tbody>
            {rules.map((rule) => editingId === rule.id && draft ? <EditRow key={rule.id} rule={draft} setRule={setDraft} toggleExchange={toggleExchange} onSave={saveDraft} onCancel={cancelEdit} /> : <tr key={rule.id}><td>{rule.business}</td><td>{rule.contract}</td><td><TagList items={rule.exchanges} /></td><td className={rule.assets[0] === "全部" ? "muted-cell" : ""}><TagList items={rule.assets} plainAll /></td><td>{rule.direction}</td><td>{rule.routeTemplate}</td><td className="actions"><button onClick={() => startEdit(rule)}>编辑</button><button className="delete" onClick={() => deleteRule(rule)}>删除</button></td></tr>)}
            {editingId && draft && !rules.some((item) => item.id === editingId) && <EditRow rule={draft} setRule={setDraft} toggleExchange={toggleExchange} onSave={saveDraft} onCancel={cancelEdit} />}
          </tbody></table></div>
          {!editingId && <button className="add-row" onClick={startAdd}>新增一行</button>}
        </div>
      </div>
      <footer className="dialog-footer"><button className="cancel-button" onClick={onCancel}>取消</button><button className="save-button" onClick={onSave}>保存</button></footer>
    </section>
  </div>;
}

function TagList({ items, plainAll = false }: { items: string[]; plainAll?: boolean }) {
  if (plainAll && items.length === 1 && items[0] === "全部") return <>全部</>;
  return <div className="tags">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

function EditRow({ rule, setRule, toggleExchange, onSave, onCancel }: { rule: Rule; setRule: (rule: Rule) => void; toggleExchange: (exchange: string) => void; onSave: () => void; onCancel: () => void }) {
  return <tr className="editing-row"><td><select value={rule.business} onChange={(event) => setRule({ ...rule, business: event.target.value })}><option>普通交易</option><option>融资交易</option></select></td><td><select value={rule.contract} onChange={(event) => setRule({ ...rule, contract: event.target.value, assets: event.target.value === "股票" ? ["全部"] : ["聚丙烯"] })}><option>股票</option><option>期货</option></select></td><td><details className="multi-select"><summary>{rule.exchanges.length ? `已选 ${rule.exchanges.length} 项` : "请选择"}</summary><div>{exchangeOptions.map((item) => <label key={item}><input type="checkbox" checked={rule.exchanges.includes(item)} onChange={() => toggleExchange(item)} />{item}</label>)}</div></details></td><td><select value={rule.assets[0]} onChange={(event) => setRule({ ...rule, assets: [event.target.value] })}>{rule.contract === "股票" ? <><option>全部</option><option>A股</option><option>港股</option></> : <><option>聚丙烯</option><option>白银</option><option>全部</option></>}</select></td><td><select value={rule.direction} onChange={(event) => setRule({ ...rule, direction: event.target.value })}><option>买入</option><option>卖出</option><option>买开</option><option>卖平</option><option>开仓</option></select></td><td><select value={rule.routeTemplate} onChange={(event) => setRule({ ...rule, routeTemplate: event.target.value })}>{routeTemplates.map((item) => <option key={item}>{item}</option>)}</select></td><td className="actions"><button onClick={onSave}>保存</button><button onClick={onCancel}>取消</button></td></tr>;
}
