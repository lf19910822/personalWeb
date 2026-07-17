import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "张明 · 高级前端工程师",
  description:
    "高级前端工程师,8 年经验。专注复杂 B 端系统的顺滑体验,带过前端团队。基于个人文档的 AI 助手可随时答疑。",
};

// 在首屏绘制前同步主题,避免闪烁
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Serif+SC:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
