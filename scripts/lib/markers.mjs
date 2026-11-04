// Replace generated content between <!-- NAME:START --> and <!-- NAME:END -->.
export function replaceBetween(text, name, content) {
  const start = `<!-- ${name}:START -->`;
  const end = `<!-- ${name}:END -->`;
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i === -1 || j === -1 || j < i) throw new Error(`Markers ${start} / ${end} not found or out of order.`);
  // Keep the indentation of the start marker for the end marker.
  const lineStart = text.lastIndexOf('\n', i) + 1;
  const indent = text.slice(lineStart, i).match(/^\s*/)[0];
  return `${text.slice(0, i + start.length)}\n${content}\n${indent}${text.slice(j)}`;
}
