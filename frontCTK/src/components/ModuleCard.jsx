export default function ModuleCard({ title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-3xl bg-white p-6 text-left shadow ring-1 ring-slate-200 hover:bg-slate-50"
    >
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </button>
  );
}