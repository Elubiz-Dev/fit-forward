import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Auth Header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      console.error("[Groq Proxy] Error: GROQ_API_KEY is not configured in Supabase secrets.");
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY is not configured in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let url = "https://api.groq.com/openai/v1/chat/completions";
    let body: any;

    try {
      if (contentType.includes("multipart/form-data")) {
        url = "https://api.groq.com/openai/v1/audio/transcriptions";
        body = await req.formData();
      } else {
        // Use text() and then parse to avoid potential stringification issues
        // and to allow pass-through if needed, but we keep JSON for logging/validation.
        const rawBody = await req.text();
        try {
          JSON.parse(rawBody); // Validate JSON
          body = rawBody;
        } catch (e) {
          throw new Error("Invalid JSON body");
        }
      }
    } catch (e) {
      console.error("[Groq Proxy] Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "Failed to parse request body", details: e.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Groq Proxy] Forwarding request to: ${url}`);

    const groqResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        ...(contentType.includes("application/json") ? { "Content-Type": "application/json" } : {}),
      },
      body: body,
    });

    const responseText = await groqResponse.text();
    let groqData;
    try {
      groqData = JSON.parse(responseText);
    } catch (e) {
      groqData = { error: "Non-JSON response from Groq", raw: responseText };
    }

    if (!groqResponse.ok) {
      console.error(`[Groq Proxy] Groq API error (${groqResponse.status}):`, JSON.stringify(groqData));
      // Return the actual Groq error to the client
      return new Response(JSON.stringify(groqData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: groqResponse.status,
      });
    }

    return new Response(JSON.stringify(groqData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[Groq Proxy] Internal Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
