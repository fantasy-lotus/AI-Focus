/**
 * @file TypeScript AST Adapter
 * @description Converts Tree-sitter TypeScript AST to a unified node structure.
 * @module analyzer/adapters/typescript-adapter
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/adapters/typescript-adapter.md} - TypeScript Adapter Documentation
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/README.md} - Code Analysis Module Documentation
 */

import Parser from "tree-sitter";
import { SourceLocation } from "../types";
import {
  NodeAdapter,
  UnifiedNode,
  UNodeType,
  FunctionNode,
  ClassNode,
  ImportNode,
  CallNode,
  InterfaceNode,
  TypeAliasNode,
  EnumNode,
  VariableNode,
} from "../unified-node";

/**
 * Maps Tree-sitter's TypeScript node types to our unified node types.
 */
const NODE_TYPE_MAP: Record<string, UNodeType | null> = {
  // Functions & Methods
  function_declaration: UNodeType.Function,
  method_definition: UNodeType.Function,
  arrow_function: UNodeType.Function,
  // Classes
  class_declaration: UNodeType.Class,
  // Imports
  import_statement: UNodeType.Import,
  // Calls
  call_expression: UNodeType.Call,
  // Interfaces & Types
  interface_declaration: UNodeType.Interface,
  type_alias_declaration: UNodeType.TypeAlias,
  // Enums
  enum_declaration: UNodeType.Enum,
  // Variables
  variable_declarator: UNodeType.Variable,
};

export class TypeScriptAdapter implements NodeAdapter {
  toUnifiedNodes(tree: Parser.Tree, filePath: string): UnifiedNode[] {
    const rootNode = tree.rootNode;
    const nodes: UnifiedNode[] = [];

    const moduleNode: UnifiedNode = {
      type: UNodeType.Module,
      name: filePath.split("/").pop() || "",
      location: this.getNodeLocation(rootNode),
      children: [],
      properties: {
        description: `TypeScript module from ${filePath}`,
      },
      originalNode: rootNode,
    };

    this.processChildren(rootNode, moduleNode);

    nodes.push(moduleNode);
    return nodes;
  }

  private processChildren(node: Parser.SyntaxNode, parent: UnifiedNode): void {
    for (const child of node.namedChildren) {
      const unifiedNode = this.convertNode(child, parent);
      if (unifiedNode) {
        parent.children.push(unifiedNode);
      } else {
        this.processChildren(child, parent);
      }
    }
  }

  convertNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): UnifiedNode | null {
    const nodeType = NODE_TYPE_MAP[node.type];
    if (!nodeType) return null;

    let unifiedNode: UnifiedNode | null = null;

    switch (nodeType) {
      case UNodeType.Function:
        unifiedNode = this.convertFunctionNode(node, parent);
        break;
      case UNodeType.Class:
        unifiedNode = this.convertClassNode(node, parent);
        break;
      case UNodeType.Import:
        unifiedNode = this.convertImportNode(node, parent);
        break;
      case UNodeType.Call:
        unifiedNode = this.convertCallNode(node, parent);
        break;
      case UNodeType.Interface:
        unifiedNode = this.convertInterfaceNode(node, parent);
        break;
      case UNodeType.TypeAlias:
        unifiedNode = this.convertTypeAliasNode(node, parent);
        break;
      case UNodeType.Enum:
        unifiedNode = this.convertEnumNode(node, parent);
        break;
      case UNodeType.Variable:
        unifiedNode = this.convertVariableNode(node, parent);
        break;
    }

    if (unifiedNode) {
      this.processChildren(node, unifiedNode);
    }

    return unifiedNode;
  }

  getErrorRatio(tree: Parser.Tree): number {
    const { errors, total } = this.countErrorNodes(tree.rootNode);
    if (total === 0) return 0;
    return errors / total;
  }

  private countErrorNodes(node: Parser.SyntaxNode): {
    errors: number;
    total: number;
  } {
    let errors = 0;
    let total = 1;

    if (node.type === "ERROR") {
      errors++;
    }

    for (const child of node.children) {
      const result = this.countErrorNodes(child);
      errors += result.errors;
      total += result.total;
    }

    return { errors, total };
  }

  private convertFunctionNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): FunctionNode | null {
    let name = "anonymous";
    let parameters: string[] = [];
    let returnType: string | undefined;

    // Find name
    const nameNode =
      this.findFirstChild(node, "identifier") ||
      this.findFirstChild(node, "property_identifier");
    if (nameNode) {
      name = nameNode.text;
    } else if (node.type === "arrow_function") {
      // Attempt to infer name from parent variable declaration
      if (parent && parent.type === UNodeType.Variable) {
        name = parent.name;
      }
    }

    // Find parameters
    const paramsNode = this.findFirstChild(node, "formal_parameters");
    if (paramsNode) {
      parameters = paramsNode.namedChildren.map((p) => p.text);
    }

    // Find return type
    const returnTypeNode = this.findFirstChild(node, "type_annotation");
    if (returnTypeNode) {
      // type_annotation is ': Type', we just want 'Type'
      returnType = returnTypeNode.lastChild?.text || "unknown";
    }

    const functionNode: FunctionNode = {
      type: UNodeType.Function,
      name,
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        parameters,
        returnType,
        isAsync: node.text.startsWith("async "),
      },
      originalNode: node,
    };

    return functionNode;
  }

  private convertClassNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): ClassNode | null {
    const nameNode = this.findFirstChild(node, "type_identifier");
    if (!nameNode) return null; // Anonymous classes not supported yet

    let superClass: string | undefined;
    let interfaces: string[] = [];

    const heritageNode = this.findFirstChild(node, "class_heritage");
    if (heritageNode) {
      // extends clause
      const extendsClause = this.findFirstChild(heritageNode, "extends_clause");
      if (extendsClause) {
        superClass = extendsClause.lastNamedChild?.text;
      }
      // implements clause
      const implementsClause = this.findFirstChild(
        heritageNode,
        "implements_clause"
      );
      if (implementsClause) {
        interfaces = this.findChildNodes(
          implementsClause,
          "type_identifier"
        ).map((id) => id.text);
      }
    }

    const decorators = this.findChildNodes(node, "decorator").map(
      (d) => d.text
    );

    const classNode: ClassNode = {
      type: UNodeType.Class,
      name: nameNode.text,
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        superClass,
        interfaces,
        decorators,
      },
      originalNode: node,
    };

    return classNode;
  }

  private convertImportNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): ImportNode | null {
    const sourceNode = node.lastNamedChild; // In an import_statement, the path string is always last.
    if (!sourceNode || sourceNode.type !== "string") return null;

    // "from './source'" -> './source'
    const source = sourceNode.text.slice(1, -1);
    const importClause = this.findFirstChild(node, "import_clause");

    let imported: string[] = [];
    let isDefault = false;
    let isNamespace = false;

    if (importClause) {
      // Handles: import defaultExport from '...'
      // The default export is a direct child identifier of the import_clause
      const defaultIdentifier = importClause.namedChildren.find(
        (child) => child.type === "identifier"
      );
      if (defaultIdentifier) {
        imported.push(defaultIdentifier.text);
        isDefault = true;
      }

      // Handles: import * as namespace from '...'
      const namespaceImport = this.findFirstChild(
        importClause,
        "namespace_import"
      );
      if (namespaceImport) {
        const identifier = this.findFirstChild(namespaceImport, "identifier");
        if (identifier) imported.push(identifier.text);
        isNamespace = true;
      }

      // Handles: import { named, a as aliased } from '...'
      const namedImportsNode = this.findFirstChild(
        importClause,
        "named_imports"
      );
      if (namedImportsNode) {
        const importSpecifiers = this.findChildNodes(
          namedImportsNode,
          "import_specifier"
        );
        for (const spec of importSpecifiers) {
          // For 'a as b', we want 'b'. For 'a', we want 'a'.
          // The last identifier in the specifier is always the one brought into scope.
          const identifierInScope = spec.lastNamedChild;
          if (identifierInScope && identifierInScope.type === "identifier") {
            imported.push(identifierInScope.text);
          }
        }
      }
    }

    return {
      type: UNodeType.Import,
      name: `import from ${source}`,
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        source,
        imported,
        isDefault,
        isNamespace,
      },
      originalNode: node,
    };
  }

  private convertCallNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): CallNode | null {
    const functionNode = node.firstNamedChild;
    if (!functionNode) return null;

    const name = functionNode.text;

    const argsNode = this.findFirstChild(node, "arguments");
    const args = argsNode ? argsNode.namedChildren.map((arg) => arg.text) : [];

    const callNode: CallNode = {
      type: UNodeType.Call,
      name: `call to ${name}`,
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        target: name,
        arguments: args,
      },
      originalNode: node,
    };
    return callNode;
  }

  private convertInterfaceNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): InterfaceNode | null {
    const nameNode = this.findFirstChild(node, "type_identifier");
    if (!nameNode) return null;

    let extended: string[] = [];
    const extendsClause = this.findFirstChild(node, "extends_type_clause");
    if (extendsClause) {
      extended = this.findChildNodes(extendsClause, "type_identifier").map(
        (id) => id.text
      );
    }

    return {
      type: UNodeType.Interface,
      name: nameNode.text,
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        extends: extended,
      },
      originalNode: node,
    };
  }

  private convertTypeAliasNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): TypeAliasNode | null {
    const nameNode = this.findFirstChild(node, "type_identifier");
    if (!nameNode) return null;

    const typeNode = node.lastNamedChild;
    const typeDefinition = typeNode ? typeNode.text : "unknown";

    return {
      type: UNodeType.TypeAlias,
      name: nameNode.text,
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        typeDefinition,
      },
      originalNode: node,
    };
  }

  private convertEnumNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): EnumNode | null {
    const nameNode = this.findFirstChild(node, "identifier");
    if (!nameNode) return null;

    const bodyNode = this.findFirstChild(node, "enum_body");
    const members = bodyNode
      ? this.findChildNodes(bodyNode, "property_identifier").map((m) => m.text)
      : [];

    return {
      type: UNodeType.Enum,
      name: nameNode.text,
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        members,
      },
      originalNode: node,
    };
  }

  private convertVariableNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): VariableNode | null {
    const nameNode = this.findFirstChild(node, "identifier");
    // Also handle array/object destructuring, e.g. const [a,b] = ...
    const patternNode =
      this.findFirstChild(node, "object_pattern") ||
      this.findFirstChild(node, "array_pattern");

    if (!nameNode && !patternNode) return null;

    const name = nameNode ? nameNode.text : patternNode?.text || "unknown";

    let valueType: string | undefined;
    const typeAnnotation = this.findFirstChild(node, "type_annotation");
    if (typeAnnotation) {
      valueType = typeAnnotation.lastChild?.text;
    }

    const initialValue = node.lastNamedChild?.text;

    return {
      type: UNodeType.Variable,
      name,
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        valueType,
        initialValue: initialValue === name ? undefined : initialValue, // Avoid self-reference
      },
      originalNode: node,
    };
  }

  private findFirstChild(
    node: Parser.SyntaxNode,
    type: string
  ): Parser.SyntaxNode | null {
    return node.namedChildren.find((child) => child.type === type) || null;
  }

  private findChildNodes(
    node: Parser.SyntaxNode,
    type: string
  ): Parser.SyntaxNode[] {
    return node.namedChildren.filter((child) => child.type === type);
  }

  private getNodeLocation(node: Parser.SyntaxNode): SourceLocation {
    return {
      startLine: node.startPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1,
    };
  }
}
