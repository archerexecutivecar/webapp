"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, errorText, money, type EarningRow, type PayWeek } from "@/lib/api";

function Earnings() {
  const [week, setWeek] = useState<PayWeek | null>(null);
  const [history, setHistory] = useState<EarningRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ pay_week: PayWeek; history: EarningRow[] }>("/driver/earnings")
      .then((res) => { setWeek(res.pay_week); setHistory(res.history); })
      .catch((e) => setError(errorText(e)));
  }, []);

  return (
    <div className="stack">
      <h1 className="title">Earnings</h1>
      <p className="muted" style={{ margin: 0 }}>Completed rides this week, from the payroll ledger.</p>
      {error && <div role="alert" className="alert">{error}</div>}
      {week && (
        <section className="card">
          <div className="kicker">This week</div>
          <div className="stat">{money(week.earned_pay_tips)}</div>
          <p style={{ margin: 0 }}>{week.status_banner}</p>
          <dl className="kv">
            <dt>Cash kept</dt><dd>{money(week.cash_kept)}</dd>
            <dt>Net</dt><dd>{money(week.net_balance)}</dd>
            <dt>Lifetime</dt><dd>{money(week.lifetime_earnings)}</dd>
          </dl>
        </section>
      )}
      {history.length === 0 && week && <div className="empty">No completed rides on your ledger yet.</div>}
      {history.map((row) => (
        <article className="card" key={row.id}>
          <div className="row">
            <strong>{row.date}</strong>
            <span className="pay">{money(row.earned)}</span>
          </div>
          <div>{row.client}</div>
          <div className="muted" style={{ fontSize: 13 }}>{row.reference} · {row.job} · {row.paid_by}</div>
        </article>
      ))}
    </div>
  );
}

export default function Page() {
  return <Shell><Earnings /></Shell>;
}
