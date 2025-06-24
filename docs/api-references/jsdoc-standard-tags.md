# JSDoc Standard Tags Reference

This document provides a comprehensive reference for JSDoc tags utilized in this project for modern JavaScript and TypeScript development. Adherence to these conventions ensures clarity, consistency, and facilitates automated documentation generation with TypeDoc.

**Project Configuration Note**: Tags such as `@fileoverview`, `@module`, `@type`, `@typedef`, `@function`, and `@template` have been explicitly defined in the project's `tsdoc.json` configuration file. This ensures they are recognized by TypeDoc and processed correctly according to their specified `syntaxKind` (e.g., as 'modifier' or 'block' tags), suppressing "unknown tag" warnings and integrating them into the documentation generation process. Refer to `tsdoc.json` for the precise definitions.

## Core Documentation Tags

These tags form the fundamental building blocks for documenting functions and methods.

- **`@param`** (Synonyms: `@arg`, `@argument`)
  - **Purpose**: Describes a parameter accepted by a function or method. It is crucial to specify the parameter's type, name, and a clear description of its role.
  - **Syntax**: `@param {type} parameterName - Description of the parameter.`
  - **Example**:
    ```javascript
    /**
     * @param {string} userId - The unique identifier for the user.
     * @param {boolean} [isActive=true] - Optional flag indicating user status.
     */
    function fetchUserData(userId, isActive) {
      /* ... */
    }
    ```

- **`@returns`** (Synonym: `@return`)
  - **Purpose**: Specifies the type and a description of the value returned by a function or method.
  - **Syntax**: `@returns {type} Description of the return value.`
  - **Example**:
    ```javascript
    /**
     * Calculates the sum of two numbers.
     * @param {number} a - The first number.
     * @param {number} b - The second number.
     * @returns {number} The sum of a and b.
     */
    function sum(a, b) {
      return a + b;
    }
    ```

- **`@function`**
  - **Purpose**: Explicitly identifies the documented code block as a function. This tag is often optional as documentation generators can typically infer this from the code structure.
  - **Syntax**: `@function functionName`

## Type Definition Tags

These tags are essential for defining and referencing data types within the documentation, enhancing code understanding and maintainability, especially in dynamically typed languages or when working with complex data structures.

- **`@type`**
  - **Purpose**: Specifies the data type of a variable, property, or expression.
  - **Syntax**: `@type {typeName}`
  - **Example**:
    ```javascript
    /** @type {string | null} */
    let userName = null;
    ```

- **`@typedef`**
  - **Purpose**: Defines a custom type alias, which can be referenced elsewhere in the documentation. This is particularly useful for complex object structures or union types.
  - **Syntax**: `@typedef {typeDefinition} TypeName - Optional description.`
  - **Example**:

    ```javascript
    /**
     * @typedef {Object} UserProfile
     * @property {string} id - The user's unique ID.
     * @property {string} email - The user's email address.
     * @property {number} [age] - Optional age of the user.
     */

    /** @type {UserProfile} */
    const user = { id: "123", email: "user@example.com" };
    ```

- **`@template`**
  - **Purpose**: Documents generic type parameters, commonly used in functions or classes that operate on a variety of types (prevalent in TypeScript).
  - **Syntax**: `@template T`
  - **Example**:
    ```javascript
    /**
     * @template T
     * @param {T} item - The item to process.
     * @returns {T} The processed item.
     */
    function processItem(item) {
      return item;
    }
    ```

- **`@satisfies`**
  - **Purpose**: (TypeScript specific) Asserts that an expression conforms to a certain type without altering its inferred type. This is useful for ensuring type compatibility while retaining a more specific type.
  - **Syntax**: `// @ts-check \n /** @type {const} */ \n const config = { url: "https://example.com" } \n /** @satisfies {{url: string}} */ (config)`

- **`@import`**
  - **Purpose**: (TypeScript 5.5+) Allows importing types from other modules directly within JSDoc comments, enabling type checking and reference without explicit TypeScript `import` statements in the code.
  - **Syntax**: `@import { TypeName } from './module-path'`

