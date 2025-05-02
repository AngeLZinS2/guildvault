
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonthlyStatsData } from "@/services/financeService";

interface MonthlyChartProps {
  monthlyData: MonthlyStatsData[];
}

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ monthlyData }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo Financeiro</CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="month" stroke="#8b9cb1" />
              <YAxis stroke="#8b9cb1" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1f2c', borderColor: '#8b5cf6' }}
                formatter={(value) => [`$${value.toLocaleString()}`, undefined]}
              />
              <Legend />
              <Bar dataKey="income" name="Entradas" fill="#8b5cf6" />
              <Bar dataKey="expenses" name="Saídas" fill="#ff6b35" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
