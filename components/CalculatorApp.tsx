import React, { useMemo, useState } from 'react';
import { Delete, Divide, Equal, Minus, Plus, RefreshCw, Sparkles, X } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { callOllamaCloudJson } from '../services/ollamaCloudService';

type CalculatorTab = 'calculate' | 'convert' | 'graph';
type ConverterCategory = 'length' | 'mass' | 'temperature' | 'volume' | 'time';

type GraphConfig = {
    equation: string;
    xMin: number;
    xMax: number;
    title?: string;
};

const TAB_BUTTONS: Array<{ id: CalculatorTab; label: string }> = [
    { id: 'calculate', label: 'Calculator' },
    { id: 'convert', label: 'Converter' },
    { id: 'graph', label: 'Graph' },
];

const CONVERTER_OPTIONS: Record<ConverterCategory, Array<{ label: string; value: string }>> = {
    length: [
        { label: 'Meters', value: 'm' },
        { label: 'Kilometers', value: 'km' },
        { label: 'Centimeters', value: 'cm' },
        { label: 'Miles', value: 'mi' },
        { label: 'Feet', value: 'ft' },
    ],
    mass: [
        { label: 'Kilograms', value: 'kg' },
        { label: 'Grams', value: 'g' },
        { label: 'Pounds', value: 'lb' },
        { label: 'Ounces', value: 'oz' },
    ],
    temperature: [
        { label: 'Celsius', value: 'c' },
        { label: 'Fahrenheit', value: 'f' },
        { label: 'Kelvin', value: 'k' },
    ],
    volume: [
        { label: 'Liters', value: 'l' },
        { label: 'Milliliters', value: 'ml' },
        { label: 'Cups', value: 'cup' },
        { label: 'Gallons', value: 'gal' },
    ],
    time: [
        { label: 'Seconds', value: 's' },
        { label: 'Minutes', value: 'min' },
        { label: 'Hours', value: 'hr' },
        { label: 'Days', value: 'day' },
    ],
};

const PRESET_FUNCTIONS = [
    { label: 'Linear', equation: 'x' },
    { label: 'Quadratic', equation: 'x^2' },
    { label: 'Cubic', equation: 'x^3 - 3*x' },
    { label: 'Sine', equation: 'sin(x)' },
    { label: 'Cosine', equation: 'cos(x)' },
    { label: 'Exponential', equation: 'exp(x/4)' },
    { label: 'Logarithm', equation: 'log(x)' },
];

