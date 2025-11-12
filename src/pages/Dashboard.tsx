import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, FileCheck, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  totalTemplates: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  totalPayouts: number;
  totalEarnings: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTemplates: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0,
    totalPayouts: 0,
    totalEarnings: 0,
  });
  const [weeklyData, setWeeklyData] = useState<{ name: string; earnings: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ name: string; submissions: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [usersRes, templatesRes, submissionsRes, pendingRes, payoutsRes, earningsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('templates').select('*', { count: 'exact', head: true }),
        supabase.from('submissions').select('*', { count: 'exact', head: true }),
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('payouts').select('amount'),
        supabase.from('earnings').select('amount, created_at'),
      ]);

      const totalPayouts = payoutsRes.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalEarnings = earningsRes.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        totalTemplates: templatesRes.count || 0,
        totalSubmissions: submissionsRes.count || 0,
        pendingSubmissions: pendingRes.count || 0,
        totalPayouts,
        totalEarnings,
      });

      // Process weekly earnings data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: weeklyEarnings } = await supabase
        .from('earnings')
        .select('amount, created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyMap = new Map<string, number>();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = daysOfWeek[date.getDay()];
        weeklyMap.set(dayName, 0);
      }

      weeklyEarnings?.forEach((earning) => {
        const date = new Date(earning.created_at);
        const dayName = daysOfWeek[date.getDay()];
        weeklyMap.set(dayName, (weeklyMap.get(dayName) || 0) + (earning.amount || 0));
      });

      const weeklyChartData = Array.from(weeklyMap.entries()).map(([name, earnings]) => ({
        name,
        earnings: Math.round(earnings * 100) / 100,
      }));
      setWeeklyData(weeklyChartData);

      // Process monthly submissions data (last 4 weeks)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      
      const { data: recentSubmissions } = await supabase
        .from('submissions')
        .select('submitted_at')
        .gte('submitted_at', fourWeeksAgo.toISOString());

      const weeklySubmissions = [0, 0, 0, 0];
      recentSubmissions?.forEach((sub) => {
        const daysAgo = Math.floor((Date.now() - new Date(sub.submitted_at).getTime()) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(daysAgo / 7);
        if (weekIndex < 4) {
          weeklySubmissions[3 - weekIndex]++;
        }
      });

      const monthlyChartData = weeklySubmissions.map((count, index) => ({
        name: `Week ${index + 1}`,
        submissions: count,
      }));
      setMonthlyData(monthlyChartData);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">Monitor your affiliate platform performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Active platform members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground mt-1">Available templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-1">All time submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Platform earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payouts Processed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalPayouts.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total paid out</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="submissions" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
