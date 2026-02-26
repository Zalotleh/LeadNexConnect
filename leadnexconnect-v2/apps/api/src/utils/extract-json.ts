/**
 * Extract and parse JSON from Claude's response.
 * Claude sometimes wraps JSON in markdown code fences (```json ... ```) even
 * when instructed not to. This utility handles both cases.
 */
export function extractJSON<T = unknown>(text: string): T {
  // Try stripping markdown code fences first
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from Claude response. Raw text (first 200 chars): ${text.slice(0, 200)}`
    );
  }
}
