// components/ChartSettingsPanel.jsx
import React from 'react';
import {
  BarChart3,
  TrendingUp,
  LineChart as LineChartIcon,
  Layers
} from 'lucide-react';

const ChartSettingsPanel = ({
  chartType,
  setChartType,
  chartConfig,
  setChartConfig
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 ">

      <div className="space-y-4">
        <div>
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('area')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${chartType === 'area'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <TrendingUp className="w-4 h-4" />
              Area
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${chartType === 'line'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <LineChartIcon className="w-4 h-4" />
              Line
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${chartType === 'bar'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Layers className="w-4 h-4" />
              Bar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartSettingsPanel;