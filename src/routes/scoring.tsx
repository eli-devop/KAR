import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useHorizonOccupations, type HorizonOccupation } from "@/hooks/useHorizonOccupations";
import { horizonLabel } from "@/lib/horizons";
import { CollaborationReadiness } from "@/components/kar/CollaborationReadiness";
import { FinancialAutonomy } from "@/components/kar/FinancialAutonomy";
import { AILiteracyEnforcement } from "@/components/kar/AILiteracyEnforcement";
import {
  Sparkles, Flame, Trophy, Target, Zap, SkipForward, RotateCcw, Award,
  Timer, Lightbulb, ChevronUp, PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HorizonSelector } from "@/components/kar/HorizonSelector";

export const Route = createFileRoute("/scoring")({
  head: () => ({
    meta: [
      { title: "AI Exposure Scoring Game — KAR" },
      { name: "description", content: "A gamified scoring studio: guess each occupation's AI exposure, build combos, beat the clock, and calibrate the KAR rubric." },
    ],
  }),
  component: Page,
});

interface Round {
  occId: string;
  guess: number;
  truth: number;
  delta: number;
  points: number;
  timeBonus: number;
  difficulty: Difficulty;
}

type Difficulty = "easy" | "normal" | "hard";

const DIFFS: Record<Difficulty, { label: string; window: number; mult: number; seconds: number }> = {
  easy:   { label: "Easy",   window: 15, mult: 1.0, seconds: 30 },
  normal: { label: "Normal", window: 10, mult: 1.5, seconds: 20 },
  hard:   { label: "Hard",   window: 5,  mult: 2.5, seconds: 12 },
};

const LEVELS = [
  { name: "Intern", min: 0 },
  { name: "Analyst", min: 350 },
  { name: "Quant", min: 850 },
  { name: "Forecaster", min: 1600 },
  { name: "Oracle", min: 2700 },
  { name: "KAR Sage", min: 4200 },
];

const HINT_COST = 25;

function scorePoints(delta: number, streak: number, diff: Difficulty, timeLeft: number) {
  const d = DIFFS[diff];
  const base = Math.max(0, 100 - delta * (100 / (d.window * 2.5)));
  const streakMult = 1 + Math.min(streak, 9) * 0.15;
  const timeBonus = Math.round((timeLeft / d.seconds) * 25);
  const points = Math.round(base * streakMult * d.mult) + timeBonus;
  return { points, timeBonus };
}

function gradeFor(delta: number, diff: Difficulty): { label: string; tone: string; hit: boolean } {
  const w = DIFFS[diff].window;
  if (delta <= Math.max(1, Math.floor(w * 0.2))) return { label: "Bullseye", tone: "text-success", hit: true };
  if (delta <= Math.floor(w * 0.5)) return { label: "Sharp", tone: "text-success", hit: true };
  if (delta <= w) return { label: "Close", tone: "text-primary", hit: true };
  if (delta <= w * 2) return { label: "Off", tone: "text-warning", hit: false };
  return { label: "Way off", tone: "text-destructive", hit: false };
}

function pickNext(occupations: HorizonOccupation[], history: Round[]) {
  const seen = new Set(history.map(h => h.occId));
  const pool = occupations.filter(o => !seen.has(o.id));
  const src = pool.length ? pool : occupations;
  return src[Math.floor(Math.random() * src.length)];
}

interface FloatingXP { id: number; value: number; label: string }

