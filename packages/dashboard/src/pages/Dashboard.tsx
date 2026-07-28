import { useQuery } from '@tanstack/react-query';
import { createFleetClient } from '@discord-fleet-manager/sdk';
import {
  Bot,
  Radio,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Users,
  Activity,
  Shield,
  Zap,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatUptime, formatNumber } from '../utils/format';

const client = createFleetClient({ baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000' });

async function fetchBots() {
  await client.connect();
  const bots = await client.getBots();
  await client.disconnect();
  return bots;
}

async function fetchHealth() {
  await client.connect();
  const health = await client.getFleetHealth();
  await client.disconnect();
  return health;
}

export function Dashboard() {
  const { data: bots = [], isLoading: botsLoading } = useQuery({ queryKey: ['bots'], queryFn: fetchBots });
  const { data: health, isLoading: healthLoading } = useQuery({ queryKey: ['health'], queryFn: fetchHealth });

  const onlineBots = bots.filter(b => b.status === 'online').length;
  const totalGuilds = bots.reduce((sum, b) => sum + (b.guildCount || 0), 0);
  const totalFeatures = bots.reduce((sum, b) => sum + (b.features?.filter((f: any) => f.enabled).length || 0), 0);

  const stats = [
    {
      label: 'Total Bots',
      value: bots.length,
      icon: Bot,
      color: 'phantom-info',
      trend: '+2 this week'
    },
    {
      label: 'Online',
      value: onlineBots,
      icon: CheckCircle,
      color: 'phantom-success',
      trend: `${onlineBots}/${bots.length} healthy`
    },
    {
      label: 'Guilds',
      value: formatNumber(totalGuilds),
      icon: Users,
      color: 'phantom-primary',
      trend: 'Across all bots'
    },
    {
      label: 'Features Active',
      value: totalFeatures,
      icon: Zap,
      color: 'phantom-warning',
      trend: `${Math.round((totalFeatures / (bots.length * 10)) * 100)}% utilization`
    }
  ];

  const healthBreakdown = health ? [
    { label: 'Token Security', score: health.breakdown.tokenSecurity, icon: Shield, color: 'phantom-success' },
    { label: 'Permission Coverage', score: health.breakdown.permissionCoverage, icon: Shield, color: 'phantom-info' },
    { label: 'Uptime', score: health.breakdown.uptime, icon: Activity, color: 'phantom-primary' },
    { label: 'Feature Utilization', score: health.breakdown.featureUtilization, icon: Zap, color: 'phantom-warning' },
    { label: 'Config Consistency', score: health.breakdown.configConsistency, icon: Server, color: 'phantom-info' }
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-phantom-text text-balance">Dashboard</h1>
          <p className="text-phantom-textMuted mt-1">Command center for your bot fleet</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { client.connect().then(() => client.getFleetHealth()).then(() => client.disconnect()); }}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label="Fleet statistics">
        {stats.map((stat, i) => (
          <Card key={stat.label} className="animate-stagger-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-phantom-textMuted text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-phantom-text tabular-nums mt-1">{stat.value}</p>
                <p className="text-phantom-textDim text-xs mt-1">{stat.trend}</p>
              </div>
              <div className={`p-3 rounded-xl bg-{stat.color}/10`}>
                <stat.icon className={`w-6 h-6 text-{stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Health */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-phantom-text">Fleet Health</h2>
            {health && (
              <Badge variant={health.overallScore >= 80 ? 'success' : health.overallScore >= 60 ? 'warning' : 'danger'}>
                {health.overallScore}/100
              </Badge>
            )}
          </div>

          {healthLoading ? (
            <div className="space-y-4" aria-busy="true">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center justify-between h-12 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-phantom-surfaceHover" />
                    <div className="w-24 h-4 bg-phantom-surfaceHover rounded" />
                  </div>
                  <div className="w-20 h-6 bg-phantom-surfaceHover rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {healthBreakdown.map((item, i) => (
                <div key={item.label} className="animate-stagger-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <item.icon className={`w-5 h-5 text-{item.color}`} />
                      <span className="font-medium text-phantom-text">{item.label}</span>
                    </div>
                    <span className={`font-mono font-semibold text-{item.color} tabular-nums`}>{item.score}%</span>
                  </div>
                  <div className="h-2 bg-phantom-surface rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r rounded-full transition-all duration-500 ease-spring"
                      style={{ 
                        width: `${item.score}%`,
                        backgroundColor: item.score >= 80 ? 'var(--phantom-success)' : 
                                       item.score >= 60 ? 'var(--phantom-warning)' : 'var(--phantom-danger)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <h3 className="text-lg font-semibold text-phantom-text mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" className="h-20 flex-col gap-2 justify-center" asChild>
                <a href="/bots" style={{textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%'}}>
                  <Bot className="w-6 h-6" />
                  <span className="text-sm font-medium">Add Bot</span>
                </a>
              </Button>
              <Button variant="secondary" className="h-20 flex-col gap-2 justify-center" asChild>
                <a href="/monitors" style={{textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%'}}>
                  <Radio className="w-6 h-6" />
                  <span className="text-sm font-medium">Start Monitor</span>
                </a>
              </Button>
              <Button variant="secondary" className="h-20 flex-col gap-2 justify-center" asChild>
                <a href="/intelligence" style={{textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%'}}>
                  <Brain className="w-6 h-6" />
                  <span className="text-sm font-medium">View Intel</span>
                </a>
              </Button>
              <Button variant="secondary" className="h-20 flex-col gap-2 justify-center" asChild>
                <a href="/settings" style={{textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%'}}>
                  <Settings className="w-6 h-6" />
                  <span className="text-sm font-medium">Settings</span>
                </a>
              </Button>
            </div>
          </Card>

          {/* Health Issues */}
          {health && health.issues.length > 0 && (
            <Card className="border-phantom-danger/30">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-phantom-danger" />
                <h3 className="text-lg font-semibold text-phantom-text">Issues Detected</h3>
                <Badge variant="danger">{health.issues.length}</Badge>
              </div>
              <ul className="space-y-2" role="list" aria-label="Health issues">
                {health.issues.slice(0, 5).map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                      issue.severity === 'critical' ? 'bg-phantom-danger' :
                      issue.severity === 'warning' ? 'bg-phantom-warning' : 'bg-phantom-info'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-phantom-text">{issue.message}</p>
                      <p className="text-phantom-textDim text-xs">
                        Affects {issue.affectedBots.length} bot(s){issue.affectedGuilds.length > 0 ? `, ${issue.affectedGuilds.length} guild(s)` : ''}
                      </p>
                    </div>
                    {issue.fixable && (
                      <Badge variant="success" className="text-xs">Auto-fixable</Badge>
                    )}
                  </li>
                ))}
                {health.issues.length > 5 && (
                  <li className="text-center text-phantom-textDim text-sm py-2">
                    +{health.issues.length - 5} more issues — view Intelligence for details
                  </li>
                )}
              </ul>
            </Card>
          )}

          {/* Recent Bots */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-phantom-text">Recent Bots</h3>
              <a href="/bots" className="text-sm text-phantom-primary hover:underline flex items-center gap-1">
                View all <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {botsLoading ? (
              <div className="space-y-3" aria-busy="true">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-phantom-surfaceHover" />
                    <div className="flex-1">
                      <div className="w-32 h-4 bg-phantom-surfaceHover rounded" />
                      <div className="w-20 h-3 bg-phantom-surfaceHover rounded mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : bots.length === 0 ? (
              <div className="text-center py-8 text-phantom-textDim">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No bots in fleet yet</p>
                <Button variant="primary" asChild className="mt-3" size="sm">
                  <a href="/bots">Add your first bot</a>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2" role="list">
                {bots.slice(0, 5).map((bot: any) => (
                  <li key={bot.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-phantom-primary/10 flex items-center justify-center">
                      {bot.avatar_url ? (
                        <img src={bot.avatar_url} alt="" className="w-10 h-10 rounded-lg" />
                      ) : (
                        <Bot className="w-5 h-5 text-phantom-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-phantom-text truncate">{bot.name}</p>
                      <p className="text-xs text-phantom-textDim">
                        {bot.client_id ? `ID: ${bot.client_id.slice(0, 10)}...` : 'Not connected'}
                      </p>
                    </div>
                    <Badge variant={bot.status === 'online' ? 'success' : 'neutral'}>
                      {bot.status === 'online' ? '🟢' : bot.status === 'starting' ? '🟡' : '🔴'} {bot.status}
                    </Badge>
                    <span className="text-xs text-phantom-textDim tabular-nums">
                      {formatUptime(bot.uptime || 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}