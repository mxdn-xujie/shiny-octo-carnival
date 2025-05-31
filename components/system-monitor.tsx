import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';

interface SystemStats {
  connectedUsers: number;
  uptime: number;
  memoryUsage: number;
  cpuLoad: number;
}

export function SystemMonitor() {
  const [stats, setStats] = useState<SystemStats>({
    connectedUsers: 0,
    uptime: 0,
    memoryUsage: 0,
    cpuLoad: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/system/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('获取系统状态失败:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          系统状态监控
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">在线用户:</span>
            <Badge variant="secondary">{stats.connectedUsers}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">运行时间:</span>
            <Badge variant="secondary">{Math.floor(stats.uptime / 3600)}小时</Badge>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">内存使用:</span>
            <Badge variant={stats.memoryUsage > 80 ? "destructive" : "secondary"}>
              {stats.memoryUsage}%
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">CPU负载:</span>
            <Badge variant={stats.cpuLoad > 80 ? "destructive" : "secondary"}>
              {stats.cpuLoad}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );