// Minimal SVG line chart: raw series dimmed, 7-day average highlighted.

import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { C } from '@/lib/theme';

export type ChartPoint = { x: string; y: number; avg?: number };

export function LineChart({ points, height = 160, mini = false }: {
  points: ChartPoint[]; height?: number; mini?: boolean;
}) {
  const [width, setWidth] = useState(0);
  if (!points.length) return <View style={{ height }} />;

  const pad = mini ? 2 : 18;
  const ys = points.flatMap((p) => (p.avg != null ? [p.y, p.avg] : [p.y]));
  const min = Math.min(...ys), max = Math.max(...ys);
  const span = Math.max(max - min, 0.5);
  const px = (i: number) => pad + (points.length === 1 ? 0 : (i / (points.length - 1)) * (width - pad * 2));
  const py = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);

  const raw = points.map((p, i) => `${px(i)},${py(p.y)}`).join(' ');
  const avg = points.filter((p) => p.avg != null).map((p, _, arr) =>
    `${px(points.indexOf(p))},${py(p.avg!)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Polyline points={raw} fill="none" stroke={C.border} strokeWidth={mini ? 1 : 1.5} />
          {avg.length > 0 && (
            <Polyline points={avg} fill="none" stroke={C.accent} strokeWidth={mini ? 2 : 3}
              strokeLinecap="round" strokeLinejoin="round" />
          )}
          <Circle cx={px(points.length - 1)} cy={py(last.avg ?? last.y)} r={mini ? 2.5 : 4} fill={C.accent} />
          {!mini && (
            <>
              <SvgText x={pad} y={12} fill={C.sub} fontSize="11">{max.toFixed(1)}</SvgText>
              <SvgText x={pad} y={height - 4} fill={C.sub} fontSize="11">{min.toFixed(1)}</SvgText>
              <SvgText
                x={Math.min(px(points.length - 1) + 6, width - 40)}
                y={Math.max(py(last.avg ?? last.y) - 8, 12)}
                fill={C.accent} fontSize="12" fontWeight="bold"
              >
                {(last.avg ?? last.y).toFixed(1)}
              </SvgText>
            </>
          )}
        </Svg>
      )}
    </View>
  );
}
