'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, Sparkles, Bot, User } from 'lucide-react';
import { useProtected } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/bottomnav';
import { TopBar } from '@/components/layout/topbar';
import { PageSpinner } from '@/components/ui/spinner';

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalDebt: number;
  netWorth: number;
  healthScore: number;
}

interface Message {
  type: 'user' | 'assistant';
  text: string;
  time: string;
}

function getTime() {
  return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function generateAdvice(data: DashboardData, question: string): string {
  const q = question.toLowerCase();
  const savings = data.monthlyIncome - data.monthlyExpenses;
  const savingsRate = data.monthlyIncome > 0 ? (savings / data.monthlyIncome) * 100 : 0;
  const debtToIncome = data.monthlyIncome > 0 ? (data.totalDebt / (data.monthlyIncome * 12)) * 100 : 0;

  // Keyword-based responses with real data
  if (q.includes('deuda') || q.includes('deudas') || q.includes('pagar')) {
    if (data.totalDebt <= 0) return '¡Excelente! No tienes deudas registradas. Mantén esa disciplina y enfócate en hacer crecer tu patrimonio.';
    const method = debtToIncome > 100 ? 'Avalancha' : 'Bola de Nieve';
    return `Con una deuda total de ${fmt(data.totalDebt)} y un ingreso mensual de ${fmt(data.monthlyIncome)}, te recomiendo el método **${method}**. ${method === 'Avalancha' ? 'Prioriza las deudas con mayor tasa de interés — ahorrarás más dinero a largo plazo.' : 'Paga primero la deuda más pequeña — ganarás impulso y motivación.'} Actualmente tu relación deuda/ingreso anual es ${debtToIncome.toFixed(0)}%, ${debtToIncome > 100 ? 'lo cual es elevado — urgente reducirla.' : 'dentro de rangos manejables.'}`;
  }

  if (q.includes('ahorro') || q.includes('ahorrar') || q.includes('emergencia')) {
    if (savingsRate < 0) return `Atención: estás gastando más de lo que ganas. Gastos: ${fmt(data.monthlyExpenses)} vs Ingresos: ${fmt(data.monthlyIncome)}. Es urgente reducir gastos variables. Empieza por identificar suscripciones o gastos no esenciales que puedas eliminar esta semana.`;
    if (savingsRate < 10) return `Tu tasa de ahorro es del ${savingsRate.toFixed(1)}%, por debajo del mínimo recomendado (20%). Con ahorros mensuales de ${fmt(savings)}, necesitarías ${Math.ceil(data.monthlyExpenses * 6 / savings)} meses para completar tu fondo de emergencia (6 meses de gastos = ${fmt(data.monthlyExpenses * 6)}).`;
    return `Tu tasa de ahorro es del ${savingsRate.toFixed(1)}% — ${savingsRate >= 20 ? '¡excelente!' : 'buena, pero puedes mejorar.'}. Actualmente ahorras ${fmt(savings)} al mes. ${data.totalDebt > 0 ? `Considera destinar parte de este ahorro a acelerar el pago de tus ${fmt(data.totalDebt)} de deuda.` : 'Considera invertir en CDTs, fondos de inversión o ETFs para hacer crecer tu capital.'}`;
  }

  if (q.includes('invers') || q.includes('invertir') || q.includes('patrimonio')) {
    if (savingsRate < 15) return `Para invertir primero debes estabilizar tus finanzas. Con una tasa de ahorro del ${savingsRate.toFixed(1)}%, enfócate en alcanzar el 20% antes de invertir. ${data.totalDebt > 0 ? `También tienes ${fmt(data.totalDebt)} en deudas — pagar deuda de alto interés es la mejor inversión.` : ''}`;
    return `Tienes un patrimonio neto de ${fmt(data.netWorth)} y ahorras ${fmt(savings)}/mes. Estrategia recomendada: 1) Mantén tu fondo de emergencia (${fmt(data.monthlyExpenses * 6)}). 2) ${data.totalDebt > 0 ? `Liquida tu deuda de ${fmt(data.totalDebt)}. ` : ''}3) Invierte el excedente: 50% en instrumentos seguros (CDTs, Fondos Fiducia), 30% en ETFs diversificados, 20% en mayor liquidez.`;
  }

  if (q.includes('presupuesto') || q.includes('gasto') || q.includes('gastos')) {
    const expenseRatio = data.monthlyIncome > 0 ? (data.monthlyExpenses / data.monthlyIncome) * 100 : 0;
    return `Tu relación gasto/ingreso es del ${expenseRatio.toFixed(1)}%. La regla 50/30/20 sugiere: 50% necesidades (${fmt(data.monthlyIncome * 0.5)}), 30% deseos (${fmt(data.monthlyIncome * 0.3)}), 20% ahorro e inversión (${fmt(data.monthlyIncome * 0.2)}). ${expenseRatio > 80 ? `Actualmente gastas demasiado — reduce gastos discrecionales.` : 'Estás en buen camino.'}`;
  }

  if (q.includes('puntaje') || q.includes('salud') || q.includes('score')) {
    return `Tu puntaje de salud financiera es ${data.healthScore}/100 (${data.healthScore >= 85 ? 'Excelente' : data.healthScore >= 70 ? 'Bueno' : data.healthScore >= 50 ? 'Regular' : 'Necesita mejora'}). Los factores principales: tasa de ahorro ${savingsRate.toFixed(1)}%, relación deuda/ingreso ${debtToIncome.toFixed(0)}%. ${data.healthScore < 70 ? `Para mejorar: aumenta tu tasa de ahorro por encima del 20% y reduce deudas.` : `Para llegar a 90+: mantén ahorros consistentes y diversifica inversiones.`}`;
  }

  if (q.includes('hola') || q.includes('buenos') || q.includes('inicio')) {
    return `¡Hola! Estoy aquí para ayudarte con tu salud financiera. Tu situación actual: Saldo ${fmt(data.totalBalance)}, Ahorro mensual: ${fmt(Math.max(0, savings))}, Deuda total: ${fmt(data.totalDebt)}, Puntaje: ${data.healthScore}/100. ¿Sobre qué quieres que te asesore hoy? Puedo ayudarte con deudas, ahorro, inversión, presupuesto o tu score financiero.`;
  }

  // Default contextual response
  return `Basado en tu perfil: ingresos ${fmt(data.monthlyIncome)}, gastos ${fmt(data.monthlyExpenses)}, ahorro mensual ${fmt(savings)}, deuda ${fmt(data.totalDebt)}. ${savings > 0 ? `Tienes capacidad de ahorro de ${fmt(savings)}/mes (${savingsRate.toFixed(1)}%). ` : 'Tus gastos superan tus ingresos — prioridad: reducir gastos. '}${data.totalDebt > 0 ? `Con ${fmt(data.totalDebt)} en deuda, considera el método Avalancha para ahorrar en intereses. ` : ''}¿Tienes alguna pregunta específica sobre deudas, ahorro, inversión o presupuesto?`;
}

const suggestions = [
  '¿Cómo mejorar mi puntaje financiero?',
  '¿Cuánto debo ahorrar cada mes?',
  '¿Cómo pagar mis deudas más rápido?',
  '¿Cómo distribuir mi presupuesto?',
];

export default function IAPage() {
  const { user, isLoading } = useProtected();
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    api.get<DashboardData>('/dashboard').then((d) => {
      setDashData(d);
      setMessages([{
        type: 'assistant',
        text: `¡Hola, ${user.name.split(' ')[0]}! Soy tu asesor financiero IA. Analicé tus datos: saldo disponible ${fmt(d.totalBalance)}, salud financiera ${d.healthScore}/100. ¿En qué puedo ayudarte hoy?`,
        time: getTime(),
      }]);
    });
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  async function sendMessage(text: string) {
    if (!text.trim() || !dashData) return;
    const userMsg: Message = { type: 'user', text: text.trim(), time: getTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));

    const response = generateAdvice(dashData, text);
    setMessages((prev) => [...prev, { type: 'assistant', text: response, time: getTime() }]);
    setThinking(false);
  }

  if (isLoading) return <PageSpinner />;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <TopBar title="Asesor IA" />

      <div className="pt-20 pb-44 px-6 max-w-2xl mx-auto space-y-4 min-h-screen">
        {/* Header */}
        <div className="glass-card rounded-[24px] p-5 shadow-card flex items-center gap-4 mt-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <Sparkles size={22} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-on-surface">Lumina IA Financiero</h2>
            <p className="text-xs text-on-surface-variant">Asesoría personalizada basada en tus datos reales</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-xs text-secondary font-medium">En línea</span>
          </div>
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="space-y-2">
            <p className="text-xs text-on-surface-variant uppercase tracking-[0.2em] px-1">Sugerencias</p>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-2xl bg-surface-container-low p-3 text-xs text-left text-on-surface hover:bg-surface-container transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.type === 'user' ? 'bg-primary text-white' : 'bg-surface-container text-primary'}`}>
                {msg.type === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`max-w-[85%] space-y-1 ${msg.type === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.type === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'glass-card text-on-surface rounded-tl-sm shadow-card'}`}>
                  {msg.text}
                </div>
                <p className="text-[10px] text-on-surface-variant px-1">{msg.time}</p>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 px-6 pb-3 pt-2 bg-surface/80 backdrop-blur-xl border-t border-outline-variant/10">
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="glass-card flex items-center gap-3 rounded-full border border-outline-variant/20 px-4 py-2.5 shadow-card"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant"
              placeholder="Pregúntame sobre tus finanzas..."
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-white transition hover:opacity-90 disabled:opacity-40 shrink-0"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
