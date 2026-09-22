import { DialogueOrchestrator } from "./orchestrator";
import { DualSessionStore, DbSessionStore } from "./memory";
import { DbProfileStore, DualProfileStore } from "./profile";
import { RagEngine } from "./rag";

let orchestratorInstance: DialogueOrchestrator | null = null;

export function getDialogueOrchestrator(): DialogueOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new DialogueOrchestrator({
      sessionStore: new DualSessionStore(new DbSessionStore()),
      profileStore: new DualProfileStore(new DbProfileStore()),
      ragEngine: new RagEngine({ autoLoad: true, persistDocuments: true }),
    });
  }
  return orchestratorInstance;
}

export { DialogueOrchestrator } from "./orchestrator";
