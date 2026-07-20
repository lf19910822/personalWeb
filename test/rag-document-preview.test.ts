import { describe, expect, it } from "vitest";
import {
  prepareMarkdownDocument,
  previewMarkdownBatch,
  previewMarkdownDocument,
} from "../lib/rag-documents";

describe("RAG 文档预检", () => {
  it("使用文件名作为文档标识，并优先读取 front matter 元数据", () => {
    const preview = previewMarkdownDocument({
      fileName: "project-a.md",
      content: `---
title: A 项目技术复盘
description: 首屏性能优化与设计系统建设。
---

# A 项目

这里是正文。`,
    });

    expect(preview).toMatchObject({
      documentId: "project-a.md",
      title: "A 项目技术复盘",
      intro: "首屏性能优化与设计系统建设。",
    });
  });

  it("缺少 front matter 时从一级标题和首段正文生成元数据", () => {
    const preview = previewMarkdownDocument({
      fileName: "experience.md",
      content: `# 工作经历

负责复杂企业系统的前端架构与团队建设。

## 代表项目

项目详情。`,
    });

    expect(preview).toMatchObject({
      documentId: "experience.md",
      title: "工作经历",
      intro: "负责复杂企业系统的前端架构与团队建设。",
    });
  });

  it("按二级标题识别父块，并报告用于检索的子块数量", () => {
    const preview = previewMarkdownDocument({
      fileName: "projects.md",
      content: `# 项目资料

## A 项目

A 项目的技术方案和成果。

## B 项目

B 项目的技术方案和成果。`,
    });

    expect(preview).toMatchObject({ parentCount: 2, childCount: 2 });
  });

  it("将过长的父块按段落拆成多个检索子块", () => {
    const preview = previewMarkdownDocument({
      fileName: "long-project.md",
      content: `## 性能复盘

${"甲".repeat(250)}

${"乙".repeat(250)}`,
    });

    expect(preview).toMatchObject({ parentCount: 1, childCount: 2 });
  });

  it("让检索子块保留标题路径并关联所属父块", () => {
    const document = prepareMarkdownDocument({
      fileName: "project-a.md",
      content: `# 项目资料

## A 项目

负责首屏性能优化与设计系统建设。`,
    });

    expect(document.parents[0]).toMatchObject({ headingPath: ["项目资料", "A 项目"] });
    expect(document.children[0]).toMatchObject({ parentId: document.parents[0].id });
    expect(document.children[0].content).toContain("项目资料 > A 项目");
  });

  it("不将同一个 fenced code block 切到不同子块", () => {
    const codeBlock = `\`\`\`txt
${"甲".repeat(200)}

${"乙".repeat(200)}
\`\`\``;
    const document = prepareMarkdownDocument({
      fileName: "code-example.md",
      content: `## 实现细节

${codeBlock}`,
    });

    expect(document.children.some((child) => child.content.includes(codeBlock))).toBe(true);
  });

  it("为一批 Markdown 文件分别生成预检结果", () => {
    const batch = previewMarkdownBatch([
      { fileName: "resume.md", content: "# 个人简历\n\n前端工程师。" },
      { fileName: "project.md", content: "# 项目复盘\n\n项目成果。" },
    ]);

    expect(batch.documents.map((document) => document.documentId)).toEqual([
      "resume.md",
      "project.md",
    ]);
  });

  it("在预检阶段拒绝批内重复的文档标识", () => {
    expect(() =>
      previewMarkdownBatch([
        { fileName: "resume.md", content: "# 第一版" },
        { fileName: "resume.md", content: "# 第二版" },
      ])
    ).toThrow("重复文件名: resume.md");
  });

  it("拒绝非 Markdown 文件", () => {
    expect(() =>
      previewMarkdownBatch([{ fileName: "resume.txt", content: "不是 Markdown 上传" }])
    ).toThrow("只支持 .md 文件: resume.txt");
  });
});
