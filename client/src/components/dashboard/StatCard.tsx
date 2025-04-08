type StatCardProps = {
  title: string;
  value: number;
  change?: {
    value: number | string;
    positive: boolean;
  };
  icon: string;
  iconColor: string;
};

export const StatCard = ({ title, value, change, icon, iconColor }: StatCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value.toLocaleString()}</h3>
          {change && (
            <p className={`text-xs ${change.positive ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
              <span className="material-icons text-sm mr-1">
                {change.positive ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span>{change.value}</span>
            </p>
          )}
        </div>
        <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center">
          <span className={`material-icons text-${iconColor} text-2xl`}>
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
