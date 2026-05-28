'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Point { createdAt: string; value: number }

export function LiveChart({ data, label }: { data: Point[]; label: string }) {
  return (
    <div className="glass p-4 h-64">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-200">{label}</h3>
        <span className="chip"><span className="live-dot" />live</span>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pulse-line" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#00e676" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#00e676" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#212a39" strokeDasharray="3 3" />
          <XAxis dataKey="createdAt" hide />
          <YAxis tick={{ fill: '#7a8497', fontSize: 11 }} width={36} />
          <Tooltip
            contentStyle={{ background: '#0a0d12', border: '1px solid #212a39', borderRadius: 8, color: '#d3d8e2' }}
            labelStyle={{ color: '#7a8497' }}
          />
          <Line type="monotone" dataKey="value" stroke="url(#pulse-line)" strokeWidth={2.5} dot={false} isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
