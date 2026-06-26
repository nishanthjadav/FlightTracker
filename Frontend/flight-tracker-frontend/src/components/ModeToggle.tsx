export type ViewMode = "all" | "celebrities";

type Props = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  celebrityCount: number;
};

export default function ModeToggle({ mode, onChange, celebrityCount }: Props) {
  return (
    <div className="mode-toggle">
      <button
        className={mode === "all" ? "active" : ""}
        onClick={() => onChange("all")}
      >
        All Flights
      </button>
      <button
        className={mode === "celebrities" ? "active celebrity" : ""}
        onClick={() => onChange("celebrities")}
      >
        ★ Celebrities {celebrityCount > 0 && `(${celebrityCount})`}
      </button>
    </div>
  );
}
