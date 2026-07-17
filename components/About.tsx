export default function About() {
  return (
    <section id="about" className="reveal">
      <div className="eyebrow">About</div>
      <h2>关于我</h2>
      <p className="body">
        我相信好的工程是“看不见”的——用户只感受到顺畅,而背后是清晰的架构、可维护的代码与对性能近乎偏执的打磨。过去几年,我在交易、协作与企业中后台领域,既做技术决策,也带人把事落地。
      </p>
      <div className="skills" aria-label="技能">
        <span className="chip">React</span>
        <span className="chip">TypeScript</span>
        <span className="chip">Next.js</span>
        <span className="chip">Node.js</span>
        <span className="chip">性能优化</span>
        <span className="chip">设计系统</span>
        <span className="chip">团队管理</span>
      </div>
      <h2 style={{ marginTop: 48 }}>工作经历</h2>
      <div className="timeline">
        <div className="tl">
          <div className="tl-role">某科技公司 — 前端负责人</div>
          <div className="tl-meta">2021 — 至今 · 上海</div>
          <p className="tl-desc">
            从 0 搭建设计系统,统一 30+ 业务线组件;首屏性能提升 60%,前端交付周期缩短 40%。
          </p>
        </div>
        <div className="tl">
          <div className="tl-role">某互联网公司 — 高级前端</div>
          <div className="tl-meta">2018 — 2021 · 杭州</div>
          <p className="tl-desc">负责核心交易链路前端架构,主导微前端拆分与监控体系建设。</p>
        </div>
        <div className="tl">
          <div className="tl-role">某创业公司 — 前端工程师</div>
          <div className="tl-meta">2016 — 2018 · 深圳</div>
          <p className="tl-desc">早期成员,参与产品从 0 到 1 的全流程前端开发。</p>
        </div>
      </div>
    </section>
  );
}
