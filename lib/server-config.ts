import { env } from "cloudflare:workers";
import type { AIConfig } from "./ai-server";
export function aiConfig():AIConfig {
  const vars=env as Record<string,unknown>;
  return {key:String(vars.OPENAI_API_KEY||process.env.OPENAI_API_KEY||""),askModel:String(vars.OPENAI_ASK_MODEL||process.env.OPENAI_ASK_MODEL||"gpt-4.1-mini"),editModel:String(vars.OPENAI_EDIT_MODEL||process.env.OPENAI_EDIT_MODEL||"gpt-image-2")};
}
