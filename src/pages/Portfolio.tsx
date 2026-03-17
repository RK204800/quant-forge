import { usePortfolios, useCreatePortfolio } from "@/hooks/use-portfolios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Plus, Briefcase, ArrowRight } from "lucide-react";
import { formatEST } from "@/lib/timezone";

const Portfolio = () => {
  const { data: portfolios = [], isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createPortfolio.mutateAsync({ name: newName.trim() });
    setNewName("");
    setCreateOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Portfolios</h1>
          <p className="text-sm text-muted-foreground">Manage your strategy portfolios</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Portfolio
        </Button>
      </div>

      {portfolios.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Briefcase className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground font-mono text-sm">No portfolios yet. Create one to get started.</p>
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((p) => (
            <Link key={p.id} to={`/portfolio/${p.id}`}>
              <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    {p.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{p.strategyCount} strategies</span>
                    <span className="text-muted-foreground">{formatEST(p.createdAt, "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-primary">
                    View <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">Create Portfolio</DialogTitle>
            <DialogDescription>Give your new portfolio a name.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Portfolio name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createPortfolio.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Portfolio;
