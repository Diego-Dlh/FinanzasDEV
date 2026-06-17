'use client';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

interface CashFlowData {
  name: string;
  income: number;
  expense: number;
}

export function CashFlowChart({ data }: { data: CashFlowData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e4e2e4" strokeDasharray="3 3" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#44474d', fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#44474d', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}
          formatter={(v) => [`$${Number(v).toLocaleString()}`, '']}
        />
        <Bar dataKey="income" name="Ingresos" fill="#006e2a" radius={[12, 12, 0, 0]} barSize={20} />
        <Bar dataKey="expense" name="Gastos" fill="#ba1a1a" radius={[12, 12, 0, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
