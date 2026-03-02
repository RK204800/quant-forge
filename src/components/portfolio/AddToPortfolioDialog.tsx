import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolios, useCreatePortfolio, useAddToPortfolio } from "@/hooks/use-portfolios";
import { Plus, Briefcase, Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AddToPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyIds: string[];
}

export function AddToPortfolioDialog({ open, onOpenChange, strategyIds }: AddToPortfolioDialogProps) {
  const { data: portfolios = [], isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const addToPortfolio = useAddToPortfolio();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const handleAddToExisting = async (portfolioId: string, portfolioName: string) => {
    try {
      await addToPortfolio.mutateAsync({ portfolioId, strategyIds });
      toast.success(`Added to "${portfolioName}"`, {
        action: { label: "View", onClick: () => navigate(`/portfolio/${portfolioId}`) },
      });
      onOpenChange(false);
    } catch { }
  };

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return;
    try {
      const id = await createPortfolio.mutateAsync({ name: newName.trim() });
      await addToPortfolio.mutateAsync({ portfolioId: id, strategyIds });
      toast.success(`Created "${newName.trim()}" and added strategies`, {
        action: { label: "View", onClick: () => navigate(`/portfolio/${id}`) },
      });
      setNewName("");
      setShowCreate(false);
      onOpenChange(false);
    } catch { }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Add to Portfolio</DialogTitle>
          <DialogDescription>
            {strategyIds.length === 1 ? "Choose a portfolio or create a new one." : `Add ${strategyIds.length} strategies to a portfolio.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {/* Create new */}
          {showCreate ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                placeholder="Portfolio name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
                className="h-9 text-sm font-mono"
              />
              <Button size="sm" className="h-9 gap-1" onClick={handleCreateAndAdd} disabled={!newName.trim() || createPortfolio.isPending}>
                <Check className="h-3 w-3" /> Create
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm font-mono hover:bg-accent transition-colors border border-dashed border-border"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              Create New Portfolio
            </button>
          )}

          {/* Existing portfolios */}
          {isLoading ? (
            <p className="text-xs text-muted-foreground px-3 py-2">Loading...</p>
          ) : portfolios.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-2">No portfolios yet. Create one above.</p>
          ) : (
            portfolios.map((p) => (
              <button
                key={p.id}
                onClick={() => handleAddToExisting(p.id, p.name)}
                disabled={addToPortfolio.isPending}
                className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-mono hover:bg-accent transition-colors text-left"
              >
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.strategyCount} strategies</p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