## File-Level Documentation Tags

These tags are used at the beginning of a file to provide an overview and metadata for the entire file.

- **`@file`** (Synonym: `@fileoverview`)
  - **Purpose**: Provides a description or overview for the entire file. It is typically placed in a JSDoc block at the very beginning of the file. While some tools infer the filename, `@file` can explicitly state it. `@fileoverview` is a common synonym used to mark the comment block that describes the file's purpose and content.
  - **Syntax**: `@file [optional/path/to/filename.js] - Optional description following the dash.` or `@fileoverview Description of the file.`
  - **Example**:

    ```javascript
    /**
     * @file src/utils/arrayHelpers.js - Utility functions for array manipulation.
     * @author Jane Doe
     */

    /**
     * @fileoverview This file contains helper functions for working with arrays,
     * including sorting, filtering, and mapping utilities.
     * @version 1.0.0
     */
    ```

  - **Note**: The main description of the file often follows directly after these tags within the same JSDoc block, or can be explicitly marked with `@description`.

- **`@module`**
  - **Purpose**: Documents a JavaScript module. This tag helps define the module's name and can be used to group related functions, classes, and variables.
  - **Syntax**: `@module moduleName` or `@module path/to/module`
  - **Example**:
    ```javascript
    /**
     * @module myApp/dataService
     * @description Provides services for fetching and manipulating application data.
     */
    ```

## Class and Module Structure Tags

These tags are used to document object-oriented constructs such as classes, interfaces, and their members, as well as module organization.

- **`@constructor`**
  - **Purpose**: Explicitly marks a function as a class constructor.
  - **Syntax**: `@constructor` (typically used within the JSDoc block of the constructor function).

- **`@class`** (Synonym: `@constructor`)
  - **Purpose**: Documents a class definition or a constructor function.
  - **Syntax**: `@class ClassName - Optional description.`
  - **Example**:
    ```javascript
    /**
     * Represents a user account.
     * @class UserAccount
     */
    class UserAccount {
      /* ... */
    }
    ```

- **`@extends`** (Synonym: `@augments`)
  - **Purpose**: Indicates that a class inherits from another class, specifying the superclass.
  - **Syntax**: `@extends {SuperClassName}`
  - **Example**:
    ```javascript
    /**
     * @extends {BaseModel}
     */
    class Product extends BaseModel {
      /* ... */
    }
    ```

- **`@implements`**
  - **Purpose**: Specifies one or more interfaces that a class implements.
  - **Syntax**: `@implements {InterfaceName}`
  - **Example**:
    ```javascript
    /**
     * @implements {LoggerInterface}
     * @implements {Configurable}
     */
    class AdvancedLogger {
      /* ... */
    }
    ```

- **`@public`**, **`@private`**, **`@protected`**
  - **Purpose**: Define the visibility (access level) of class members (properties or methods).
    - `@public`: Member is accessible from anywhere (default if no modifier is specified).
    - `@private`: Member is accessible only within the class that defines it.
    - `@protected`: Member is accessible within the class that defines it and by instances of subclasses.
  - **Syntax**: `@public`, `@private`, `@protected`
  - **Example**:

    ```javascript
    class DataHandler {
      /** @private */
      _internalCache = {};

      /** @public */
      getData(key) {
        return this._internalCache[key];
      }
    }
    ```

- **`@readonly`**
  - **Purpose**: Marks a property as read-only, indicating that its value should not be modified after initialization.
  - **Syntax**: `@readonly`
  - **Example**:
    ```javascript
    /**
     * @property {string} id - The unique identifier.
     * @readonly
     */
    this.id = generateId();
    ```

- **`@override`**
  - **Purpose**: Indicates that a method in a subclass is intended to override a method from its superclass. This helps catch errors if the superclass method signature changes or is removed.
  - **Syntax**: `@override`

## Error Handling and Exceptions

This tag is crucial for documenting potential errors that a function might throw, allowing consumers of the API to implement appropriate error handling.

