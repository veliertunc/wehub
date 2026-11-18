export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  // Deterministic hue from the username.
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white uppercase select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `hsl(${hue} 55% 42%)`,
      }}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
    </span>
  );
}
