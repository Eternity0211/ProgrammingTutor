import { DialogueOrchestrator } from "./orchestrator";
import { DualSessionStore, DbSessionStore } from "./memory";
import { InMemoryProfileStore } from "./profile";

let orchestratorInstance: DialogueOrchestrator | null = null;

export function getDialogueOrchestrator(): DialogueOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new DialogueOrchestrator({
      sessionStore: new DualSessionStore(new DbSessionStore()),
      profileStore: new InMemoryProfileStore(),
    });
  }
  return orchestratorInstance;
}

export { DialogueOrchestrator } from "./orchestrator";
