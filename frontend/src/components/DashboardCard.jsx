/**
 * DashboardCard - a statistic card used on all dashboards.
 */
const DashboardCard = ({ icon: Icon, label, value, color = 'primary', subtitle }) => {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="card group p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#7b857a]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#1c2a1f]">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-[#8a9388]">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`dashboard-card-icon rounded-xl p-3 transition-transform duration-300 group-hover:scale-110 ${colors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCard;
