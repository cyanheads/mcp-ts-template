-- SurrealDB Custom Functions Schema
-- Demonstrates DEFINE FUNCTION for reusable database logic
--
-- Custom functions enable:
-- - Complex calculations
-- - Data validation
-- - Reusable business logic
-- - Type-safe parameters
--
-- Usage:
-- 1. Execute this schema to define functions
-- 2. Call functions in queries with fn::function_name(args)

-- =============================================================================
-- DATA VALIDATION FUNCTIONS
-- =============================================================================

-- Validate email format
DEFINE FUNCTION fn::validate_email($email: string) -> bool {
  RETURN string::is::email($email);
}
COMMENT "Returns true if email is valid format"
PERMISSIONS FULL;

-- Validate phone number (US format)
DEFINE FUNCTION fn::validate_phone($phone: string) -> bool {
  RETURN string::matches($phone, /^\+?1?\d{10}$/);
}
PERMISSIONS FULL;

-- Validate password strength
DEFINE FUNCTION fn::validate_password($password: string) -> object {
  LET $length = string::len($password);
  LET $has_upper = string::matches($password, /[A-Z]/);
  LET $has_lower = string::matches($password, /[a-z]/);
  LET $has_digit = string::matches($password, /[0-9]/);
  LET $has_special = string::matches($password, /[!@#$%^&*]/);

  LET $is_valid = $length >= 8 AND $has_upper AND $has_lower AND $has_digit;

  RETURN {
    valid: $is_valid,
    length: $length,
    has_uppercase: $has_upper,
    has_lowercase: $has_lower,
    has_digit: $has_digit,
    has_special: $has_special
  };
}
PERMISSIONS FULL;

-- =============================================================================
-- CALCULATION FUNCTIONS
-- =============================================================================

-- Calculate percentage
DEFINE FUNCTION fn::percentage($value: decimal, $total: decimal) -> decimal {
  IF $total = 0 THEN
    RETURN 0
  ELSE
    RETURN ($value / $total) * 100
  END;
}
COMMENT "Calculate percentage with division by zero protection"
PERMISSIONS FULL;

-- Calculate discount price
DEFINE FUNCTION fn::calculate_discount($price: decimal, $percent: int) -> decimal {
  RETURN $price * (1 - $percent / 100);
}
PERMISSIONS FULL;

-- Calculate tax
DEFINE FUNCTION fn::calculate_tax($amount: decimal, $tax_rate: float) -> decimal {
  RETURN $amount * (1 + $tax_rate);
}
PERMISSIONS FULL;

-- Calculate compound interest
DEFINE FUNCTION fn::compound_interest(
  $principal: decimal,
  $rate: float,
  $time: int,
  $frequency: int = 1
) -> decimal {
  LET $n = $frequency;
  LET $t = $time;
  RETURN $principal * math::pow(1 + ($rate / $n), $n * $t);
}
COMMENT "Calculate compound interest: P(1 + r/n)^(nt)"
PERMISSIONS FULL;

-- =============================================================================
-- STRING MANIPULATION FUNCTIONS
-- =============================================================================

-- Generate URL-friendly slug
DEFINE FUNCTION fn::slugify($text: string) -> string {
  LET $lower = string::lowercase($text);
  LET $trimmed = string::trim($lower);
  LET $replaced = string::replace($trimmed, ' ', '-');
  RETURN string::replace($replaced, /[^a-z0-9-]/g, '');
}
PERMISSIONS FULL;

-- Truncate text with ellipsis
DEFINE FUNCTION fn::truncate($text: string, $max_length: int) -> string {
  IF string::len($text) <= $max_length THEN
    RETURN $text
  ELSE
    RETURN string::slice($text, 0, $max_length - 3) + '...'
  END;
}
PERMISSIONS FULL;

-- Extract domain from email
DEFINE FUNCTION fn::email_domain($email: string) -> string {
  LET $parts = string::split($email, '@');
  RETURN $parts[1];
}
PERMISSIONS FULL;

-- =============================================================================
-- ARRAY FUNCTIONS
-- =============================================================================

-- Remove duplicates from array
DEFINE FUNCTION fn::array_unique($arr: array) -> array {
  RETURN array::distinct($arr);
}
PERMISSIONS FULL;

-- Chunk array into smaller arrays
DEFINE FUNCTION fn::array_chunk($arr: array, $size: int) -> array<array> {
  LET $result = [];
  LET $length = array::len($arr);

  FOR $i IN 0..$length {
    IF $i % $size = 0 THEN
      LET $chunk = array::slice($arr, $i, math::min($i + $size, $length));
      IF array::len($chunk) > 0 THEN
        $result = array::append($result, $chunk);
      END;
    END;
  };

  RETURN $result;
}
PERMISSIONS FULL;

-- Flatten nested arrays
DEFINE FUNCTION fn::array_flatten($arr: array) -> array {
  LET $result = [];

  FOR $item IN $arr {
    IF type::is::array($item) THEN
      $result = array::concat($result, fn::array_flatten($item));
    ELSE
      $result = array::append($result, $item);
    END;
  };

  RETURN $result;
}
COMMENT "Recursively flatten nested arrays"
PERMISSIONS FULL;

-- =============================================================================
-- DATE/TIME FUNCTIONS
-- =============================================================================

-- Check if date is in the past
DEFINE FUNCTION fn::is_past($date: datetime) -> bool {
  RETURN $date < time::now();
}
PERMISSIONS FULL;

-- Check if date is in the future
DEFINE FUNCTION fn::is_future($date: datetime) -> bool {
  RETURN $date > time::now();
}
PERMISSIONS FULL;

-- Format duration as human-readable string
DEFINE FUNCTION fn::format_duration($seconds: int) -> string {
  LET $days = math::floor($seconds / 86400);
  LET $hours = math::floor(($seconds % 86400) / 3600);
  LET $minutes = math::floor(($seconds % 3600) / 60);

  IF $days > 0 THEN
    RETURN string::concat($days, 'd ', $hours, 'h')
  ELSE IF $hours > 0 THEN
    RETURN string::concat($hours, 'h ', $minutes, 'm')
  ELSE
    RETURN string::concat($minutes, 'm')
  END;
}
PERMISSIONS FULL;

-- =============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- Check if user can perform action (permissions example)
DEFINE FUNCTION fn::user_can_edit($user_id: string, $resource_id: string) -> bool {
  LET $resource = SELECT * FROM $resource_id;
  RETURN $resource.owner = $user_id OR $user_id IN $resource.editors;
}
PERMISSIONS FULL;

-- Calculate user reputation score
DEFINE FUNCTION fn::calculate_reputation($user_id: string) -> int {
  LET $posts = count(SELECT * FROM post WHERE author = $user_id);
  LET $likes = count(SELECT * FROM likes WHERE ->post.author = $user_id);
  LET $comments = count(SELECT * FROM comment WHERE author = $user_id);

  RETURN ($posts * 10) + ($likes * 2) + ($comments * 5);
}
COMMENT "Calculate user reputation from activity"
PERMISSIONS FULL;

-- =============================================================================
-- GRAPH FUNCTIONS
-- =============================================================================

-- Count mutual connections (friends of friends)
DEFINE FUNCTION fn::mutual_connections($user1: string, $user2: string) -> int {
  LET $user1_following = SELECT ->follows->user.id FROM $user1;
  LET $user2_following = SELECT ->follows->user.id FROM $user2;

  LET $mutual = array::intersect($user1_following, $user2_following);
  RETURN array::len($mutual);
}
PERMISSIONS FULL;

-- Get connection path length
DEFINE FUNCTION fn::connection_degree($from: string, $to: string) -> int {
  -- Simplified - full implementation would use BFS
  LET $direct = count(SELECT * FROM $from WHERE ->->id CONTAINS $to);

  IF $direct > 0 THEN
    RETURN 1
  ELSE
    LET $second = count(SELECT * FROM $from WHERE ->->->id CONTAINS $to);
    IF $second > 0 THEN
      RETURN 2
    ELSE
      RETURN -1  -- Not connected
    END
  END;
}
COMMENT "Calculate connection degree (-1 if not connected)"
PERMISSIONS FULL;

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

-- Example 1: Use in SELECT
-- SELECT
--   email,
--   fn::validate_email(email) as is_valid_email
-- FROM user;

-- Example 2: Use in WHERE clause
-- SELECT * FROM user
-- WHERE fn::validate_email(email) = true;

-- Example 3: Use in UPDATE
-- UPDATE product SET
--   discounted_price = fn::calculate_discount(price, 20);

-- Example 4: Use in computed field
-- SELECT
--   title,
--   fn::truncate(description, 100) as short_description
-- FROM article;

-- Example 5: Nested function calls
-- SELECT
--   fn::slugify(fn::truncate(title, 50)) as slug
-- FROM article;

-- Example 6: With custom business logic
-- SELECT * FROM resource
-- WHERE fn::user_can_edit($auth.id, id) = true;

-- =============================================================================
-- USING WITH CODE
-- =============================================================================

-- Example: Define custom function
-- ```ts
-- import { CustomFunctions } from '@/storage/providers/surrealdb';
--
-- const funcMgr = new CustomFunctions(client);
--
-- await funcMgr.define({
--   name: 'my_function',
--   parameters: [
--     { name: 'input', type: 'string' }
--   ],
--   returnType: 'string',
--   body: 'RETURN string::uppercase($input);'
-- }, context);
-- ```

-- Example: Using predefined functions
-- ```ts
-- import { FunctionRegistry } from '@/storage/providers/surrealdb';
--
-- const emailValidator = FunctionRegistry.validateEmail();
-- await funcMgr.define(emailValidator, context);
--
-- // Now use in queries:
-- const validUsers = await client.query(`
--   SELECT * FROM user WHERE fn::validate_email(email) = true
-- `);
-- ```

-- =============================================================================
-- BEST PRACTICES
-- =============================================================================

-- ✅ DO:
-- - Keep functions focused and single-purpose
-- - Use type parameters for safety
-- - Add descriptive comments
-- - Handle edge cases (division by zero, null values)
-- - Return consistent types
-- - Use LET for intermediate values

-- ❌ DON'T:
-- - Create recursive functions without limits
-- - Put expensive operations in functions called frequently
-- - Use functions for simple operations (overhead)
-- - Return different types based on conditions
-- - Access external resources (use events for webhooks)

-- =============================================================================
-- REMOVING FUNCTIONS
-- =============================================================================

-- Remove a function:
-- REMOVE FUNCTION fn::function_name;

-- View all functions:
-- INFO FOR DATABASE;
