"use client";

import { useEffect, useMemo, useState } from "react";

type Direction = "买入" | "卖出" | "开仓";
type OpenClose = "默认" | "开仓" | "平仓";
type Rule = {
  id: number;
  business: string;
  contract: string;
  exchanges: string[];
  assets: string[];
  direction: Direction;
  openClose: OpenClose;
  templateId: string;
  enabled: boolean;
  note: string;
};
type RouteTemplate = {
  id: string;
  name: string;
  description: string;
  channels: string[];
};

const defaultTemplates: RouteTemplate[] = [
  { id: "buy", name: "买单模板", description: "普通交易买入优先路由", channels: ["CMSI_SC999", "QFII", "SJN-MOCK1"] },
  { id: "sell", name: "卖单模板", description: "按持仓渠道优先拆单", channels: ["QFII", "CMSI_SC999", "SJN-MOCK2"] },
  { id: "default", name: "默认模板", description: "全局兜底路由", channels: ["CMSI_SC999", "SJN-MOCK1"] },
  { id: "future-sell", name: "期货卖出模板", description: "期货平仓路由", channels: ["QFII2", "CMSI_SC999"] },
];

const defaultRules: Rule[] = [
  { id: 1, business: "普通交易", contract: "股票", exchanges: ["深交所", "上交所", "深港通", "沪股通"], assets: ["全部"], direction: "买入", openClose: "默认", templateId: "buy", enabled: true, note: "开户默认买入规则" },
  { id: 2, business: "普通交易", contract: "股票", exchanges: ["深交所", "上交所", "深港通", "沪股通"], assets: ["全部"], direction: "卖出", openClose: "默认", templateId: "sell", enabled: true, note: "开户默认卖出规则" },
  { id: 3, business: "融资交易", contract: "股票", exchanges: ["深交所", "上交所", "香港交易所"], assets: ["全部"], direction: "开仓", openClose: "默认", templateId: "default", enabled: true, note: "" },
  { id: 4, business: "普通交易", contract: "期货", exchanges: ["大连商品交易所", "上海期货交易所"], assets: ["聚丙烯", "白银"], direction: "卖出", openClose: "平仓", templateId: "future-sell", enabled: true, note: "" },
];

const emptyRule = (): Rule => ({
  id: Date.now(), business: "普通交易", contract: "股票", exchanges: ["深交所", "上交所"], assets: ["全部"], direction: "买入", openClose: "默认", templateId: "buy", enabled: true, note: "",
});

const menu = ["基础信息", "账户参数", "期权交易权限", "期权保证金设置", "互换交易权限", "互换融资设置", "互换收费设置", "互换交易设置", "互换风控设置"];
const stockExchanges = ["深交所", "上交所", "深港通", "沪股通", "香港交易所"];
const futureExchanges = ["大连商品交易所", "上海期货交易所", "郑州商品交易所"];

