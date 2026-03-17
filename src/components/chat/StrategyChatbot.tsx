import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { useLocation, useParams } from "react-router-dom";
import { useStrategy } from "@/hooks/use-strategies";
import { buildStrategyContext } from "@/lib/strategy-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strategy-advisor`;

async function streamChat({
  messages,
  strategyContext,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  strategyContext: string | null;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, strategyContext }),
  });

  if (!resp.ok) {
    let errMsg = "Failed to connect to AI advisor";
    try {
      const err = await resp.json();
      errMsg = err.error || errMsg;
    } catch { await resp.text(); }
    onError(errMsg);
    return;
  }

  if (!resp.body) { onError("No response stream"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    if (readerDone) break;
    buffer += decoder.decode(value, { stream: true });

    let nlIdx: number;
    while ((nlIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nlIdx);
      buffer = buffer.slice(nlIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  // flush remaining
  if (buffer.trim()) {
    for (let raw of buffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {}
    }
  }

  onDone();
}

export function StrategyChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextAttached, setContextAttached] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const location = useLocation();
  const params = useParams<{ id: string }>();
  const isStrategyPage = location.pathname.startsWith("/strategy/");
  const strategyId = isStrategyPage ? params.id : undefined;
  const { data: strategy } = useStrategy(strategyId);

  const strategyContext = contextAttached && strategy
    ? buildStrategyContext(strategy)
    : null;

  useEffect(() => {
    if (isStrategyPage && strategy && !contextAttached) {
      setContextAttached(true);
    }
  }, [isStrategyPage, strategy]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setInput("");
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        strategyContext,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          toast.error(err);
          setIsLoading(false);
        },
      });
    } catch {
      toast.error("Failed to reach AI advisor");
      setIsLoading(false);
    }
  }, [input, isLoading, messages, strategyContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
          aria-label="Open Strategy Advisor"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[560px] max-h-[80vh] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm text-foreground">Strategy Advisor</span>
            </div>
            <div className="flex items-center gap-1">
              {strategy && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setContextAttached(!contextAttached)}
                  title={contextAttached ? `Context: ${strategy.name} (click to detach)` : "Attach strategy context"}
                >
                  {contextAttached ? (
                    <Link2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Unlink className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Context chip */}
          {contextAttached && strategy && (
            <div className="px-4 py-1.5 border-b border-border bg-muted/50">
              <span className="text-xs text-muted-foreground">
                Analyzing: <span className="font-medium text-foreground">{strategy.name}</span>
              </span>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground text-sm px-6 gap-3">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p>Ask me about your strategy's performance, risk management, or improvements.</p>
                {strategy && !contextAttached && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContextAttached(true)}
                    className="text-xs"
                  >
                    <Link2 className="w-3 h-3 mr-1" /> Attach {strategy.name}
                  </Button>
                )}
              </div>
            )}
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking…</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your strategy…"
                rows={1}
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button
                size="icon"
                onClick={send}
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
