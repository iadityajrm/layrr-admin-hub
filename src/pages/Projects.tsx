import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  project_name: string;
  slug: string;
  price: number;
  commission_rate: number;
  approval_status: 'pending' | 'under_review' | 'approved' | 'rejected';
  created_at: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, slug, price, commission_rate, approval_status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast({ title: 'Error', description: 'Failed to fetch projects', variant: 'destructive' });
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
        <h1 className="page-header">Projects</h1>
        <p className="text-muted-foreground mt-2">View project approval status and payout parameters</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Commission Rate</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.project_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.approval_status === 'approved'
                          ? 'default'
                          : p.approval_status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {p.approval_status}
                    </Badge>
                  </TableCell>
                  <TableCell>${p.price.toFixed(2)}</TableCell>
                  <TableCell>{p.commission_rate}%</TableCell>
                  <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}