export default function Home() {
  const [routeEnabled, setRouteEnabled] = useState(true);
  const [mode, setMode] = useState<"inherit" | "custom">("custom");
  const [rules, setRules] = useState<Rule[]>(defaultRules);
  const [templates, setTemplates] = useState<RouteTemplate[]>(defaultTemplates);
  const [selectedId, setSelectedId] = useState(1);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState("buy");
  const [templateName, setTemplateName] = useState("");
  const [toast, setToast] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bct-route-demo");
      if (saved) {
        const data = JSON.parse(saved);
        setRules(data.rules ?? defaultRules);
        setTemplates(data.templates ?? defaultTemplates);
        setRouteEnabled(data.routeEnabled ?? true);
        setMode(data.mode ?? "custom");
        setSavedAt(data.savedAt ?? "");
      }
    } catch { /* 保留演示数据 */ }
    setReady(true);
  }, []);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const selected = rules.find((rule) => rule.id === selectedId) ?? rules[0];
  const selectedTemplate = templates.find((item) => item.id === selected?.templateId);
  const activeTemplate = templates.find((item) => item.id === activeTemplateId) ?? templates[0];

  const requiredCoverage = useMemo(() => {
    const stockRules = rules.filter((rule) => rule.enabled && rule.contract === "股票" && rule.business === "普通交易");
    const hasBuy = stockRules.some((rule) => rule.direction === "买入");
    const hasSell = stockRules.some((rule) => rule.direction === "卖出");
    return { count: Number(hasBuy) + Number(hasSell), complete: hasBuy && hasSell };
  }, [rules]);

  const openCreate = () => {
    setEditing(emptyRule());
    setRuleModalOpen(true);
  };

  const openEdit = (rule: Rule) => {
    setEditing({ ...rule, exchanges: [...rule.exchanges], assets: [...rule.assets] });
    setRuleModalOpen(true);
  };

  const saveRule = (draft: Rule) => {
    if (!draft.exchanges.length) return flash("请至少选择一个交易所或通道");
    const duplicate = rules.some((rule) => rule.id !== draft.id && rule.business === draft.business && rule.contract === draft.contract && rule.direction === draft.direction && rule.openClose === draft.openClose && rule.exchanges.some((exchange) => draft.exchanges.includes(exchange)));
    if (duplicate) return flash("规则冲突：相同交易场景已存在报单模板");
    setRules((current) => current.some((rule) => rule.id === draft.id) ? current.map((rule) => rule.id === draft.id ? draft : rule) : [...current, draft]);
    setSelectedId(draft.id);
    setRuleModalOpen(false);
    flash("规则已保存");
  };

  const removeRule = (id: number) => {
    const target = rules.find((rule) => rule.id === id);
    if (!target || !window.confirm(`确定删除“${target.business} / ${target.direction}”规则吗？`)) return;
    const next = rules.filter((rule) => rule.id !== id);
    setRules(next);
    setSelectedId(next[0]?.id ?? 0);
    flash("规则已删除，未覆盖场景将沿用全局配置");
  };

  const duplicateRule = (rule: Rule) => {
    const copy = { ...rule, id: Date.now(), exchanges: [...rule.exchanges], note: `${rule.note || "规则"}（副本）` };
    setEditing(copy);
    setRuleModalOpen(true);
  };

  const saveAll = () => {
    if (routeEnabled && mode === "custom" && !requiredCoverage.complete) return flash("请先补齐股票买入和卖出规则");
    const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    localStorage.setItem("bct-route-demo", JSON.stringify({ rules, templates, routeEnabled, mode, savedAt: time }));
    setSavedAt(time);
    flash("开户配置已保存到本机");
  };

  const resetDemo = () => {
    if (!window.confirm("恢复演示数据将覆盖当前未保存内容，是否继续？")) return;
    setRules(defaultRules);
    setTemplates(defaultTemplates);
    setRouteEnabled(true);
    setMode("custom");
    setSelectedId(1);
    localStorage.removeItem("bct-route-demo");
    flash("已恢复演示数据");
  };

  const moveChannel = (index: number, delta: number) => {
    if (!activeTemplate) return;
    const target = index + delta;
    if (target < 0 || target >= activeTemplate.channels.length) return;
    const channels = [...activeTemplate.channels];
    [channels[index], channels[target]] = [channels[target], channels[index]];
    setTemplates((current) => current.map((item) => item.id === activeTemplate.id ? { ...item, channels } : item));
  };

  const addTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    setTemplates((current) => [...current, { id, name, description: "当前账户自定义模板", channels: ["CMSI_SC999"] }]);
    setActiveTemplateId(id);
    setTemplateName("");
    flash("新模板已创建");
  };

  if (!ready) return <main className="loading-screen">正在载入开户配置…</main>;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">T</div>
        <span className="brand-name">BCT</span>
        <span className="top-divider" />
        <strong>新增交易账户</strong>
        <div className="account-summary"><span>客户</span><b>杭州明远投资管理有限公司</b><span>资金账户</span><b>FA20260804018</b></div>
        <button className="icon-button" aria-label="关闭">×</button>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="directory-title">开户目录</div>
          <div className="progress-block"><div className="progress-copy"><span>配置进度</span><b>7 / 9</b></div><div className="progress-track"><i /></div></div>
          <nav aria-label="开户步骤">
            {menu.map((item, index) => <button key={item} className={index === 7 ? "active" : index < 7 ? "done" : ""}><span>{index < 7 ? "✓" : index + 1}</span>{item}</button>)}
          </nav>
          <div className="sidebar-help"><b>路由配置提示</b><p>账户专属规则优先匹配；未命中时系统自动沿用全局规则。</p></div>
        </aside>

        <section className="content">
          <div className="page-heading">
            <div><p>交易账户 / 新增 / 第 7 步</p><h1>互换交易设置</h1><span>配置当前交易账户的可交易场景与报单路由策略</span></div>
            <div className="heading-actions"><button className="btn secondary" onClick={resetDemo}>恢复演示数据</button><button className="btn secondary" onClick={() => setTemplateModalOpen(true)}>管理报单模板</button></div>
          </div>

          <section className="permission-strip">
            <div><span className="eyebrow">当前交易权限</span><div className="permission-tags"><em>普通交易</em><em>融资交易</em><em>股票</em><em>期货</em></div></div>
            <div className="permission-markets"><span>已开通市场</span><b>沪深市场、港股通、香港交易所、境内期货</b></div>
            <button className="text-button">查看权限明细</button>
          </section>

          <section className="panel route-panel">
            <div className="panel-head">
              <div><h2>智能路由 / 报单排序</h2><p>按业务场景指定报单排序模板，控制订单的对冲渠道优先级。</p></div>
              <label className="switch-control"><span>{routeEnabled ? "已启用" : "未启用"}</span><input type="checkbox" checked={routeEnabled} onChange={(event) => setRouteEnabled(event.target.checked)} /><i /></label>
            </div>

            <div className={`panel-body ${!routeEnabled ? "disabled-area" : ""}`}>
              <div className="info-banner"><span>i</span><div><b>生效优先级</b><p>当前账户的专属规则优先于全局规则；专属规则未覆盖的交易场景，会自动继承全局配置。</p></div></div>

              <fieldset className="mode-group">
                <legend>配置方式</legend>
                <label className={mode === "inherit" ? "selected" : ""}><input type="radio" name="mode" checked={mode === "inherit"} onChange={() => setMode("inherit")} /><span className="radio-dot" /><div><b>完全沿用全局配置</b><p>不为当前账户生成专属路由规则</p></div></label>
                <label className={mode === "custom" ? "selected" : ""}><input type="radio" name="mode" checked={mode === "custom"} onChange={() => setMode("custom")} /><span className="radio-dot" /><div><b>为当前账户单独配置</b><p>可按业务、市场、方向选择不同模板</p></div></label>
              </fieldset>

              {mode === "custom" && <>
                <div className="rule-toolbar">
                  <div><h3>场景规则</h3><span>{rules.length} 条账户专属规则</span></div>
                  <div className={`coverage ${requiredCoverage.complete ? "ok" : "warning"}`}><span>{requiredCoverage.complete ? "✓" : "!"}</span><div><b>{requiredCoverage.complete ? "必需场景已覆盖" : "存在未覆盖场景"}</b><small>股票买卖方向 {requiredCoverage.count}/2</small></div></div>
                  <button className="btn primary" onClick={openCreate}>＋ 新增规则</button>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead><tr><th>状态</th><th>业务类型</th><th>合约类型</th><th>交易所 / 通道</th><th>资产品种</th><th>交易方向</th><th>开平</th><th>报单模板</th><th>操作</th></tr></thead>
                    <tbody>
                      {rules.map((rule) => {
                        const template = templates.find((item) => item.id === rule.templateId);
                        return <tr key={rule.id} className={selected?.id === rule.id ? "selected-row" : ""} onClick={() => setSelectedId(rule.id)}>
                          <td><button className={`status-toggle ${rule.enabled ? "on" : ""}`} aria-label={rule.enabled ? "停用规则" : "启用规则"} onClick={(event) => { event.stopPropagation(); setRules((current) => current.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item)); }}><i /></button></td>
                          <td>{rule.business}</td><td>{rule.contract}</td>
                          <td><div className="tag-cell">{rule.exchanges.slice(0, 3).map((item) => <span key={item}>{item}</span>)}{rule.exchanges.length > 3 && <span>+{rule.exchanges.length - 3}</span>}</div></td>
                          <td><div className="tag-cell neutral">{rule.assets.map((item) => <span key={item}>{item}</span>)}</div></td>
                          <td><b className={`direction ${rule.direction === "卖出" ? "sell" : "buy"}`}>{rule.direction}</b></td><td>{rule.openClose}</td><td><b>{template?.name ?? "模板已失效"}</b></td>
                          <td><div className="row-actions"><button onClick={(event) => { event.stopPropagation(); openEdit(rule); }}>编辑</button><button onClick={(event) => { event.stopPropagation(); duplicateRule(rule); }}>复制</button><button className="danger" onClick={(event) => { event.stopPropagation(); removeRule(rule.id); }}>删除</button></div></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>

                {selected && <div className="route-preview">
                  <div className="preview-summary"><span className="eyebrow">所选规则</span><b>{selected.business} · {selected.contract} · {selected.direction} · {selected.openClose}</b><p>{selected.note || "该规则未填写备注"}</p></div>
                  <div className="preview-template"><div><span className="eyebrow">{selectedTemplate?.name}</span><small>{selectedTemplate?.description}</small></div><div className="channel-flow">{selectedTemplate?.channels.map((channel, index) => <div className="channel-step" key={channel}><span>{index + 1}</span><b>{channel}</b>{index < selectedTemplate.channels.length - 1 && <i>→</i>}</div>)}</div></div>
                </div>}
              </>}
            </div>
          </section>

          <section className="panel collapsed-panel"><div><h2>互换风控设置</h2><p>到期策略、风控指标及账户单票比例限制</p></div><span>下一项</span><button aria-label="展开">⌄</button></section>
        </section>
      </div>

      <footer className="action-bar"><div>{savedAt ? <span className="saved-state">✓ 上次保存 {savedAt}</span> : <span>所有更改仅用于本地演示</span>}</div><button className="btn secondary" onClick={() => flash("已返回上一步")}>上一步</button><button className="btn secondary" onClick={() => setTemplateModalOpen(true)}>模板设置</button><button className="btn secondary" onClick={() => flash("已生成“明远标准账户模板”")}>另存为模板</button><button className="btn secondary" onClick={() => flash("已取消本次操作")}>取消</button><button className="btn primary" onClick={saveAll}>确定并保存</button></footer>

      {ruleModalOpen && editing && <RuleModal draft={editing} templates={templates} onClose={() => setRuleModalOpen(false)} onSave={saveRule} />}
      {templateModalOpen && <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setTemplateModalOpen(false)}>
        <section className="modal template-modal" role="dialog" aria-modal="true" aria-labelledby="template-title">
          <header><div><p>OMS 管理 / 报单排序模板</p><h2 id="template-title">管理报单排序模板</h2></div><button aria-label="关闭" onClick={() => setTemplateModalOpen(false)}>×</button></header>
          <div className="template-workspace">
            <aside><div className="template-add"><input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="新模板名称" /><button onClick={addTemplate}>＋</button></div>{templates.map((template) => <button key={template.id} className={activeTemplate?.id === template.id ? "active" : ""} onClick={() => setActiveTemplateId(template.id)}><b>{template.name}</b><span>{template.channels.length} 个渠道</span></button>)}</aside>
            {activeTemplate && <div className="template-editor"><div className="template-editor-head"><div><span className="eyebrow">模板名称</span><h3>{activeTemplate.name}</h3><p>{activeTemplate.description}</p></div><span className="template-usage">{rules.filter((rule) => rule.templateId === activeTemplate.id).length} 条规则正在使用</span></div><div className="channel-list-head"><b>对冲渠道优先级</b><span>使用上下按钮调整报单顺序</span></div><ol className="channel-list">{activeTemplate.channels.map((channel, index) => <li key={channel}><span className="drag-handle">⋮⋮</span><i>{index + 1}</i><b>{channel}</b><small>{index === 0 ? "首选渠道" : "前序渠道失败后尝试"}</small><div><button aria-label="上移" disabled={index === 0} onClick={() => moveChannel(index, -1)}>↑</button><button aria-label="下移" disabled={index === activeTemplate.channels.length - 1} onClick={() => moveChannel(index, 1)}>↓</button></div></li>)}</ol><button className="add-channel" onClick={() => { const name = window.prompt("请输入渠道代码"); if (name) setTemplates((current) => current.map((item) => item.id === activeTemplate.id ? { ...item, channels: [...item.channels, name.trim()] } : item)); }}>＋ 添加对冲渠道</button></div>}
          </div>
          <footer><button className="btn secondary" onClick={() => setTemplateModalOpen(false)}>取消</button><button className="btn primary" onClick={() => { setTemplateModalOpen(false); flash("模板顺序已更新"); }}>保存模板</button></footer>
        </section>
      </div>}

      {toast && <div className={`toast ${toast.includes("请") || toast.includes("冲突") || toast.includes("未覆盖") ? "error" : ""}`}><span>{toast.includes("请") || toast.includes("冲突") ? "!" : "✓"}</span>{toast}</div>}
    </main>
  );
}

