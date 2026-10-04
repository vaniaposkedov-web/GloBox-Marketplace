import { HomeContent } from "@/widgets/home-content";
import { SiteHeader } from "@/widgets/header";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <SiteHeader />
      <main className="flex-1">
        <HomeContent />
      </main>
    </div>
  );
}
