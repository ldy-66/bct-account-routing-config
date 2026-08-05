"use client";

import { useEffect, useState } from "react";

type Rule = {
  id: number;
  routeTemplate: string;
  buySell: "买" | "卖";
  openClose: "默认" | "开仓" | "平仓";
};

const inheritedExchanges = ["深交所", "上交所", "深港通", "沪股通"];
const routeTemplates = ["默认模板", "test1", "test2", "买单模板", "卖单模板"];
const directory = ["基础信息", "账户参数", "期权交易权限", "期权保证金设置", "互换交易权限", "互换融资设置", "互换收费设置", "互换交易设置", "互换风控设置"];

const defaultRules: Rule[] = [
  { id: 1, routeTemplate: "买单模板", buySell: "买", openClose: "默认" },
  { id: 2, routeTemplate: "卖单模板", buySell: "卖", openClose: "默认" },
];

const cloneRules = (rules: Rule[]) => rules.map((rule) => ({ ...rule }));
const makeRule = (): Rule => ({ id: Date.now(), routeTemplate: "默认模板", buySell: "买", openClose: "默认" });

export default function Home() {
  const [rules, setRules] = useState<Rule[]>(defaultRules);
  const [workingRules, setWorkingRules] = useState<Rule[]>(defaultRules);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bct-full-account-opening-v2");
      if (saved) setRules(JSON.parse(saved).rules ?? defaultRules);
    } catch { /* 使用默认数据 */ }
  }, []);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const openTemplateConfig = () => {
    setWorkingRules(cloneRules(rules));
    setModalOpen(true);
  };

  const applyTemplateConfig = () => {
    setRules(cloneRules(workingRules));
    setModalOpen(false);
    flash("报单排序配置已应用");
  };

  const saveAccount = () => {
    localStorage.setItem("bct-full-account-opening-v2", JSON.stringify({ rules }));
    flash("交易账户开户配置已保存");
  };

  return (
    <main className="opening-page">
      <header className="app-header">
        <div className="app-logo">T</div><span className="app-brand">BCT</span><strong>新增</strong><button aria-label="关闭">×</button>
      </header>

      <div className="opening-body">
        <aside className="opening-directory">
          <h2>目录</h2>
          <nav>{directory.map((item, index) => <button key={item} className={index === 7 ? "active" : ""}>{item}</button>)}</nav>
        </aside>

        <section className="opening-content">
          <div className="item-count">共&nbsp; 2 &nbsp;项</div>
          <section className="fee-section">
            <h3>交易费用模板</h3>
            <div className="simple-table fee-table">
              <div className="simple-head"><span>交易市场</span><span>交易品种</span><span>费用模板</span></div>
              <div className="simple-row"><span>沪深</span><span>股票</span><span /></div>
              <div className="simple-row"><span>港股</span><span>股票</span><span /></div>
              <div className="fee-space" /><button className="column-setting">▥<br />列<br />设<br />置</button>
            </div>
          </section>

          <section className="form-section expanded">
            <header><h3>互换交易设置</h3><span>⌃</span></header>
            <div className="section-fields simplified-fields">
              <label><span>不可投资范围模板</span><input value="" readOnly /></label>
              <label className="route-field"><span><em>*</em> 报单排序配置</span><button className="template-picker" onClick={openTemplateConfig}><span><b>已配置 {rules.length} 条规则</b><small>普通交易 · 沿用开户交易所权限</small></span><i>⌄</i></button></label>
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

      <footer className="opening-footer"><button className="secondary">模板设置</button><button className="primary">另存为模板</button><button className="secondary">取消</button><button className="primary" onClick={saveAccount}>确定</button></footer>

      {modalOpen && <TemplateConfigModal rules={workingRules} setRules={setWorkingRules} onCancel={() => setModalOpen(false)} onSave={applyTemplateConfig} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function TemplateConfigModal({ rules, setRules, onCancel, onSave }: { rules: Rule[]; setRules: (rules: Rule[]) => void; onCancel: () => void; onSave: () => void }) {
  const updateRule = (id: number, patch: Partial<Rule>) => setRules(rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
  const addRule = () => setRules([...rules, makeRule()]);
  const deleteRule = (id: number) => setRules(rules.filter((rule) => rule.id !== id));

  return <div className="modal-mask" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="template-dialog compact-dialog" role="dialog" aria-modal="true" aria-label="报单排序配置">
      <header className="dialog-titlebar"><h2>报单排序配置</h2><button aria-label="关闭" onClick={onCancel}>×</button></header>
      <div className="dialog-content compact-content">
        <div className="inheritance-summary">
          <div><span>交易类型</span><b>普通交易</b></div>
          <div><span>交易所权限</span><TagList items={inheritedExchanges} /></div>
        </div>

        <div className="table-panel compact-table-panel">
          <div className="table-scroll">
            <table className="rule-table">
              <thead>
                <tr className="group-header">
                  <th rowSpan={2}>交易类型</th>
                  <th rowSpan={2}>交易所</th>
                  <th rowSpan={2}><em>*</em> 报单排序模板</th>
                  <th colSpan={2} className="direction-group"><em>*</em> 交易方向</th>
                  <th rowSpan={2}>操作</th>
                </tr>
                <tr className="direction-subheader">
                  <th>买卖</th>
                  <th>开平标识</th>
                </tr>
              </thead>
              <tbody>{rules.map((rule) => <tr key={rule.id}>
                <td>普通交易</td>
                <td><TagList items={inheritedExchanges} /></td>
                <td><select value={rule.routeTemplate} onChange={(event) => updateRule(rule.id, { routeTemplate: event.target.value })}>{routeTemplates.map((item) => <option key={item}>{item}</option>)}</select></td>
                <td><select value={rule.buySell} onChange={(event) => updateRule(rule.id, { buySell: event.target.value as Rule["buySell"] })}><option>买</option><option>卖</option></select></td>
                <td><select value={rule.openClose} onChange={(event) => updateRule(rule.id, { openClose: event.target.value as Rule["openClose"] })}><option>默认</option><option>开仓</option><option>平仓</option></select></td>
                <td className="actions"><button className="delete" onClick={() => deleteRule(rule.id)}>删除</button></td>
              </tr>)}</tbody>
            </table>
          </div>
          <button className="add-row" onClick={addRule}>新增一行</button>
        </div>
      </div>
      <footer className="dialog-footer"><button className="cancel-button" onClick={onCancel}>取消</button><button className="save-button" onClick={onSave}>保存</button></footer>
    </section>
  </div>;
}

function TagList({ items }: { items: string[] }) {
  return <div className="tags">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}
