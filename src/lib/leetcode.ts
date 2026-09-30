const TRUSTED_LEETCODE_HOSTS = new Set(["leetcode.cn", "www.leetcode.cn"]);

export function isTrustedLeetCodeExerciseUrl(
  value: string | null | undefined,
): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    return (
      url.protocol === "https:" &&
      TRUSTED_LEETCODE_HOSTS.has(url.hostname.toLowerCase()) &&
      pathSegments[0] === "problems" &&
      Boolean(pathSegments[1])
    );
  } catch {
    return false;
  }
}
