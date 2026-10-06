import { aiConfig } from "@/lib/server-config";
import { json } from "@/lib/ai-server";
export async function GET(){const c=aiConfig();return json({configured:!!c.key,askModel:c.askModel,editModel:c.editModel});}