function RuleModal({ draft, templates, onClose, onSave }: { draft: Rule; templates: RouteTemplate[]; onClose: () => void; onSave: (rule: Rule) => void }) {
  const [rule, setRule] = useState(draft);
  const exchanges = rule.contract === "股票" ? stockExchanges : futureExchanges;
  const toggleExchange = (exchange: string) => setRule((current) => ({ ...current, exchanges: current.exchanges.includes(exchange) ? current.exchanges.filter((item) => item !== exchange) : [...current.exchanges, exchange] }));
  return <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal rule-modal" role="dialog" aria-modal="true" aria-labelledby="rule-title">
      <header><div><p>账户专属报单排序</p><h2 id="rule-title">{defaultRules.some((item) => item.id === rule.id) ? "编辑场景规则" : "新增场景规则"}</h2></div><button aria-label="关闭" onClick={onClose}>×</button></header>
      <div className="modal-body">
        <div className="form-grid">
          <label><span><em>*</em>业务类型</span><select value={rule.business} onChange={(event) => setRule({ ...rule, business: event.target.value })}><option>普通交易</option><option>融资交易</option></select></label>
          <label><span><em>*</em>合约类型</span><select value={rule.contract} onChange={(event) => { const contract = event.target.value; setRule({ ...rule, contract, exchanges: contract === "股票" ? ["深交所", "上交所"] : ["大连商品交易所"], assets: contract === "股票" ? ["全部"] : ["聚丙烯"] }); }}><option>股票</option><option>期货</option></select></label>
          <label><span><em>*</em>交易方向</span><select value={rule.direction} onChange={(event) => setRule({ ...rule, direction: event.target.value as Direction })}><option>买入</option><option>卖出</option><option>开仓</option></select></label>
          <label><span>开平标识</span><select value={rule.openClose} onChange={(event) => setRule({ ...rule, openClose: event.target.value as OpenClose })}><option>默认</option><option>开仓</option><option>平仓</option></select></label>
        </div>
        <fieldset className="check-field"><legend><em>*</em>交易所 / 通道</legend><div>{exchanges.map((exchange) => <label key={exchange} className={rule.exchanges.includes(exchange) ? "checked" : ""}><input type="checkbox" checked={rule.exchanges.includes(exchange)} onChange={() => toggleExchange(exchange)} />{exchange}</label>)}</div></fieldset>
        <div className="form-grid lower-grid">
          <label><span>资产品种</span><select value={rule.assets[0]} onChange={(event) => setRule({ ...rule, assets: [event.target.value] })}>{rule.contract === "股票" ? <><option>全部</option><option>A股</option><option>港股</option></> : <><option>全部</option><option>聚丙烯</option><option>白银</option></>}</select></label>
          <label><span><em>*</em>报单排序模板</span><select value={rule.templateId} onChange={(event) => setRule({ ...rule, templateId: event.target.value })}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
          <label className="full-field"><span>备注</span><input value={rule.note} onChange={(event) => setRule({ ...rule, note: event.target.value })} placeholder="例如：适用于沪深普通交易买单" /></label>
        </div>
        <div className="modal-template-preview"><span>模板渠道顺序</span>{templates.find((item) => item.id === rule.templateId)?.channels.map((channel, index, list) => <div key={channel}><i>{index + 1}</i><b>{channel}</b>{index < list.length - 1 && <em>→</em>}</div>)}</div>
      </div>
      <footer><button className="btn secondary" onClick={onClose}>取消</button><button className="btn primary" onClick={() => onSave(rule)}>保存规则</button></footer>
    </section>
  </div>;
}