function Page() {
  const { horizon, occupations, isForecast } = useHorizonOccupations();
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [current, setCurrent] = useState<HorizonOccupation | undefined>();
  const [guess, setGuess] = useState(50);
  const [revealed, setRevealed] = useState(false);
  const [history, setHistory] = useState<Round[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DIFFS.normal.seconds);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintRange, setHintRange] = useState<[number, number] | null>(null);
  const [floats, setFloats] = useState<FloatingXP[]>([]);
  const [levelUpFlash, setLevelUpFlash] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const floatId = useRef(0);
  const prevLevelRef = useRef(0);

  // init
  useEffect(() => {
    if (!current && occupations.length) {
      setCurrent(pickNext(occupations, []));
      setTimeLeft(DIFFS[difficulty].seconds);
    }
  }, [occupations, current, difficulty]);

  // timer
  useEffect(() => {
    if (revealed || !current) return;
    if (timeLeft <= 0) {
      // auto-submit when time runs out
      submit(true);
      return;
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, revealed, current]);

  const xp = history.reduce((s, r) => s + r.points, 0) - history.filter(r => r.points < 0).length * 0;
  const levelIdx = LEVELS.reduce((acc, l, i) => (xp >= l.min ? i : acc), 0);
  const level = LEVELS[levelIdx];
  const nextLevel = LEVELS[levelIdx + 1];
  const levelProgress = nextLevel ? ((xp - level.min) / (nextLevel.min - level.min)) * 100 : 100;

  // level-up detection
  useEffect(() => {
    if (levelIdx > prevLevelRef.current && prevLevelRef.current !== 0) {
      setLevelUpFlash(level.name);
      toast.success(`Level up! ${level.name}`, { description: "Multiplier rising. Keep the combo." });
      setTimeout(() => setLevelUpFlash(null), 2200);
    }
    prevLevelRef.current = levelIdx;
  }, [levelIdx, level.name]);

  const accuracy = history.length
    ? Math.round(100 - (history.reduce((s, r) => s + r.delta, 0) / history.length))
    : 0;
  const bullseyes = history.filter(r => r.delta <= Math.max(1, Math.floor(DIFFS[r.difficulty].window * 0.2))).length;

  const badges = useMemo(() => ([
    { icon: Target, label: "First Bullseye", earned: bullseyes >= 1 },
    { icon: Flame, label: "5-Combo", earned: bestStreak >= 5 },
    { icon: Zap, label: "1500 XP", earned: xp >= 1500 },
    { icon: Trophy, label: "10 Bullseyes", earned: bullseyes >= 10 },
    { icon: Timer, label: "Speed run", earned: history.some(r => r.timeBonus >= 20) },
    { icon: Award, label: "20 Rounds", earned: history.length >= 20 },
  ]), [bullseyes, bestStreak, xp, history]);

  function spawnFloat(value: number, label: string) {
    const id = ++floatId.current;
    setFloats(f => [...f, { id, value, label }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1100);
  }

  function submit(timedOut = false) {
    if (!current || revealed) return;
    const truth = Math.round(current.ai_exposure_forecast);
    const delta = Math.abs(guess - truth);
    const tLeft = timedOut ? 0 : timeLeft;
    const { points, timeBonus } = scorePoints(delta, streak, difficulty, tLeft);
    const g = gradeFor(delta, difficulty);
    const newStreak = g.hit ? streak + 1 : 0;

    setRevealed(true);
    setStreak(newStreak);
    setBestStreak(b => Math.max(b, newStreak));
    setHistory(h => [{ occId: current.id, guess, truth, delta, points, timeBonus, difficulty }, ...h]);

    if (g.hit) {
      spawnFloat(points, g.label);
      if (timeBonus > 0) setTimeout(() => spawnFloat(timeBonus, "TIME"), 150);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }

  function next() {
    setCurrent(pickNext(occupations, history));
    setGuess(50);
    setRevealed(false);
    setHintUsed(false);
    setHintRange(null);
    setTimeLeft(DIFFS[difficulty].seconds);
  }

  function skip() {
    setStreak(0);
    next();
  }

  function useHint() {
    if (hintUsed || revealed || !current) return;
    if (xp < HINT_COST) {
      toast.error(`Need ${HINT_COST} XP for a hint`);
      return;
    }
    const truth = Math.round(current.ai_exposure_forecast);
    // narrows truth into a 30-point window
    const lo = Math.max(0, truth - 15 + Math.floor(Math.random() * 5));
    const hi = Math.min(100, lo + 30);
    setHintRange([lo, hi]);
    setHintUsed(true);
    setHistory(h => [{ occId: "__hint__" + Date.now(), guess: 0, truth: 0, delta: 0, points: -HINT_COST, timeBonus: 0, difficulty }, ...h]);
    spawnFloat(-HINT_COST, "HINT");
  }

  function reset() {
    setHistory([]);
    setStreak(0);
    setBestStreak(0);
    setRevealed(false);
    setGuess(50);
    setHintUsed(false);
    setHintRange(null);
    setCurrent(pickNext(occupations, []));
    setTimeLeft(DIFFS[difficulty].seconds);
    prevLevelRef.current = 0;
    toast("Game reset");
  }

  function changeDifficulty(d: Difficulty) {
    setDifficulty(d);
    setTimeLeft(DIFFS[d].seconds);
    setRevealed(false);
    setHintUsed(false);
    setHintRange(null);
    setGuess(50);
  }

  if (!current) {
    return <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-muted-foreground">Loading occupations…</div>;
  }

  const truth = Math.round(current.ai_exposure_forecast);
  const delta = Math.abs(guess - truth);
  const grade = revealed ? gradeFor(delta, difficulty) : null;
  const streakMult = (1 + Math.min(streak, 9) * 0.15).toFixed(2);
  const timerPct = (timeLeft / DIFFS[difficulty].seconds) * 100;
  const timerColor = timerPct > 50 ? "bg-success" : timerPct > 25 ? "bg-warning" : "bg-destructive";

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Level-up overlay */}
      {levelUpFlash && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="rounded-2xl border border-primary/40 bg-card/95 px-8 py-6 text-center shadow-2xl animate-scale-in">
            <PartyPopper className="mx-auto h-10 w-10 text-primary" />
            <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">Level up</div>
            <div className="text-3xl font-bold tracking-tight">{levelUpFlash}</div>
          </div>
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Studio · Game mode</div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Score the Bot · <span className="text-primary">{horizonLabel(horizon)}</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Beat the clock. Guess each occupation's AI-exposure score. Chain combos for a multiplier. Spend XP on hints. Level up the rubric.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HorizonSelector compact />
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            {(Object.keys(DIFFS) as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => changeDifficulty(d)}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs transition",
                  difficulty === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {DIFFS[d].label} ×{DIFFS[d].mult}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reset</Button>
        </div>
      </header>

      {/* HUD stats */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <HudCard icon={Zap} label="XP" value={xp.toString()} accent />
        <HudCard icon={Trophy} label="Level" value={level.name} sub={nextLevel ? `→ ${nextLevel.name}` : "Max"} />
        <HudCard icon={Flame} label="Combo" value={`${streak}×`} sub={`Mult ${streakMult}× · Best ${bestStreak}`} pulse={streak >= 3} />
        <HudCard icon={Target} label="Accuracy" value={`${accuracy}%`} sub={`${bullseyes} bullseyes`} />
        <HudCard icon={Award} label="Rounds" value={history.filter(r => r.occId !== "__hint__").length.toString()} sub={`of ${occupations.length}`} />
        <HudCard icon={Timer} label="Time" value={`${timeLeft}s`} sub={DIFFS[difficulty].label} />
      </div>

      {/* Level progress */}
      <div className="mb-6 rounded-lg border border-border bg-card p-3 shadow-card">
        <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5"><ChevronUp className="h-3 w-3" />{level.name}</span>
          <span className="kar-mono">{xp} XP{nextLevel ? ` / ${nextLevel.min}` : ""}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, levelProgress))}%` }} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Play card */}
        <section className={cn(
          "relative overflow-hidden rounded-xl border bg-card p-6 shadow-card transition-all",
          shake && "animate-[wiggle_0.4s_ease-in-out]",
          revealed && grade?.hit ? "border-success/40" : revealed ? "border-destructive/40" : "border-border"
        )}>
          {/* Timer bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-muted">
            <div className={cn("h-full transition-all duration-1000 ease-linear", timerColor)} style={{ width: `${timerPct}%` }} />
          </div>

          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Round {history.filter(r => r.occId !== "__hint__").length + 1}
          </div>

          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{current.category}</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{current.title}</h2>
          <div className="mt-1 text-xs text-muted-foreground kar-mono">
            SOC {current.soc_code} · {current.employment.toLocaleString()} workers · ${current.median_pay.toLocaleString()}/yr · {current.education}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Pill label="Physical barrier" value={current.physical_world_barrier_score} />
            <Pill label="Cognitive offload" value={current.cognitive_offload_score} />
            <Pill label="Reliability risk" value={current.reliability_risk_score} />
          </div>

          {/* Slider */}
          <div className="mt-7">
            <div className="mb-2 flex items-end justify-between">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Your AI-exposure guess</label>
              <div className="kar-mono text-2xl font-semibold">{guess}<span className="text-sm text-muted-foreground">/100</span></div>
            </div>
            <div className="relative h-8">
              {/* track tick marks */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-6 rounded-md bg-muted/40" />
              {/* hint band */}
              {hintRange && !revealed && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md bg-primary/15 ring-1 ring-primary/40 animate-fade-in"
                  style={{ left: `${hintRange[0]}%`, width: `${hintRange[1] - hintRange[0]}%` }}
                  title={`Hint: ${hintRange[0]}–${hintRange[1]}`}
                />
              )}
              {/* truth marker */}
              {revealed && (
                <div
                  className="pointer-events-none absolute top-1/2 -translate-y-1/2 z-10 h-8 w-0.5 bg-success animate-scale-in"
                  style={{ left: `calc(${truth}% - 1px)` }}
                  title={`Truth: ${truth}`}
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-success px-1.5 py-0.5 text-[9px] font-semibold text-white kar-mono">
                    {truth}
                  </div>
                </div>
              )}
              <input
                type="range"
                min={0}
                max={100}
                value={guess}
                disabled={revealed}
                onChange={e => setGuess(+e.target.value)}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full accent-primary disabled:opacity-70"
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground kar-mono">
              <span>0 · safe</span><span>50</span><span>100 · highly exposed</span>
            </div>
          </div>

          {/* Reveal */}
          {revealed && grade && (
            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4 animate-fade-in">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className={"text-sm font-semibold " + grade.tone}>
                  {grade.label} · off by {delta}
                </div>
                <div className="kar-mono text-xs text-muted-foreground">
                  Truth {truth} · You {guess} {isForecast ? `· Δ vs today ${truth - current.ai_exposure_score > 0 ? "+" : ""}${truth - current.ai_exposure_score}` : ""}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {current.rationale_forecast || current.ai_exposure_rationale}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap gap-2">
            {!revealed ? (
              <>
                <Button onClick={() => submit(false)} className="min-w-32"><Target className="mr-1 h-4 w-4" />Lock in</Button>
                <Button variant="outline" onClick={useHint} disabled={hintUsed || xp < HINT_COST}>
                  <Lightbulb className="mr-1 h-4 w-4" />Hint (−{HINT_COST} XP)
                </Button>
                <Button variant="ghost" onClick={skip}><SkipForward className="mr-1 h-4 w-4" />Skip</Button>
              </>
            ) : (
              <Button onClick={next} className="min-w-32"><Sparkles className="mr-1 h-4 w-4" />Next occupation</Button>
            )}
          </div>

          {/* Floating XP */}
          <div className="pointer-events-none absolute right-6 top-12 flex flex-col items-end gap-1">
            {floats.map(f => (
              <div
                key={f.id}
                className={cn(
                  "kar-mono rounded-md px-2 py-1 text-xs font-bold shadow-lg animate-[xpfloat_1.1s_ease-out_forwards]",
                  f.value >= 0 ? "bg-success text-white" : "bg-destructive text-white"
                )}
              >
                {f.value >= 0 ? "+" : ""}{f.value} {f.label}
              </div>
            ))}
          </div>
        </section>

        {/* Side panel */}
        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Badges</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {badges.map(b => {
                const Icon = b.icon;
                return (
                  <div
                    key={b.label}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition",
                      b.earned
                        ? "border-primary/40 bg-primary/10 text-foreground animate-fade-in"
                        : "border-border bg-muted/30 text-muted-foreground opacity-60"
                    )}
                  >
                    <Icon className={"h-4 w-4 " + (b.earned ? "text-primary" : "")} />
                    <span>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card shadow-card">
            <div className="border-b border-border px-5 py-3">
              <h3 className="text-sm font-semibold">Recent rounds</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {history.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-muted-foreground">No rounds yet — lock in your first guess.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {history.slice(0, 14).map((r, i) => {
                    if (r.occId.startsWith("__hint__")) {
                      return (
                        <li key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground"><Lightbulb className="h-3 w-3" />Hint used</div>
                          <div className="kar-mono text-[10px] text-destructive">{r.points} XP</div>
                        </li>
                      );
                    }
                    const occ = occupations.find(o => o.id === r.occId);
                    const g = gradeFor(r.delta, r.difficulty);
                    return (
                      <li key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-xs animate-fade-in">
                        <div className="min-w-0 flex-1 truncate">
                          <div className="truncate font-medium">{occ?.title ?? r.occId}</div>
                          <div className="kar-mono text-[10px] text-muted-foreground">guess {r.guess} · truth {r.truth} · {DIFFS[r.difficulty].label}</div>
                        </div>
                        <div className="text-right">
                          <div className={"text-[11px] font-semibold " + g.tone}>{g.label}</div>
                          <div className="kar-mono text-[10px] text-muted-foreground">+{r.points} XP{r.timeBonus > 0 ? ` · ⏱+${r.timeBonus}` : ""}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-8">
        <CollaborationReadiness variant="compact" />
        <div className="mt-3"><FinancialAutonomy variant="compact" /></div>
        <div className="mt-3"><AILiteracyEnforcement variant="compact" /></div>
      </div>
    </div>
  );
}

function HudCard({ icon: Icon, label, value, sub, accent, pulse }: { icon: typeof Sparkles; label: string; value: string; sub?: string; accent?: boolean; pulse?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg border bg-card p-3 shadow-card transition",
      accent ? "border-primary/40" : "border-border",
      pulse && "animate-pulse ring-1 ring-primary/40"
    )}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className={cn("h-3 w-3", accent && "text-primary")} />{label}
      </div>
      <div className={cn("mt-1 text-lg font-semibold kar-mono", accent && "text-primary")}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground kar-mono">{sub}</div>}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 kar-mono text-sm font-semibold">{value}</div>
    </div>
  );
}
