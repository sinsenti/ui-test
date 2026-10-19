// Display formatting only. Validation and canonical storage remain server-side.
export function formatPhoneInput(value: string): string {
  if (!/^\+?[0-9 ()-]*$/.test(value)) return value;
  const digits = value.replace(/[^0-9]/g, "");
  let widths: number[];
  if (digits.startsWith("375")) widths = [3, 2, 3, 2, 2];
  else if (value.startsWith("+")) return value;
  else if (digits.startsWith("810375")) widths = [6, 2, 3, 2, 2];
  else if (digits.startsWith("80")) widths = [1, 3, 3, 2, 2];
  else if (digits.startsWith("0")) widths = [3, 3, 2, 2];
  else if (digits.startsWith("8")) return value;
  else widths = [2, 3, 2, 2];
  if (!digits || digits.length > widths.reduce((sum, width) => sum + width, 0)) return value;

  let offset = 0;
  return (value.startsWith("+") ? "+" : "") + widths.map((width, index) => {
    const group = digits.slice(offset, offset + width);
    offset += width;
    return group ? (index ? index >= widths.length - 2 ? "-" : " " : "") + group : "";
  }).join("");
}

// Keep the caret beside the same digit when separators move around it.
export function phoneInputPosition(before: string, after: string, position: number): number {
  const count = (before.slice(0, position).match(/[0-9+]/g) ?? []).length;
  if (!count) return 0;
  let seen = 0;
  for (let index = 0; index < after.length; index++) {
    if (/[0-9+]/.test(after[index]) && ++seen === count) return index + 1;
  }
  return after.length;
}
