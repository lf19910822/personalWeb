"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ProjectCardContent, type ProjectCardContentData } from "@/components/ProjectCardContent";
import { scrollToPageElement } from "@/lib/smooth-scroll";

type ProjectCard = ProjectCardContentData & {
  id: string;
  sortOrder: number;
};
const STACK_HEADER_HEIGHT = 56;

export default function ProjectCases() {
  const [projects, setProjects] = useState<ProjectCard[] | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [movingCard, setMovingCard] = useState<{ id: string; fromIndex: number } | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const pendingScrollId = useRef<string | null>(null);
  const animationTimer = useRef<number | undefined>(undefined);
  const scrollTimer = useRef<number | undefined>(undefined);
  const cancelScroll = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    fetch("/api/projects")
      .then(async (response) => response.ok ? response.json() : { projects: [] })
      .then((data) => {
        const next = data.projects || [];
        setProjects(next);
        setOrder(next.map((project: ProjectCard) => project.id));
      })
      .catch(() => {
        setProjects([]);
        setOrder([]);
      });
  }, []);

  useEffect(() => () => {
    if (animationTimer.current) window.clearTimeout(animationTimer.current);
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    cancelScroll.current?.();
  }, []);

  useEffect(() => {
    const id = pendingScrollId.current;
    if (!id) return;
    pendingScrollId.current = null;
    scrollTimer.current = window.setTimeout(() => {
      const target = stackRef.current?.querySelector<HTMLElement>(`[data-project-id="${id}"]`);
      if (!target) return;
      cancelScroll.current?.();
      const stackOffset = Number.parseFloat(target.style.getPropertyValue("--stack-offset")) || 0;
      const fromStackOffset = Number.parseFloat(target.style.getPropertyValue("--from-stack-offset")) || 0;
      cancelScroll.current = scrollToPageElement(target, { targetTopAdjustment: stackOffset - fromStackOffset });
    }, 0);
  }, [order]);

  function askAbout(project: ProjectCard) {
    const question = `请介绍 ${project.title} 中的架构设计、我的职责与项目成果。`;
    window.dispatchEvent(new CustomEvent("ask-project-ai", { detail: question }));
    const target = document.getElementById("ai");
    if (target) scrollToPageElement(target);
  }

  if (!projects?.length) return null;
  const byId = new Map(projects.map((project) => [project.id, project]));
  const orderedProjects = order.map((id) => byId.get(id)).filter((project): project is ProjectCard => Boolean(project));
  const isStack = orderedProjects.length > 1;

  function activate(id: string) {
    const fromIndex = order.indexOf(id);
    if (fromIndex < 0 || fromIndex === order.length - 1) return;
    if (animationTimer.current) window.clearTimeout(animationTimer.current);
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    cancelScroll.current?.();
    cancelScroll.current = undefined;
    setMovingCard({ id, fromIndex });
    pendingScrollId.current = id;
    setOrder((current) => [...current.filter((itemId) => itemId !== id), id]);
    animationTimer.current = window.setTimeout(() => setMovingCard(null), 480);
  }

  return (
    <section id="projects" className="reveal">
      <div className="eyebrow">Selected Work</div>
      <h2>项目案例</h2>
      <p className="lead">聚焦问题、工程决策与可验证的业务结果。</p>
      <div ref={stackRef} className={"project-list" + (isStack ? " project-stack" : "")} style={isStack ? { "--stack-space": `${(orderedProjects.length - 1) * STACK_HEADER_HEIGHT}px` } as CSSProperties : undefined}>
        {orderedProjects.map((project, index) => {
          const active = index === orderedProjects.length - 1;
          const movingToActive = active && movingCard?.id === project.id;
          const fromIndex = movingToActive ? movingCard.fromIndex : index;
          const stackStyle = isStack ? { "--stack-offset": `${index * STACK_HEADER_HEIGHT}px`, "--from-stack-offset": `${fromIndex * STACK_HEADER_HEIGHT}px`, zIndex: active ? orderedProjects.length + 1 : orderedProjects.length - index } as CSSProperties : undefined;
          return (
            <article className={"project-card" + (active ? " is-active" : " is-collapsed") + (movingToActive ? " is-moving-to-active" : "")} key={project.id} style={stackStyle} data-project-id={project.id}>
              {active ? <ProjectCardContent project={project} onAsk={() => askAbout(project)} /> : (
                <button className="project-stack-tab" type="button" onClick={() => activate(project.id)} aria-label={`展开${project.title}`}>
                  <span>{project.title}</span><span aria-hidden="true">↗</span>
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