- **`@throws`** (Synonym: `@exception`)
  - **Purpose**: Documents an error or exception that may be thrown by a function or method.
  - **Syntax**: `@throws {ErrorType} Description of why the error is thrown.`
  - **Example**:
    ```javascript
    /**
     * Parses a JSON string.
     * @param {string} jsonString - The JSON string to parse.
     * @returns {object} The parsed JavaScript object.
     * @throws {SyntaxError} If the string is not valid JSON.
     */
    function parseJson(jsonString) {
      /* ... */
    }
    ```

## Documentation Metadata

These tags provide supplementary information about the documented code, such as authorship, versioning, and relationships to other parts of the codebase or external resources.

- **`@author`**
  - **Purpose**: Specifies the author(s) of the code.
  - **Syntax**: `@author Name <email@example.com>`
  - **Example**: `@author John Doe <john.doe@example.com>`

- **`@version`**
  - **Purpose**: Indicates the version of the documented code element.
  - **Syntax**: `@version versionNumber`
  - **Example**: `@version 1.2.3`

- **`@see`**
  - **Purpose**: Provides a reference to related documentation or resources. This can be another symbol in the codebase or an external URL.
  - **Syntax**: `@see {@link OtherSymbol}` or `@see http://example.com/related-doc`
  - **Example**: `@see {@link module:utils/formatter} for formatting options.`

- **`@todo`**
  - **Purpose**: Marks a section of code or documentation that requires further work or attention.
  - **Syntax**: `@todo Description of the pending task.`
  - **Example**: `@todo Refactor this method to improve performance.`

- **`@deprecated`**
  - **Purpose**: Indicates that a code element (function, method, property, etc.) is deprecated and should no longer be used. It is best practice to suggest an alternative.
  - **Syntax**: `@deprecated [versionOrDate] - Reason for deprecation and/or alternative.`
  - **Example**: `@deprecated Since version 3.0. Use `newApiMethod()` instead.`

## Inline and Linking Tags

These tags are used within descriptions to create links or provide additional context.

- **`@link`** (Synonyms: `@linkcode`, `@linkplain`)
  - **Purpose**: Creates a hyperlink to another documented symbol or an external URL within the descriptive text.
    - `@link`: Renders as the symbol name or URL.
    - `@linkcode`: Renders the symbol name or URL in a code font.
    - `@linkplain`: Renders as the symbol name or URL without special formatting.
  - **Syntax**: `{@link SymbolNameOrURL [link text]}`
  - **Example**: `For more information, see {@link MyClass#myMethod|this method}.`

- **`@tutorial`**
  - **Purpose**: Links to a tutorial or external guide related to the documented code. Documentation generators can be configured to resolve these tutorial names to actual URLs.
  - **Syntax**: `@tutorial tutorialName`
  - **Example**: `@tutorial getting-started`

## General Descriptive Tags

These tags provide overall context or examples for the documented element.

- **`@description`**
  - **Purpose**: Provides a detailed description of the documented element. Often, the main JSDoc block comment itself serves as the description, making this tag explicit usage less common unless needed for specific structuring.
  - **Syntax**: `@description Detailed explanation.`

- **`@example`**
  - **Purpose**: Provides one or more examples of how to use the documented code element.
  - **Syntax**: `@example <caption>Optional caption</caption> \n code_example_here`
  - **Example**:
    ```javascript
    /**
     * Adds two numbers.
     * @param {number} num1 The first number.
     * @param {number} num2 The second number.
     * @returns {number} The sum of the two numbers.
     * @example
     * const result = add(5, 3);
     * console.log(result); // Output: 8
     */
    function add(num1, num2) {
      return num1 + num2;
    }
    ```

- **`@since`**
  - **Purpose**: Specifies the version or date since which a feature or code element has been available.
  - **Syntax**: `@since versionOrDate`
  - **Example**: `@since 2.1.0`

- **`@summary`**
  - **Purpose**: Provides a brief, one-line summary of the element's purpose. This is often used by documentation tools to generate overview lists.
  - **Syntax**: `@summary Brief description.`

This reference is intended to be authoritative. Consistent and accurate use of these JSDoc tags is paramount for producing high-quality, understandable, and maintainable software.
