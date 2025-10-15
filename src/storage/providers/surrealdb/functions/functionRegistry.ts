/**
 * @fileoverview Registry for managing custom function definitions.
 * Provides centralized function management and common utility functions.
 * @module src/storage/providers/surrealdb/functions/functionRegistry
 */

import type { CustomFunctionConfig } from './customFunctions.js';

/**
 * Registry of predefined utility functions.
 *
 * @remarks
 * Provides common function templates for:
 * - Data validation
 * - Calculations
 * - String manipulation
 * - Array operations
 */
export class FunctionRegistry {
  /**
   * Validate email format function.
   */
  static validateEmail(): CustomFunctionConfig {
    return {
      name: 'validate_email',
      parameters: [{ name: 'email', type: 'string' }],
      returnType: 'bool',
      body: 'RETURN string::is::email($email);',
      comment: 'Validates email address format',
    };
  }

  /**
   * Calculate percentage function.
   */
  static calculatePercentage(): CustomFunctionConfig {
    return {
      name: 'calculate_percentage',
      parameters: [
        { name: 'value', type: 'decimal' },
        { name: 'total', type: 'decimal' },
      ],
      returnType: 'decimal',
      body: `
        IF $total = 0 THEN
          RETURN 0
        ELSE
          RETURN ($value / $total) * 100
        END;
      `,
      comment: 'Calculate percentage with division by zero protection',
    };
  }

  /**
   * Generate slug from text function.
   */
  static generateSlug(): CustomFunctionConfig {
    return {
      name: 'generate_slug',
      parameters: [{ name: 'text', type: 'string' }],
      returnType: 'string',
      body: `
        LET $lower = string::lowercase($text);
        LET $trimmed = string::trim($lower);
        LET $replaced = string::replace($trimmed, ' ', '-');
        RETURN $replaced;
      `,
      comment: 'Generate URL-friendly slug from text',
    };
  }

  /**
   * Calculate distance between two points function.
   */
  static haversineDistance(): CustomFunctionConfig {
    return {
      name: 'haversine_distance',
      parameters: [
        { name: 'lat1', type: 'float' },
        { name: 'lon1', type: 'float' },
        { name: 'lat2', type: 'float' },
        { name: 'lon2', type: 'float' },
      ],
      returnType: 'float',
      body: `
        LET $r = 6371; -- Earth radius in km
        LET $dlat = math::deg2rad($lat2 - $lat1);
        LET $dlon = math::deg2rad($lon2 - $lon1);
        LET $a = math::sin($dlat / 2) * math::sin($dlat / 2) +
                 math::cos(math::deg2rad($lat1)) * math::cos(math::deg2rad($lat2)) *
                 math::sin($dlon / 2) * math::sin($dlon / 2);
        LET $c = 2 * math::atan2(math::sqrt($a), math::sqrt(1 - $a));
        RETURN $r * $c;
      `,
      comment: 'Calculate distance between two coordinates in kilometers',
    };
  }

  /**
   * Array unique function (remove duplicates).
   */
  static arrayUnique(): CustomFunctionConfig {
    return {
      name: 'array_unique',
      parameters: [{ name: 'arr', type: 'array' }],
      returnType: 'array',
      body: 'RETURN array::distinct($arr);',
      comment: 'Remove duplicate values from array',
    };
  }

  /**
   * Get all predefined utility functions.
   */
  static getAll(): CustomFunctionConfig[] {
    return [
      FunctionRegistry.validateEmail(),
      FunctionRegistry.calculatePercentage(),
      FunctionRegistry.generateSlug(),
      FunctionRegistry.haversineDistance(),
      FunctionRegistry.arrayUnique(),
    ];
  }

  /**
   * Get function by name.
   */
  static getByName(name: string): CustomFunctionConfig | undefined {
    return FunctionRegistry.getAll().find((f) => f.name === name);
  }
}
