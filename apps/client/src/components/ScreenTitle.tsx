import { ServiceMark } from "@/components/ServiceMark";

/** Page heading used across the customer app, matching the home screen. */
export function ScreenTitle({ title, line, mark }: { title: string; line?: string | null; mark?: string }) {
  return (
    <div className="screen-head">
      {mark && (
        <span className="for-you-icon">
          <ServiceMark kind={mark} />
        </span>
      )}
      <div>
        <h1 className="services-title">{title}</h1>
        {line && <p className="services-sub">{line}</p>}
      </div>
    </div>
  );
}
