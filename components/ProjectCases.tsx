"use client";

import { useEffect, useState } from "react";

type ProjectCard = {
  id: string;
  title: string;
  summary: string;
  background: string;
  role: string;
  solutions: string[];
  results: string[];
  tags: string[];
  sortOrder: number;
};

export default function ProjectCases() {
  const [projects, setProjects] = useState<ProjectCard[] | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then(async (response) => response.ok ? response.json() : { projects: [] })
      .then((data) => setProjects(data.projects || []))
      .catch(() => setProjects([]));
  }, []);

  function askAbout(project: ProjectCard) {
    const question = `请介绍 ${project.title} 中的架构设计、我的职责与项目成果。`;
    window.dispatchEvent(new CustomEvent("ask-project-ai", { detail: question }));
    document.querySelector("#ai")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!projects?.length) return null;

  return (
    <section id="projects" className="reveal">
      <div className="eyebrow">Selected Work</div>
      <h2>项目案例</h2>
      <p className="lead">聚焦问题、工程决策与可验证的业务结果。</p>
      <div className="project-list">
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <header className="project-card-head">
              <div>
                <p className="project-card-label">PROJECT CASE</p>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
              </div>
            </header>
            <div className="project-card-grid">
              <section>
                <h4>背景 / 问题</h4>
                <p>{project.background}</p>
              </section>
              <section>
                <h4>我的职责</h4>
                <p>{project.role}</p>
              </section>
              <section>
                <h4>关键方案</h4>
                <ul>{project.solutions.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <section>
                <h4>成果</h4>
                <ul>{project.results.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            </div>
            <footer className="project-card-foot">
              <div className="project-tags" aria-label="技术标签">
                {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <button className="project-ask" type="button" onClick={() => askAbout(project)}>向 AI 了解此项目 <span aria-hidden="true">→</span></button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
