import {
  getPromptDefinition,
  listPromptDefinitions,
  promptContractHeader,
} from "@/server/model/prompts/registry";

describe("prompt registry", () => {
  it("uses unique IDs, semantic versions, and stable fingerprints", () => {
    const definitions = listPromptDefinitions();
    expect(new Set(definitions.map((item) => item.id)).size).toBe(definitions.length);
    for (const definition of definitions) {
      expect(definition.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(definition.fingerprint).toMatch(/^[a-f0-9]{16}$/);
      expect(definition.contract.length).toBeGreaterThan(20);
    }
  });

  it("returns a traceable contract header", () => {
    const prompt = getPromptDefinition("rag.grounded-answer");
    expect(promptContractHeader(prompt.id)).toContain(
      `${prompt.id}@${prompt.version}`,
    );
    expect(promptContractHeader(prompt.id)).toContain(prompt.fingerprint);
  });

  it("fails closed for unregistered prompt IDs", () => {
    expect(() => getPromptDefinition("unknown.prompt")).toThrow(
      "Unknown prompt definition",
    );
  });
});
