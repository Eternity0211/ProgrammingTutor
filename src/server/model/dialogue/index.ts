import { DialogueOrchestrator } from "./orchestrator";
import { InMemorySessionStore } from "./memory";
import { InMemoryProfileStore } from "./profile";

let orchestratorInstance: DialogueOrchestrator | null = null;

export function getDialogueOrchestrator(): DialogueOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new DialogueOrchestrator({
      sessionStore: new InMemorySessionStore(),
      profileStore: new InMemoryProfileStore(),
    });
  }
  return orchestratorInstance;
}

export { DialogueOrchestrator } from "./orchestrator";
