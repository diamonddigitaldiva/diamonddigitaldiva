import { TheMapQuiz } from "@/components/quiz/TheMapQuiz";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/SiteFooter";

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <div className="relative flex flex-col min-h-screen">
      {user && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg shadow-sm hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4" />
              Admin
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      )}
      <div className="flex-1">
        <TheMapQuiz />
      </div>
      <SiteFooter />
    </div>
  );
};

export default Index;
