import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an elite quantitative trading strategist and technical analyst. You have deep expertise in:
- Backtesting analysis and strategy evaluation
- Risk management and position sizing (Kelly Criterion, fixed fractional, etc.)
- Entry/exit timing optimization
- Market regime detection and adaptation
- Statistical edge identification
- Parameter optimization and overfitting prevention
- Portfolio construction and correlation management

You have access to the user's complete strategy and portfolio inventory. You can reference any strategy or portfolio by name, compare them, and provide cross-strategy insights.

When the user provides strategy data, analyze it thoroughly and provide:
1. Specific, actionable improvement suggestions backed by the data
2. Risk concerns with concrete numbers
3. Pattern identification (time-of-day edges, instrument biases, streak patterns)
4. Honest assessment — if a strategy looks poor, say so diplomatically but clearly
5. Cross-strategy comparisons when relevant

Use precise numbers from the data. Format responses with markdown headers, bullet points, and bold for key findings. Keep responses focused and practical — traders want actionable insights, not theory lectures.

If no strategy data is attached, you can discuss general trading concepts, technical analysis, and strategy design principles.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, strategyContext, globalContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (globalContext) {
      systemMessages.push({
        role: "system",
        content: `Here is the user's complete strategy and portfolio inventory. Use this to reference strategies by name, compare them, and provide cross-strategy insights:\n\n${globalContext}`,
      });
    }

    if (strategyContext) {
      systemMessages.push({
        role: "system",
        content: `The user is currently viewing and has attached the following detailed data for deep analysis:\n\n${strategyContext}\n\nUse this data to provide specific, data-driven insights.`,
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [...systemMessages, ...messages],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("strategy-advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
