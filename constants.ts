import { ComplexityData } from './types';

export interface TopicData {
  title: string;
  tagline: string;
  xAxisLabel: string;
  yAxisLabel: string;
  curves: Array<{
    id: string;
    name?: string;
    label: string;
    color: string;
    formula: string;
    code: string;
  }>;
}

export const DEFAULT_CONFIG: TopicData = {
  title: "BIG O NOTATION",
  tagline: "Visualizing Algorithm Complexity",
  xAxisLabel: "Input Size (N)",
  yAxisLabel: "Operations / Time",
  curves: [
    {
      id: 'constant',
      name: 'Constant Time',
      label: 'O(1)',
      color: '#10b981',
      formula: "5",
      code: `function getElement(arr, index) {\n  return arr[index];\n}`
    },
    {
      id: 'logarithmic',
      name: 'Logarithmic Time',
      label: 'O(log n)',
      color: '#84cc16',
      formula: "Math.log2(n + 1) * 6 + 10",
      code: `function binarySearch(arr, target) {\n  let l = 0, r = arr.length - 1;\n  while (l <= r) {\n    let m = (l + r) >> 1;\n    if (arr[m] === target) return m;\n    arr[m] < target ? l = m + 1 : r = m - 1;\n  }\n}`
    },
  ]
};

export async function fetchTopicData(): Promise<TopicData> {
  try {
    const res = await fetch(`/src/data/current_topic.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('Not found');
    return await res.json();
  } catch {
    return DEFAULT_CONFIG;
  }
}

const cache = new Map<string, ComplexityData[]>();

export function buildComplexities(data: TopicData): ComplexityData[] {
  const key = data.title;
  if (cache.has(key)) return cache.get(key)!;
  const result = (data.curves || DEFAULT_CONFIG.curves).map((c: any) => ({
    id: c.id,
    name: c.name || c.label,
    label: c.label,
    color: c.color,
    formula: createFormula(c.formula),
    code: c.code
  }));
  cache.set(key, result);
  return result;
}

// Helper to convert string formula to function safely
const createFormula = (formulaStr: string) => {
  try {
    let body = formulaStr.trim();
    if (body.startsWith('n =>')) {
      body = body.substring(4).trim();
    } else if (body.startsWith('(n) =>')) {
      body = body.substring(6).trim();
    }
    return (n: number) => {
      try {
        const func = new Function('n', 'Math', `with(Math) { return (${body}); }`);
        let val = func(n, Math);
        return (!isFinite(val) || val == null) ? 0 : Number(val);
      } catch (e) {
        console.warn(`Formula error for "${formulaStr}":`, e);
        return 0;
      }
    };
  } catch (e) {
    return () => 0;
  }
};
