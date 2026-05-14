import Link from "next/link";
import { Activity, BarChart3, CalendarRange, Flame, LineChart, MessageCircle, Radar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrendDay, TrendsPeriod, TrendsViewModel } from "@/lib/trends";

const periodLabels: Record<TrendsPeriod, string> = {
  week: "Week",
  month: "Month",
  quarter: "3-Month",
};

function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

function periodHref(period: TrendsPeriod, selectedDate: string) {
  return `/trends?period=${period}&date=${selectedDate}`;
}

function maxValue(days: TrendDay[], key: keyof Pick<TrendDay, "kcal" | "protein" | "carbs" | "fat" | "fiber">) {
  return Math.max(1, ...days.map((day) => day[key]));
}

export function TrendsDashboard({ data }: { data: TrendsViewModel }) {
  const hasData = data.summary.daysLogged > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{data.dateLabel}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Trends</h1>
          <p className="text-sm text-muted-foreground">Weekly and monthly patterns for confirmed meal logs.</p>
        </div>
        <nav aria-label="Trend period" className="flex flex-wrap gap-2">
          {(["week", "month", "quarter"] as TrendsPeriod[]).map((period) => (
            <Button key={period} asChild size="sm" variant={data.selectedPeriod === period ? "default" : "outline"}>
              <Link href={periodHref(period, data.selectedDate)}>{periodLabels[period]}</Link>
            </Button>
          ))}
        </nav>
      </header>

      <section aria-label="Trends summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<CalendarRange aria-hidden="true" />} label="Range" value={data.rangeLabel} detail={`${data.summary.daysLogged}/${data.summary.totalDays} days logged`} />
        <SummaryCard icon={<Activity aria-hidden="true" />} label="Consistency" value={`${data.summary.consistencyPct}% consistency`} detail="At least one confirmed meal per day" />
        <SummaryCard icon={<LineChart aria-hidden="true" />} label="Average calories" value={`${formatNumber(data.summary.avgKcal)} kcal avg`} detail="Across logged days only" />
        <SummaryCard icon={<Flame aria-hidden="true" />} label="Streak" value={`${data.summary.currentStreak} day current streak`} detail={`${data.summary.longestStreak} day longest streak`} />
      </section>

      {!hasData ? <EmptyTrendsState /> : (
        <>
          <section aria-label="Trend charts" className="grid gap-4 xl:grid-cols-2">
            <CalorieTrendChart days={data.days} />
            <MacroStackedChart days={data.days} />
            <PeriodRadarChart days={data.days} />
            <MacroAverageCard data={data} />
          </section>

          <section aria-label="Trend insights" className="grid gap-3 md:grid-cols-3">
            {data.insights.map((insight) => (
              <Card key={insight.title} className="surface-card rounded-2xl">
                <CardHeader>
                  <Badge className="w-fit" variant={insight.tone === "warning" ? "outline" : "secondary"}>{insight.tone}</Badge>
                  <CardTitle as="h2" className="text-lg">{insight.title}</CardTitle>
                  <CardDescription>{insight.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <Card className="surface-card rounded-2xl">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
        <div className="text-xl font-semibold tracking-tight">{value}</div>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function EmptyTrendsState() {
  return (
    <Card className="surface-card rounded-2xl border-dashed">
      <CardHeader>
        <CardTitle as="h2">Not enough trend data yet</CardTitle>
        <CardDescription>Log a few confirmed meals and this page will show consistency, macro balance, and trend insights.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/chat">
            <MessageCircle aria-hidden="true" />
            Log a meal in Chat
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function CalorieTrendChart({ days }: { days: TrendDay[] }) {
  const maxKcal = maxValue(days, "kcal");
  return (
    <Card className="surface-card rounded-2xl">
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2"><LineChart aria-hidden="true" /> Calories over time</CardTitle>
        <CardDescription>Daily kcal lead totals from confirmed meals.</CardDescription>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label="Calorie trend chart" className="flex h-56 items-end gap-2 overflow-x-auto border-b border-l p-3">
          {days.map((day) => (
            <div key={day.date} className="flex min-w-10 flex-1 flex-col items-center justify-end gap-2 text-xs text-muted-foreground">
              <span>{day.kcal ? formatNumber(day.kcal) : "—"}</span>
              <div className="w-full rounded-t-lg bg-primary/80" style={{ height: `${Math.max(4, (day.kcal / maxKcal) * 150)}px` }} />
              <span>{day.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MacroStackedChart({ days }: { days: TrendDay[] }) {
  const maxMacro = Math.max(1, ...days.map((day) => day.protein + day.carbs + day.fat));
  return (
    <Card className="surface-card rounded-2xl">
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2"><BarChart3 aria-hidden="true" /> Macro distribution</CardTitle>
        <CardDescription>Protein, carbs, and fat grams by day.</CardDescription>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label="Macro distribution chart" className="space-y-3">
          {days.map((day) => {
            const total = Math.max(1, day.protein + day.carbs + day.fat);
            return (
              <div key={day.date} className="grid grid-cols-[4rem_1fr] items-center gap-3 text-xs">
                <span className="text-muted-foreground">{day.label}</span>
                <div className="flex h-5 overflow-hidden rounded-full bg-muted" style={{ width: `${Math.max(8, (total / maxMacro) * 100)}%` }}>
                  <div className="bg-emerald-500" style={{ width: `${(day.protein / total) * 100}%` }} title={`Protein ${formatNumber(day.protein, 1)}g`} />
                  <div className="bg-sky-500" style={{ width: `${(day.carbs / total) * 100}%` }} title={`Carbs ${formatNumber(day.carbs, 1)}g`} />
                  <div className="bg-amber-500" style={{ width: `${(day.fat / total) * 100}%` }} title={`Fat ${formatNumber(day.fat, 1)}g`} />
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Protein</Badge><Badge variant="outline">Carbs</Badge><Badge variant="outline">Fat</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PeriodRadarChart({ days }: { days: TrendDay[] }) {
  const logged = days.filter((day) => day.mealCount > 0);
  const avg = (key: keyof Pick<TrendDay, "protein" | "fiber" | "kcal">) => logged.length ? logged.reduce((sum, day) => sum + day[key], 0) / logged.length : 0;
  const axes = [
    { label: "Protein", pct: Math.min(100, (avg("protein") / 80) * 100) },
    { label: "Fiber", pct: Math.min(100, (avg("fiber") / 30) * 100) },
    { label: "Calories", pct: Math.min(100, (avg("kcal") / 2200) * 100) },
  ];

  return (
    <Card className="surface-card rounded-2xl">
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2"><Radar aria-hidden="true" /> Period radar</CardTitle>
        <CardDescription>Average completion against starter targets.</CardDescription>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label="Period radar chart" className="space-y-3">
          {axes.map((axis) => (
            <div key={axis.label} className="space-y-1">
              <div className="flex justify-between text-xs"><span>{axis.label}</span><span>{formatNumber(axis.pct)}%</span></div>
              <div className="h-3 rounded-full bg-muted"><div className="h-3 rounded-full bg-primary" style={{ width: `${axis.pct}%` }} /></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MacroAverageCard({ data }: { data: TrendsViewModel }) {
  return (
    <Card className="surface-card rounded-2xl">
      <CardHeader>
        <CardTitle as="h2">Macro averages</CardTitle>
        <CardDescription>Useful daily baselines on logged days.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-secondary/60 p-3"><p className="text-sm text-muted-foreground">Protein</p><p className="text-xl font-semibold">{formatNumber(data.summary.avgProtein, 1)} g protein avg</p></div>
        <div className="rounded-xl bg-secondary/60 p-3"><p className="text-sm text-muted-foreground">Fiber</p><p className="text-xl font-semibold">{formatNumber(data.summary.avgFiber, 1)} g fiber avg</p></div>
      </CardContent>
    </Card>
  );
}
