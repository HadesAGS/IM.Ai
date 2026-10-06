import { handleAI } from "@/lib/ai-server";
import { aiConfig } from "@/lib/server-config";
export async function POST(request:Request){return handleAI(request,"edit",aiConfig());}
