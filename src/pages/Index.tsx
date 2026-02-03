import { TheMapQuiz } from "@/components/quiz/TheMapQuiz";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";

const Index = () => {
  const { isAdmin } = useAuth();

  return (
    <div className="relative">
      {isAdmin && (
        <Link
          to="/admin"
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg shadow-sm hover:bg-muted transition-colors"
        >
          <Settings className="w-4 h-4" />
          Admin
        </Link>
      )}
      <TheMapQuiz />
    </div>
  );
};

export default Index;
