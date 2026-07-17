import Sidebar from "@/components/Sidebar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import AiAssistant from "@/components/AiAssistant";
import MessageBoard from "@/components/MessageBoard";
import Reveal from "@/components/Reveal";

export default function Page() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <Hero />
        <About />
        <AiAssistant />
        <MessageBoard />
        <div className="footnote">
          © {new Date().getFullYear()} 张明 · AI 助手由 RAG 基于个人文档驱动
        </div>
      </main>
      <Reveal />
    </div>
  );
}
