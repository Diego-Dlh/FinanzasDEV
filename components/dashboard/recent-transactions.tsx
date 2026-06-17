const transactions = [
  { title: 'Apple Store', detail: 'Today, 2:45 PM', amount: '-$1,299.00', tone: 'error' },
  { title: 'Monthly Salary', detail: 'Yesterday, 9:00 AM', amount: '+$8,500.00', tone: 'secondary' },
  { title: 'Blue Bottle Coffee', detail: 'Oct 12, 8:12 AM', amount: '-$6.50', tone: 'error' },
];

export function RecentTransactions() {
  return (
    <div className="glass-card rounded-[24px] p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <p className="text-sm text-on-surface-variant">Tus últimos movimientos recientes.</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.title} className="flex items-center justify-between rounded-3xl bg-surface-container-lowest p-4 hover:bg-surface-container transition">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest">
                <span className="text-base text-primary">•</span>
              </div>
              <div>
                <p className="font-medium text-primary">{transaction.title}</p>
                <p className="text-sm text-on-surface-variant">{transaction.detail}</p>
              </div>
            </div>
            <p className={`text-sm font-semibold ${transaction.tone === 'error' ? 'text-error' : 'text-secondary'}`}>{transaction.amount}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
