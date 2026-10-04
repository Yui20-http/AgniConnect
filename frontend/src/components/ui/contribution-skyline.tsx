import * as React from 'react';
import { Activity, Grid2X2, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ContributionDay = { date: string; count: number };
type View = '2d' | '3d';
type Cell = ContributionDay & { level: number; week: number; weekday: number };

export interface ContributionSkylineProps {
  data?: ContributionDay[];
  endDate?: string | Date;
  view?: View;
  defaultView?: View;
  onViewChange?: (view: View) => void;
  palette?: 'github' | 'ocean' | 'ember' | 'grape' | 'mono';
  title?: React.ReactNode;
  unit?: string;
  unitPlural?: string;
  weekStart?: 0 | 1;
  showStats?: boolean;
  showLegend?: boolean;
  showToggle?: boolean;
  footer?: React.ReactNode;
  locale?: string;
  onCellClick?: (day: ContributionDay) => void;
  className?: string;
}

const DAY = 86_400_000;
const palettes: Record<NonNullable<ContributionSkylineProps['palette']>, string[]> = {
  github: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'],
  ocean: ['#e8f2f8', '#b8e3f5', '#6ec3eb', '#2a8fd1', '#0b4f8a'],
  ember: ['#f7eee7', '#fde2c4', '#fbad6e', '#f06b3a', '#b3261e'],
  grape: ['#f1edf7', '#e4d4fb', '#b794f4', '#805ad5', '#44337a'],
  mono: ['#ededed', '#d4d4d4', '#a3a3a3', '#525252', '#171717'],
};

const utcDay = (date: string | Date) => {
  if (typeof date === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    if (match) return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(date);
  return Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};
const keyFor = (time: number) => new Date(time).toISOString().slice(0, 10);
const demoData = (end: number): ContributionDay[] => Array.from({ length: 365 }, (_, index) => {
  const date = keyFor(end - (364 - index) * DAY);
  const seed = (index * 9301 + 49297) % 233280;
  const count = seed % 9 < 4 ? 0 : 1 + (seed % 11);
  return { date, count };
});

const prepareCells = (source: ContributionDay[], end: number, weekStart: number) => {
  const endDay = Math.floor(end / DAY) * DAY;
  let start = endDay - 364 * DAY;
  start -= ((new Date(start).getUTCDay() - weekStart + 7) % 7) * DAY;
  const counts = new Map<string, number>();
  source.forEach((item) => {
    if (!item?.date || !Number.isFinite(Number(item.count)) || Number(item.count) <= 0) return;
    const key = keyFor(utcDay(item.date));
    counts.set(key, (counts.get(key) || 0) + Number(item.count));
  });
  const cells: Cell[] = [];
  for (let day = start, index = 0; day <= endDay; day += DAY, index++) {
    const date = keyFor(day);
    cells.push({ date, count: counts.get(date) || 0, level: 0, week: Math.floor(index / 7), weekday: index % 7 });
  }
  const nonzero = cells.map((cell) => cell.count).filter((count) => count > 0).sort((a, b) => a - b);
  const cutoff = nonzero.length ? nonzero[Math.floor(0.95 * (nonzero.length - 1))] : 0;
  cells.forEach((cell) => { cell.level = cell.count === 0 ? 0 : cutoff === 0 ? 4 : 1 + Math.min(3, Math.floor((cell.count / cutoff) * 4)); });
  return { cells, weeks: cells.length ? cells[cells.length - 1].week + 1 : 0, max: Math.max(0, ...nonzero) };
};

const contributionStats = (cells: Cell[]) => {
  let total = 0;
  let busiest: Cell | undefined;
  let longest = 0;
  let currentRun = 0;
  let run = 0;
  cells.forEach((cell) => {
    total += cell.count;
    if (!busiest || cell.count > busiest.count) busiest = cell;
    run = cell.count ? run + 1 : 0;
    longest = Math.max(longest, run);
  });
  let index = cells.length - 1;
  if (index >= 0 && cells[index].count === 0) index -= 1;
  while (index >= 0 && cells[index].count > 0) { currentRun += 1; index -= 1; }
  return { total, busiest, longest, currentRun };
};

export default function ContributionSkyline({
  data,
  endDate,
  view: controlledView,
  defaultView = '3d',
  onViewChange,
  palette = 'github',
  title,
  unit = 'contribution',
  unitPlural,
  weekStart = 0,
  showStats = true,
  showLegend = true,
  showToggle = true,
  footer,
  locale = 'en-US',
  onCellClick,
  className,
}: ContributionSkylineProps) {
  const end = endDate ? utcDay(endDate) : data?.length ? Math.max(...data.map((item) => utcDay(item.date))) : utcDay(new Date());
  const source = data ?? demoData(end);
  const model = React.useMemo(() => prepareCells(source, end, weekStart), [source, end, weekStart]);
  const [internalView, setInternalView] = React.useState<View>(defaultView);
  const [activeLevel, setActiveLevel] = React.useState<number | null>(null);
  const selectedView = controlledView ?? internalView;
  const colors = palettes[palette] || palettes.github;
  const stats = contributionStats(model.cells);
  const plural = unitPlural || `${unit}s`;
  const formatCount = new Intl.NumberFormat(locale);
  const formatDate = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const formatDay = (date: string) => formatDate.format(utcDay(date));
  const monthMarks = model.cells.filter((cell) => cell.weekday === 0 && new Date(utcDay(cell.date)).getUTCDate() <= 7);
  const setView = (next: View) => {
    if (controlledView === undefined) setInternalView(next);
    onViewChange?.(next);
  };

  return (
    <section className={cn('contribution-skyline card w-full overflow-hidden p-4 sm:p-5', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
            <Activity className="h-4 w-4 text-primary-700" />
            {title ?? <><span className="tabular-nums">{formatCount.format(stats.total)}</span> {stats.total === 1 ? unit : plural} in the last year</>}
          </h3>
          <p className="mt-1 text-xs text-gray-500">Daily activity · {model.weeks} weeks</p>
        </div>
        {showToggle && <div role="group" aria-label="Chart view" className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {(['2d', '3d'] as const).map((mode) => <button key={mode} type="button" aria-pressed={selectedView === mode} onClick={() => setView(mode)} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition', selectedView === mode ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-white')}>
            {mode === '2d' ? <Grid2X2 className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}{mode === '2d' ? 'Heat map' : 'Skyline'}
          </button>)}
        </div>}
      </header>

      {showStats && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Year total" value={formatCount.format(stats.total)} unit={plural} />
        <Stat label="Busiest day" value={stats.busiest?.count ? formatCount.format(stats.busiest.count) : '—'} unit={stats.busiest?.count === 1 ? unit : plural} sub={stats.busiest?.date ? formatDay(stats.busiest.date) : ''} />
        <Stat label="Longest streak" value={String(stats.longest)} unit="days" />
        <Stat label="Current streak" value={String(stats.currentRun)} unit="days" />
      </div>}

      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-100 bg-[#fbfcfa] p-4">
        <div className="min-w-[740px]">
          <div className="mb-2 grid gap-1 text-[10px] text-gray-400" style={{ gridTemplateColumns: `repeat(${model.weeks}, minmax(0, 1fr))` }}>
            {monthMarks.map((cell) => <span key={cell.date} style={{ gridColumn: cell.week + 1 }}>{new Date(utcDay(cell.date)).toLocaleString(locale, { month: 'short', timeZone: 'UTC' })}</span>)}
          </div>
          <div className={cn('skyline-grid', selectedView === '3d' && 'skyline-grid-3d')} style={{ gridTemplateColumns: `repeat(${model.weeks}, minmax(0, 1fr))`, gridTemplateRows: 'repeat(7, 13px)' }} role="grid" aria-label="Contribution activity calendar">
            {model.cells.map((cell) => {
              const dimmed = activeLevel !== null && cell.level !== activeLevel;
              const height = cell.count ? Math.max(8, 8 + (cell.count / Math.max(1, model.max)) * 34) : 5;
              return <button key={cell.date} type="button" role="gridcell" aria-label={`${formatCount.format(cell.count)} ${cell.count === 1 ? unit : plural} on ${formatDay(cell.date)}`} title={`${formatCount.format(cell.count)} ${cell.count === 1 ? unit : plural} on ${formatDay(cell.date)}`} onClick={() => onCellClick?.({ date: cell.date, count: cell.count })} className={cn('skyline-cell', selectedView === '3d' && 'skyline-cell-3d', dimmed && 'opacity-20')} style={{ gridColumn: cell.week + 1, gridRow: cell.weekday + 1, backgroundColor: colors[cell.level], height: selectedView === '3d' ? `${height}px` : undefined, transform: selectedView === '3d' ? `translateY(${(model.max ? cell.count / model.max : 0) * -8}px)` : undefined }} />;
            })}
          </div>
        </div>
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
        <span>{footer ?? (selectedView === '3d' ? 'Activity rises into a skyline · click a day for details' : 'Select a day to inspect activity')}</span>
        {showLegend && <div className="flex items-center gap-1.5" onMouseLeave={() => setActiveLevel(null)}><span className="mr-1">Less</span>{colors.map((color, level) => <button key={color} type="button" aria-label={`Highlight level ${level}`} aria-pressed={activeLevel === level} onMouseEnter={() => setActiveLevel(level)} onFocus={() => setActiveLevel(level)} onBlur={() => setActiveLevel(null)} onClick={() => setActiveLevel((current) => current === level ? null : level)} className="h-3 w-3 rounded-[3px] border border-black/5 transition hover:scale-125" style={{ backgroundColor: color }} />)}<span className="ml-1">More</span></div>}
      </footer>
    </section>
  );
}

function Stat({ label, value, unit, sub = '' }: { label: string; value: string; unit: string; sub?: string }) {
  return <div className="rounded-lg border border-gray-100 bg-white px-3 py-2.5"><p className="text-[11px] text-gray-500">{label}</p><p className="mt-1 text-lg font-semibold leading-none tabular-nums text-gray-900">{value}<span className="ml-1 text-xs font-normal text-gray-500">{unit}</span></p>{sub && <p className="mt-1 text-[10px] text-gray-400">{sub}</p>}</div>;
}
