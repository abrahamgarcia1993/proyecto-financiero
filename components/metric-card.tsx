type Props = {
  label: string;
  value: string;
};

export function MetricCard({ label, value }: Props) {
  return (
    <article className="card">
      <p className="text-sm text-stone-500">{label}</p>
      <h3 className="mt-2 text-2xl font-semibold text-ink">{value}</h3>
    </article>
  );
}
