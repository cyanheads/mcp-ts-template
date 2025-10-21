/**
 * @fileoverview String template interpolation utilities.
 * @module src/utils/string/template
 */

/**
 * Interpolates a template string with data values.
 * Replaces placeholders in the format {{key}} or {key} with corresponding values from the data object.
 *
 * @param template - Template string with placeholders
 * @param data - Object containing values to interpolate
 * @param placeholder - Placeholder format. Default: 'curly' ({{key}}). Options: 'curly' or 'single' ({key})
 * @returns Interpolated string
 *
 * @example
 * ```typescript
 * interpolate('Hello {{name}}!', { name: 'World' }); // 'Hello World!'
 * interpolate('User: {{user.name}}, Age: {{user.age}}', {
 *   user: { name: 'John', age: 30 }
 * }); // 'User: John, Age: 30'
 * interpolate('Hello {name}!', { name: 'World' }, 'single'); // 'Hello World!'
 * ```
 */
export function interpolate(
  template: string,
  data: Record<string, unknown>,
  placeholder: 'curly' | 'single' = 'curly',
): string {
  const pattern = placeholder === 'curly' ? /\{\{([^}]+)\}\}/g : /\{([^}]+)\}/g;

  return template.replace(pattern, (_, key: string) => {
    const trimmedKey = key.trim();
    const value = getNestedValue(data, trimmedKey);

    if (value === undefined || value === null) {
      return '';
    }

    // Handle various types appropriately
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    // For objects, use JSON stringification
    return JSON.stringify(value);
  });
}

/**
 * Gets a nested value from an object using dot notation.
 * @private
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Interpolates a template string with optional default values.
 * If a placeholder value is not found, uses the default value instead.
 *
 * @param template - Template string with placeholders
 * @param data - Object containing values to interpolate
 * @param defaultValue - Default value to use for missing placeholders. Default: ''
 * @returns Interpolated string
 *
 * @example
 * ```typescript
 * interpolateWithDefaults(
 *   'Hello {{name}}, you are {{age}} years old',
 *   { name: 'John' },
 *   'N/A'
 * ); // 'Hello John, you are N/A years old'
 * ```
 */
export function interpolateWithDefaults(
  template: string,
  data: Record<string, unknown>,
  defaultValue = '',
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const trimmedKey = key.trim();
    const value = getNestedValue(data, trimmedKey);

    if (value === undefined || value === null) {
      return defaultValue;
    }

    // Handle various types appropriately
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    // For objects, use JSON stringification
    return JSON.stringify(value);
  });
}

/**
 * Checks if a template string contains any placeholders.
 *
 * @param template - Template string to check
 * @param placeholder - Placeholder format. Default: 'curly'
 * @returns True if template contains placeholders
 *
 * @example
 * ```typescript
 * hasPlaceholders('Hello {{name}}'); // true
 * hasPlaceholders('Hello World'); // false
 * hasPlaceholders('Hello {name}', 'single'); // true
 * ```
 */
export function hasPlaceholders(
  template: string,
  placeholder: 'curly' | 'single' = 'curly',
): boolean {
  const pattern = placeholder === 'curly' ? /\{\{[^}]+\}\}/g : /\{[^}]+\}/g;
  return pattern.test(template);
}

/**
 * Extracts all placeholder keys from a template string.
 *
 * @param template - Template string to analyze
 * @param placeholder - Placeholder format. Default: 'curly'
 * @returns Array of placeholder keys
 *
 * @example
 * ```typescript
 * extractPlaceholders('Hello {{name}}, {{greeting}}!'); // ['name', 'greeting']
 * extractPlaceholders('User: {{user.name}}'); // ['user.name']
 * ```
 */
export function extractPlaceholders(
  template: string,
  placeholder: 'curly' | 'single' = 'curly',
): string[] {
  const pattern = placeholder === 'curly' ? /\{\{([^}]+)\}\}/g : /\{([^}]+)\}/g;
  const matches = template.matchAll(pattern);
  const keys: string[] = [];

  for (const match of matches) {
    if (match[1]) {
      keys.push(match[1].trim());
    }
  }

  return keys;
}
