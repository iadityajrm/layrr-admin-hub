import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, CheckCircle } from 'lucide-react';

interface Earning {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  users?: { name: string; email: string };
}

export default function Earnings() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, paid: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const { data, error } = await supabase
        .from('earnings')
        .select(`
          *,
          users:user_id (name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const earningsData = data || [];
      setEarnings(earningsData);

      // Calculate stats
      const pending = earningsData
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + e.amount, 0);
      const paid = earningsData
        .filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + e.amount, 0);

      setStats({ pending, paid });
    } catch (error) {
      console.error('Error fetching earnings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch earnings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (id: string, userId: string, amount: number) => {
    try {
      // Update earnings status
      const { error: earningsError } = await supabase
        .from('earnings')
        .update({ status: 'paid' })
        .eq('id', id);

      if (earningsError) throw earningsError;

      // Create payout record
      const { error: payoutError } = await supabase
        .from('payouts')
        .insert([{
          user_id: userId,
          amount: amount,
          processed_at: new Date().toISOString(),
        }]);

      if (payoutError) throw payoutError;

      toast({
        title: "Success",
        description: "Payout processed successfully",
      });

      fetchEarnings();
    } catch (error) {
      console.error('Error processing payout:', error);
      toast({
        title: "Error",
        description: "Failed to process payout",
        variant: "destructive",
      });
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
        <h1 className="page-header">Earnings & Payouts</h1>
        <p className="text-muted-foreground mt-2">Manage user earnings and process payouts</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.pending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.paid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully processed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Earnings</CardTitle>
          <CardDescription>View and process user earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnings.map((earning) => (
                <TableRow key={earning.id}>
                  <TableCell className="font-medium">{earning.users?.name || 'Unknown'}</TableCell>
                  <TableCell>{earning.users?.email || 'N/A'}</TableCell>
                  <TableCell>${earning.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={earning.status === 'paid' ? 'default' : 'secondary'}>
                      {earning.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(earning.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {earning.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => markAsPaid(earning.id, earning.user_id, earning.amount)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark as Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
