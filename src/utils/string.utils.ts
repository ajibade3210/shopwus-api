export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const slugify = generateSlug;

export function generateUserAlias(
  firstName: string,
  lastName?: string,
): string {
  const base = [firstName, lastName]
    .filter(Boolean)
    .join("_")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${base || "user"}_${randomSuffix}`;
}

export function formatEnumToLabel(val: string): string {
  return val
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getIndefiniteArticle(word: string): string {
  const firstLetter = word.trim().charAt(0).toLowerCase();
  return ["a", "e", "i", "o", "u"].includes(firstLetter) ? "an" : "a";
}
