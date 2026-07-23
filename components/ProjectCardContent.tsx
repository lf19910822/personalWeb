export type ProjectCardContentData = {
  title: string;
  summary: string;
  background: string;
  role: string;
  solutions: string[];
  results: string[];
  tags: string[];
};

export function ProjectCardContent({
  project,
  headerLabel = "PROJECT CASE",
  onAsk,
}: {
  project: ProjectCardContentData;
  headerLabel?: string;
  onAsk?: () => void;
}) {
  return <>
    <header className="project-card-head">
      <div>
        <p className="project-card-label">{headerLabel}</p>
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
      </div>
    </header>
    <div className="project-card-grid">
      <section><h4>背景 / 问题</h4><p>{project.background}</p></section>
      <section><h4>我的职责</h4><p>{project.role}</p></section>
      <section><h4>关键方案</h4><ul>{project.solutions.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h4>成果</h4><ul>{project.results.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>
    <footer className="project-card-foot">
      <div className="project-tags" aria-label="技术标签">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      {onAsk ? (
        <button className="project-ask" type="button" onClick={onAsk}>向 AI 了解此项目 <span aria-hidden="true">→</span></button>
      ) : (
        <span className="project-ask project-ask-static">向 AI 了解此项目 <span aria-hidden="true">→</span></span>
      )}
    </footer>
  </>;
}
