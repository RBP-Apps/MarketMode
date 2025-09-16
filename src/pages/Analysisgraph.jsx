import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import AdminLayout from "../components/layout/AdminLayout";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Configuration
const CONFIG = {
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
  ENERGY_ANALYSIS_SHEET_NAME: "Energy analysis",
};

const AnalysisGraph = () => {
  const [rawEnergyData, setRawEnergyData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [timeRange, setTimeRange] = useState("day"); // default day

  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedHalf, setSelectedHalf] = useState(null);
  const [beneficiaryNames, setBeneficiaryNames] = useState([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState("");

  // Parse timestamp from DD/MM/YYYY HH:MM:SS format to Date object
  const parseTimestamp = useCallback((timestampString) => {
    if (!timestampString) return null;

    try {
      if (typeof timestampString === "string") {
        if (timestampString.includes("/") && timestampString.includes(" ")) {
          const [datePart, timePart] = timestampString.split(" ");
          const [day, month, year] = datePart.split("/");
          const [hours, minutes, seconds] = timePart.split(":");
          return new Date(
            year,
            month - 1,
            day,
            hours || 0,
            minutes || 0,
            seconds || 0
          );
        } else if (timestampString.includes("/")) {
          const [day, month, year] = timestampString.split("/");
          return new Date(year, month - 1, day);
        } else {
          return new Date(timestampString);
        }
      }

      return new Date(timestampString);
    } catch (error) {
      console.error("Error parsing timestamp:", timestampString, error);
      return null;
    }
  }, []);

  // Fetch data from Google Sheets
  const fetchEnergyData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${CONFIG.APPS_SCRIPT_URL}?sheet=${encodeURIComponent(
        CONFIG.ENERGY_ANALYSIS_SHEET_NAME
      )}&action=fetch`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `HTTP Error: ${response.status} - ${response.statusText}`
        );
      }

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (parseError) {
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = text.substring(jsonStart, jsonEnd + 1);
          data = JSON.parse(jsonString);
        } else {
          throw new Error("Invalid JSON response from server");
        }
      }

      const energyRecords = [];
      const uniqueBeneficiaries = new Set();
      let rows = [];

      if (data.table && data.table.rows) {
        rows = data.table.rows;
      } else if (Array.isArray(data)) {
        rows = data;
      } else if (data.values) {
        rows = data.values.map((row) => ({
          c: row.map((val) => ({ v: val })),
        }));
      } else if (data.data) {
        rows = data.data;
      }

      rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return; // Skip header row

        let rowValues = [];
        if (row.c && Array.isArray(row.c)) {
          rowValues = row.c.map((cell) =>
            cell && cell.v !== undefined ? cell.v : ""
          );
        } else if (Array.isArray(row)) {
          rowValues = row;
        } else {
          return;
        }

        // Extract beneficiary name from column C (index 2)
        const beneficiaryName = rowValues[2] || "";
        if (beneficiaryName && rowIndex > 0) {
          uniqueBeneficiaries.add(beneficiaryName);
        }

        const timestampValue = rowValues[3];
        const productionValue = rowValues[4];

        if (!timestampValue || !productionValue) {
          return;
        }

        const timestamp = parseTimestamp(timestampValue);
        const production = parseFloat(productionValue);

        if (!timestamp || isNaN(production)) {
          return;
        }

        const record = {
          beneficiary: beneficiaryName,
          timestamp: timestamp,
          timestampStr: timestampValue.toString(),
          production: production,
          rowIndex: rowIndex,
        };

        energyRecords.push(record);
      });

      energyRecords.sort((a, b) => a.timestamp - b.timestamp);

      setRawEnergyData(energyRecords);
      setBeneficiaryNames(Array.from(uniqueBeneficiaries).sort());
    } catch (error) {
      console.error("Error fetching energy data:", error);
      setError("Failed to load energy data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [parseTimestamp]);

  // Filter data based on time range
  const filterDataByTimeRange = useCallback(() => {
    if (!rawEnergyData.length) {
      setFilteredData([]);
      return;
    }

    let filtered = [...rawEnergyData];

    // Apply beneficiary filter first
    if (selectedBeneficiary) {
      filtered = filtered.filter(
        (item) => item.beneficiary === selectedBeneficiary
      );
    }

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (timeRange) {
      case "day":
        startDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(
          (item) => item.timestamp.toDateString() === now.toDateString()
        );
        break;

      case "week":
        // Show only current week's data (Mon 00:00:00 to Sun 23:59:59)
        // Calculate Monday as the start of the week
        const dow = (now.getDay() + 6) % 7; // convert Sunday(0) -> 6, Monday(1) -> 0
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dow);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        filtered = filtered.filter(
          (item) => item.timestamp >= startOfWeek && item.timestamp <= endOfWeek
        );
        break;

      case "month":
        if (selectedMonth === null) {
          filtered = [];
          break;
        }
        startDate = new Date(now.getFullYear(), selectedMonth, 1);
        endDate = new Date(now.getFullYear(), selectedMonth + 1, 0, 23, 59, 59);
        filtered = filtered.filter(
          (item) => item.timestamp >= startDate && item.timestamp <= endDate
        );
        break;

      case "sixmonths":
        if (!selectedHalf) {
          filtered = [];
          break;
        }
        if (selectedHalf === "H1") {
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 5, 30, 23, 59, 59);
        } else {
          startDate = new Date(now.getFullYear(), 6, 1);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        }
        filtered = filtered.filter(
          (item) => item.timestamp >= startDate && item.timestamp <= endDate
        );
        break;

      default:
        // No time filtering
        break;
    }

    setFilteredData(filtered);
  }, [
    rawEnergyData,
    timeRange,
    selectedMonth,
    selectedHalf,
    selectedBeneficiary,
  ]);
  // Chart data configuration
  const chartData = useMemo(() => {
    if (!filteredData.length) {
      return {
        labels: [],
        datasets: [
          {
            label: "Energy Production (kWh)",
            data: [],
            backgroundColor: "rgba(34, 197, 94, 0.8)",
            borderColor: "rgba(34, 197, 94, 1)",
            borderWidth: 1,
          },
        ],
      };
    }

    // Group data by Energy Date (timestampStr) and sum Production values
    let groupedData;

    if (timeRange === "sixmonths") {
      // For 6 months view, group data by month
      groupedData = filteredData.reduce((acc, row) => {
        const date = new Date(row.timestamp);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const prod = row.production;
        acc[monthKey] = (acc[monthKey] || 0) + prod;
        return acc;
      }, {});
    } else if (timeRange === "year") {
      // For year view, group data by actual year from the data
      groupedData = filteredData.reduce((acc, row) => {
        const date = new Date(row.timestamp);
        const yearKey = date.getFullYear().toString();
        const prod = row.production;
        acc[yearKey] = (acc[yearKey] || 0) + prod;
        return acc;
      }, {});
    } else {
      // Normal grouping by date
      groupedData = filteredData.reduce((acc, row) => {
        const date = row.timestampStr; // Energy Date
        const prod = row.production; // Production value (already parsed as number)
        acc[date] = (acc[date] || 0) + prod;
        return acc;
      }, {});
    }

    // Convert grouped data to array for chart
    const chartDataArray = Object.entries(groupedData).map(([date, total]) => ({
      date,
      production: total,
    }));

    // Sort by date
    chartDataArray.sort((a, b) => {
      const dateA = parseTimestamp(a.date);
      const dateB = parseTimestamp(b.date);
      return dateA - dateB;
    });

    return {
      labels: chartDataArray.map((item) => {
        const tempTimestamp = parseTimestamp(item.date);
        if (!tempTimestamp) return item.date;

        switch (timeRange) {
          case "day":
            return tempTimestamp.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "2-digit",
            });

          case "week":
            return tempTimestamp.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            });
          case "sixmonths":
            // Show month names for 6 months view
            const monthDate = new Date(tempTimestamp);
            return monthDate.toLocaleDateString("en-GB", {
              month: "short",
              year: "2-digit",
            }); // e.g., "Sep 25"
          case "year":
            // Show year number for year view
            const yearDate = new Date(tempTimestamp);
            return yearDate.getFullYear().toString(); // e.g., "2025"
          default:
            return tempTimestamp.toLocaleDateString("en-GB");
        }
      }),
      datasets: [
        {
          label: "Energy Production (kWh)",
          data: chartDataArray.map((item) => item.production),
          backgroundColor: "rgba(34, 197, 94, 0.8)",
          borderColor: "rgba(34, 197, 94, 1)",
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: "rgba(34, 197, 94, 1)",
        },
      ],
    };
  }, [filteredData, timeRange, parseTimestamp]);

  // Calculate total production for the current view
  const totalProduction = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.production, 0);
  }, [filteredData]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: `Energy Production Analysis - Total: ${totalProduction.toLocaleString()} kWh`,
          font: {
            size: 18,
            weight: "bold",
          },
          color: "#1f2937",
          padding: {
            top: 10,
            bottom: 30,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "rgb(34, 197, 94)",
          borderWidth: 1,
          cornerRadius: 4,
          displayColors: false,
          titleFont: {
            size: 14,
          },
          bodyFont: {
            size: 13,
          },
          padding: 10,
          callbacks: {
            title: function (context) {
              const dataIndex = context[0].dataIndex;
              if (dataIndex >= 0 && dataIndex < filteredData.length) {
                const item = filteredData[dataIndex];
                return `Date: ${item.timestampStr}`;
              }
              return "";
            },
            label: function (context) {
              return `Production: ${context.parsed.y} kWh`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            stepSize: 5,
            callback: function (value) {
              return value + " kWh";
            },
            font: {
              size: 12,
            },
            color: "#374151",
          },
          title: {
            display: true,
            text: "kWh",
            font: {
              size: 14,
              weight: "bold",
            },
            color: "#1f2937",
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 11,
            },
            color: "#374151",
          },
        },
      },
    }),
    [filteredData]
  );

  // Effects
  useEffect(() => {
    fetchEnergyData();
  }, [fetchEnergyData]);

  useEffect(() => {
    filterDataByTimeRange();
  }, [filterDataByTimeRange]);

  const timeRangeOptions = [
    { value: "day", label: "ToDay" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "sixmonths", label: "6 Months" },
    { value: "year", label: "Year" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Time Range + Beneficiary Filter */}
        <div className="p-4 bg-white rounded-lg shadow-md">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            {/* Left: Beneficiary dropdown */}
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium text-gray-700">
                Beneficiary
              </label>
              <select
                value={selectedBeneficiary}
                onChange={(e) => setSelectedBeneficiary(e.target.value)}
                className="px-3 py-2 rounded-lg border"
              >
                <option value="">All Names</option>
                {beneficiaryNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Right: Time range buttons and extra selectors */}
            <div className="flex flex-wrap gap-2 justify-center">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setTimeRange(option.value);

                    if (option.value === "month") {
                      // current month auto select
                      setSelectedMonth(new Date().getMonth());
                    } else {
                      setSelectedMonth(null);
                    }

                    setSelectedHalf(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    timeRange === option.value
                      ? "bg-green-600 text-white shadow-lg transform scale-105"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}

              {/* Dropdown for Month */}
              {timeRange === "month" && (
                <div className="flex justify-center mt-3">
                  <select
                    value={selectedMonth ?? ""}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-lg border"
                  >
                    <option value="">Select Month</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(0, i).toLocaleString("en-US", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dropdown for 6 Months */}
              {timeRange === "sixmonths" && (
                <div className="flex justify-center mt-3">
                  <select
                    value={selectedHalf ?? ""}
                    onChange={(e) => setSelectedHalf(e.target.value)}
                    className="px-3 py-2 rounded-lg border"
                  >
                    <option value="">Select Range</option>
                    <option value="H1">Jan - Jun</option>
                    <option value="H2">Jul - Dec</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="p-8 bg-white rounded-lg shadow-lg">
          {error ? (
            <div className="flex justify-center items-center h-96 text-red-500 bg-red-50 rounded-lg border border-red-200">
              <div className="text-center">
                <div className="mb-4 text-6xl">⚠️</div>
                <p className="text-lg font-semibold">Error loading data</p>
                <p className="mt-2 text-sm text-red-600">{error}</p>
                <button
                  onClick={fetchEnergyData}
                  className="px-6 py-2 mt-4 font-medium text-white bg-red-600 rounded-lg transition-colors hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <div className="mx-auto mb-6 w-16 h-16 rounded-full border-b-4 border-green-600 animate-spin"></div>
                <p className="text-lg font-medium text-gray-600">
                  Loading energy data...
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Fetching from Google Sheets
                </p>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex justify-center items-center h-96 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <div className="mb-4 text-6xl">📊</div>
                <p className="text-lg font-semibold">No data available</p>
                <p className="mt-2 text-sm">
                  {rawEnergyData.length === 0
                    ? "No energy production data found in the sheet"
                    : `No data available for the selected ${timeRange} period`}
                </p>
                <button
                  onClick={fetchEnergyData}
                  className="px-6 py-2 mt-4 font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          ) : (
            <div className="h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalysisGraph;
