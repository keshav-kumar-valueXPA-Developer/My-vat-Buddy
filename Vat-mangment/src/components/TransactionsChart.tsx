import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const TransactionsChart = ({ transactions }) => {
  const chartData = transactions.map((t) => ({
    date: new Date(t.date).toLocaleDateString(),
    amount: t.amount,
  }));

  return (
    <div className="bg-white p-4 shadow-lg rounded-lg overflow-x-auto">
      <h3 className="text-center font-semibold mb-2">Transactions Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="amount" stroke="#6B8F71" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TransactionsChart;
