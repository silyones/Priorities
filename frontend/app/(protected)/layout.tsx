import { SiteNav } from "@/components/SiteNav";
import { GoogleTranslate } from "@/components/GoogleTranslate";
import { AuthGuard } from "@/components/AuthGuard";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <GoogleTranslate />
      <SiteNav />
      <main>{children}</main>
    </AuthGuard>
  );
}