const CALC_BUTTONS = [
    { label: 'C', value: 'clear', className: 'text-red-400 bg-red-400/10 hover:bg-red-400/20' },
    { label: '(', value: '(' },
    { label: ')', value: ')' },
    { label: <Delete size={18} />, value: 'delete', className: 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20' },
    { label: 'sin', value: 'sin(' },
    { label: 'cos', value: 'cos(' },
    { label: 'tan', value: 'tan(' },
    { label: <Divide size={18} />, value: '/' , className: 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20' },
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: <X size={18} />, value: '*', className: 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20' },
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: <Minus size={18} />, value: '-', className: 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20' },
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: <Plus size={18} />, value: '+', className: 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20' },
    { label: '0', value: '0', className: 'col-span-2' },
    { label: '.', value: '.' },
    { label: <Equal size={18} />, value: 'equal', className: 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30' },
];

function normalizeExpression(expression: string): string {
    return expression
        .replace(/\^/g, '**')
        .replace(/π/g, 'pi')
        .replace(/÷/g, '/')
        .replace(/×/g, '*');
}

function safeEvaluateExpression(expression: string, xValue?: number): number {
    const source = normalizeExpression(expression.trim());
    if (!source) {
        throw new Error('Empty expression');
    }

    if (!/^[0-9+\-*/^().,\sA-Za-z_%]*$/.test(source)) {
        throw new Error('Unsupported characters');
    }

    const transformed = source
        .replace(/\bpi\b/gi, 'Math.PI')
        .replace(/\be\b/g, 'Math.E')
        .replace(/\bsin\(/gi, 'Math.sin(')
        .replace(/\bcos\(/gi, 'Math.cos(')
        .replace(/\btan\(/gi, 'Math.tan(')
        .replace(/\bsqrt\(/gi, 'Math.sqrt(')
        .replace(/\babs\(/gi, 'Math.abs(')
        .replace(/\bexp\(/gi, 'Math.exp(')
        .replace(/\blog10\(/gi, 'Math.log10(')
        .replace(/\blog\(/gi, 'Math.log(')
        .replace(/\bln\(/gi, 'Math.log(')
        .replace(/\bx\b/gi, String(xValue ?? 0));

    const result = Function('"use strict"; return (' + transformed + ');')();
    if (typeof result !== 'number' || Number.isNaN(result) || !Number.isFinite(result)) {
        throw new Error('Invalid result');
    }
    return result;
}

function convertWithFactor(value: number, from: number, to: number): number {
    return value * from / to;
}

function convertUnit(category: ConverterCategory, value: number, from: string, to: string): number {
    if (category === 'temperature') {
        if (from === to) return value;

        const toCelsius = (() => {
            if (from === 'c') return value;
            if (from === 'f') return (value - 32) * 5 / 9;
            return value - 273.15;
        })();

        if (to === 'c') return toCelsius;
        if (to === 'f') return (toCelsius * 9) / 5 + 32;
        return toCelsius + 273.15;
    }

    const factors: Record<string, number> = {
        m: 1,
        km: 1000,
        cm: 0.01,
        mi: 1609.34,
        ft: 0.3048,
        kg: 1,
        g: 0.001,
        lb: 0.453592,
        oz: 0.0283495,
        l: 1,
        ml: 0.001,
        cup: 0.236588,
        gal: 3.78541,
        s: 1,
        min: 60,
        hr: 3600,
        day: 86400,
    };

    return convertWithFactor(value, factors[from], factors[to]);
}

async function askAiForGraph(prompt: string): Promise<GraphConfig> {
    return await callOllamaCloudJson<GraphConfig>([
        {
            role: 'system',
            content: 'You convert graphing requests into plotting instructions. Return only valid JSON with keys equation, xMin, xMax, and optional title.'
        },
        {
            role: 'user',
            content: `Convert this plotting request into a graph configuration for a calculator app: "${prompt}".

Supported equation syntax: x, +, -, *, /, ^, sin(x), cos(x), tan(x), sqrt(x), abs(x), exp(x), log(x).
Return JSON like:
{
  "equation": "sin(x)",
  "xMin": -10,
  "xMax": 10,
  "title": "Sine Wave"
}`
        }
    ], 700);
}

export const CalculatorApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<CalculatorTab>('calculate');
    const [expression, setExpression] = useState('0');
    const [result, setResult] = useState('0');
    const [category, setCategory] = useState<ConverterCategory>('length');
    const [fromUnit, setFromUnit] = useState('m');
    const [toUnit, setToUnit] = useState('km');
    const [converterInput, setConverterInput] = useState('1');
    const [graphEquation, setGraphEquation] = useState('sin(x)');
    const [graphTitle, setGraphTitle] = useState('Sine Wave');
    const [graphPrompt, setGraphPrompt] = useState('');
    const [graphRange, setGraphRange] = useState({ xMin: -10, xMax: 10 });
    const [graphError, setGraphError] = useState('');
    const [graphLoading, setGraphLoading] = useState(false);

    const converterOptions = CONVERTER_OPTIONS[category];

    const convertedValue = useMemo(() => {
        const input = parseFloat(converterInput);
        if (Number.isNaN(input)) return '0';
        try {
            return convertUnit(category, input, fromUnit, toUnit).toFixed(4).replace(/\.?0+$/, '');
        } catch {
            return 'Error';
        }
    }, [category, converterInput, fromUnit, toUnit]);

    const graphData = useMemo(() => {
        try {
            const points: Array<{ x: number; y: number }> = [];
            const totalPoints = 80;
            const step = (graphRange.xMax - graphRange.xMin) / totalPoints;

            for (let index = 0; index <= totalPoints; index += 1) {
                const x = graphRange.xMin + step * index;
                const y = safeEvaluateExpression(graphEquation, x);
                if (Number.isFinite(y)) {
                    points.push({
                        x: Number(x.toFixed(2)),
                        y: Number(y.toFixed(4)),
                    });
                }
            }

            return points;
        } catch {
            return [];
        }
    }, [graphEquation, graphRange]);

    const handleButtonPress = (value: string) => {
        if (value === 'clear') {
            setExpression('0');
            setResult('0');
            return;
        }

        if (value === 'delete') {
            setExpression((current) => (current.length > 1 ? current.slice(0, -1) : '0'));
            return;
        }

        if (value === 'equal') {
            try {
                const nextResult = safeEvaluateExpression(expression);
                setResult(String(nextResult));
                setExpression(String(nextResult));
            } catch {
                setResult('Error');
            }
            return;
        }

        setExpression((current) => (current === '0' ? value : current + value));
    };

    const handleAskAiGraph = async () => {
        if (!graphPrompt.trim()) return;

        setGraphLoading(true);
        setGraphError('');

        try {
            const config = await askAiForGraph(graphPrompt);
            setGraphEquation(config.equation || 'x');
            setGraphRange({
                xMin: config.xMin ?? -10,
                xMax: config.xMax ?? 10,
            });
            setGraphTitle(config.title || 'AI Graph');
        } catch (error: any) {
            setGraphError(error?.message || 'Could not generate graph config.');
        } finally {
            setGraphLoading(false);
        }
    };

    const renderCalculator = () => (
        <div className="flex h-full flex-col gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/35">Expression</div>
                <div className="min-h-[64px] break-all text-right font-mono text-2xl text-white/90">{expression}</div>
                <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Result</div>
                    <div className="mt-1 text-right text-4xl font-light text-cyan-300">{result}</div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                {CALC_BUTTONS.map((button, index) => (
                    <button
                        key={index}
                        onClick={() => handleButtonPress(button.value)}
                        className={`h-14 rounded-2xl border border-white/10 px-3 text-lg font-medium transition-all active:scale-95 ${button.className || 'bg-white/5 text-white hover:bg-white/10'} ${button.className?.includes('col-span-2') ? 'col-span-2' : ''}`}
                    >
                        {button.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const renderConverter = () => (
        <div className="flex h-full flex-col gap-4">
            <div className="grid grid-cols-5 gap-2">
                {(Object.keys(CONVERTER_OPTIONS) as ConverterCategory[]).map((option) => (
                    <button
                        key={option}
                        onClick={() => {
                            const nextUnits = CONVERTER_OPTIONS[option];
                            setCategory(option);
                            setFromUnit(nextUnits[0].value);
                            setToUnit(nextUnits[1].value);
                        }}
                        className={`rounded-2xl border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${category === option ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-white/10 bg-white/5 text-white/45 hover:bg-white/10'}`}
                    >
                        {option}
                    </button>
                ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-white/35">Unit Converter</div>
                <input
                    value={converterInput}
                    onChange={(event) => setConverterInput(event.target.value)}
                    className="mb-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-2xl text-white outline-none"
                    placeholder="Enter value"
                />

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <select
                        value={fromUnit}
                        onChange={(event) => setFromUnit(event.target.value)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                    >
                        {converterOptions.map((option) => (
                            <option key={option.value} value={option.value} className="bg-[#1C1C1E]">
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => {
                            const nextFrom = toUnit;
                            setFromUnit(toUnit);
                            setToUnit(nextFrom);
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    >
                        <RefreshCw size={16} />
                    </button>

                    <select
                        value={toUnit}
                        onChange={(event) => setToUnit(event.target.value)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                    >
                        {converterOptions.map((option) => (
                            <option key={option.value} value={option.value} className="bg-[#1C1C1E]">
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/60">Converted</div>
                    <div className="mt-2 text-3xl font-light text-emerald-200">{convertedValue}</div>
                </div>
            </div>
        </div>
    );

    const renderGraph = () => (
        <div className="flex h-full flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
                {PRESET_FUNCTIONS.map((preset) => (
                    <button
                        key={preset.label}
                        onClick={() => {
                            setGraphEquation(preset.equation);
                            setGraphTitle(preset.label);
                            setGraphError('');
                        }}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10 hover:text-white/90"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Equation Plotter</div>
                        <div className="mt-1 text-lg text-white/85">{graphTitle}</div>
                    </div>
                    <div className="text-xs text-white/35">Use `x`, `sin`, `cos`, `tan`, `sqrt`, `log`, `exp`</div>
                </div>

                <input
                    value={graphEquation}
                    onChange={(event) => {
                        setGraphEquation(event.target.value);
                        setGraphError('');
                    }}
                    className="mb-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-white outline-none"
                    placeholder="e.g. sin(x) + x/4"
                />

                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="number"
                        value={graphRange.xMin}
                        onChange={(event) => setGraphRange((current) => ({ ...current, xMin: Number(event.target.value) }))}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                        placeholder="Min X"
                    />
                    <input
                        type="number"
                        value={graphRange.xMax}
                        onChange={(event) => setGraphRange((current) => ({ ...current, xMax: Number(event.target.value) }))}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                        placeholder="Max X"
                    />
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/35">
                        <Sparkles size={14} />
                        AI Graph Prompt
                    </div>
                    <textarea
                        value={graphPrompt}
                        onChange={(event) => setGraphPrompt(event.target.value)}
                        className="h-20 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                        placeholder="Ask AI to plot something, e.g. 'plot a damped sine wave from -20 to 20'"
                    />
                    <button
                        onClick={handleAskAiGraph}
                        disabled={graphLoading || !graphPrompt.trim()}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
                    >
                        {graphLoading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Ask AI To Plot
                    </button>
                </div>

                {graphError && (
                    <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                        {graphError}
                    </div>
                )}
            </div>

            <div className="flex-1 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                        <XAxis dataKey="x" stroke="rgba(255,255,255,0.35)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                        <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(15, 15, 20, 0.95)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '16px',
                                color: 'white',
                            }}
                        />
                        <Line type="monotone" dataKey="y" stroke="#38bdf8" dot={false} strokeWidth={2.5} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <div className="flex h-full flex-col bg-[#1C1C1E] p-4 text-white">
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-white/[0.03] p-2">
                {TAB_BUTTONS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${activeTab === tab.id ? 'bg-white/10 text-white shadow-[0_8px_24px_rgba(56,189,248,0.18)]' : 'text-white/45 hover:bg-white/5 hover:text-white/80'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
                {activeTab === 'calculate' && renderCalculator()}
                {activeTab === 'convert' && renderConverter()}
                {activeTab === 'graph' && renderGraph()}
            </div>
        </div>
    );
};
