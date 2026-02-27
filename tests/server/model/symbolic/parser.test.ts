import {
  getParser,
  getLanguage,
  parseCode,
} from "../../../../src/server/model/symbolic/parser";
import path from "path";
import fs from "fs";

// =============================================================================
// Pre-flight Checks
// =============================================================================

const publicDir = path.join(process.cwd(), "public");
const wasmPath = path.join(publicDir, "tree-sitter-cpp.wasm");

// Verify WASM existence to provide clear feedback during CI/CD or local setup
if (!fs.existsSync(wasmPath)) {
  console.warn(
    "⚠️  [Test Setup] 'tree-sitter-cpp.wasm' not found. Integration tests generally require this file.",
  );
}

// =============================================================================
// Test Suite: Symbolic Parser
// =============================================================================

describe("Symbolic Parser (Infrastructure Layer)", () => {
  /**
   * Test Case: Initialization
   * Verifies that the parser singleton is correctly instantiated.
   */
  it("should initialize the parser successfully", async () => {
    const parser = await getParser();
    expect(parser).toBeDefined();
    // Verify instance validity by checking for the core 'parse' method
    expect(typeof parser.parse).toBe("function");
  });

  /**
   * Test Case: Singleton Pattern
   * Verifies that multiple calls return the exact same instance to optimize performance.
   */
  it("should return the SAME instance on subsequent calls (Singleton Pattern)", async () => {
    const parser1 = await getParser();
    const parser2 = await getParser();
    expect(parser1).toBe(parser2);
  });

  /**
   * Test Case: Language Loading
   * Indirectly verifies the WASM bundle is loaded by attempting to parse a minimal unit.
   */
  it("should load the C++ language correctly", async () => {
    const language = await getLanguage();
    expect(language).toBeDefined();

    // Strategy: We validate the language loading by parsing a trivial snippet.
    // This is more robust than checking specific API properties (like parser.getLanguage())
    // which may differ across web-tree-sitter versions.
    const parser = await getParser();
    const testCode = "int main() {}";
    const tree = parser.parse(testCode);

    // A successful 'translation_unit' confirms the C++ grammar is active.
    expect(tree.rootNode.type).toBe("translation_unit");
  });

  /**
   * Test Case: AST Generation
   * Verifies that valid C++ code produces the expected node structure.
   */
  it("should parse valid C++ code into an AST", async () => {
    const code = `
      #include <iostream>
      int main() {
        int a = 10;
        return 0;
      }
    `;

    const tree = await parseCode(code);

    expect(tree).toBeDefined();
    expect(tree.rootNode).toBeDefined();
    expect(tree.rootNode.type).toBe("translation_unit");

    // Verify AST contains specific grammatical structures (e.g., function definition)
    const structure = tree.rootNode.toString();
    expect(structure).toContain("function_definition");
  });

  /**
   * Test Case: Edge Case Handling
   * Verifies that empty input is handled gracefully without throwing.
   */
  it("should handle empty strings without crashing", async () => {
    const tree = await parseCode("");
    expect(tree.rootNode).toBeDefined();
    expect(tree.rootNode.type).toBe("translation_unit");
  });

  /**
   * Test Case: Compiler-Level Syntax Error Detection
   * Verifies that invalid syntax produces standard Error/Missing nodes in the AST.
   */
  it("should produce error nodes for invalid syntax (Compiler Check Prep)", async () => {
    // Input with deliberate syntax error (invalid type 'in')
    const badCode = "int main() { in a = 10 }";

    const tree = await parseCode(badCode);

    // Robustness: Use .toString() to detect errors.
    // Direct API calls like .hasError() are not consistently available in all WASM bindings.
    // Error nodes will appear as (ERROR ...) or (MISSING ...) in the string dump.
    const treeString = tree.rootNode.toString();
    const containsError =
      treeString.includes("ERROR") || treeString.includes("MISSING");

    expect(containsError).toBe(true);
  });
});
