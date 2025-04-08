import { useMemo } from "react";

type CategoryDistributionProps = {
  data: Array<{
    category: string;
    count: number;
  }>;
};

export const CategoryDistribution = ({ data }: CategoryDistributionProps) => {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);

  return (
    <div className="bg-white rounded-lg shadow p-5 lg:col-span-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">카테고리별 자재 분포</h3>
        <button className="text-primary text-sm hover:underline">상세보기</button>
      </div>
      
      <div className="space-y-4">
        {data.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          
          return (
            <div key={index}>
              <div className="flex justify-between mb-1">
                <span className="text-sm">{item.category}</span>
                <span className="text-sm font-medium">{item.count}개</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryDistribution;
