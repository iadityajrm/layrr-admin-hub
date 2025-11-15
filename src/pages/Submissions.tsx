import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Submission {
  id: string;
  user_id: string;
  template_id: string;
  project_id: string;
  project_name: string;
  status: string;
  submitted_at: string;
  image_url?: string;
  price?: number;
  commission_rate?: number;
  users?: { full_name: string; email: string };
  templates?: { title: string };
  projects?: { 
    project_name: string; 
    slug: string;
    description?: string;
    price: number;
    commission_rate: number;
    approval_status?: 'pending' | 'under_review' | 'approved' | 'rejected';
    user_id?: string;
  };
}

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          users:user_id (full_name, email),
          templates:template_id (title),
          projects:project_id (project_name, slug, description, price, commission_rate, approval_status, user_id)
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveAndCreatePayout = async (submission: Submission) => {
    setApproving(true);
    try {
      // Get price and commission rate from project or submission
      const price = submission.projects?.price || submission.price || 0;
      const commissionRate = submission.projects?.commission_rate || submission.commission_rate || 0;
      
      // Calculate payout
      const payoutAmount = (price * commissionRate) / 100;

      // Update submission status
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ status: 'approved' })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // Update linked project's approval status to approved
      if (submission.project_id) {
        const { error: projectError } = await supabase
          .from('projects')
          .update({ approval_status: 'approved' })
          .eq('id', submission.project_id);
        if (projectError) throw projectError;
      }

      // Create earnings entry
      const { error: earningsError } = await supabase
        .from('earnings')
        .insert({
          user_id: submission.projects?.user_id || submission.user_id,
          amount: payoutAmount,
          status: 'pending',
          source: submission.id,
          created_at: new Date().toISOString(),
        });

      if (earningsError) throw earningsError;

      // Immediately add payout amount to user's earnings_total
      try {
        const targetUserId = submission.projects?.user_id || submission.user_id;
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('earnings_total')
          .eq('id', targetUserId)
          .single();

        if (userFetchError) throw userFetchError;

        const currentTotal = userData?.earnings_total || 0;
        const newTotal = currentTotal + payoutAmount;

        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ earnings_total: newTotal })
          .eq('id', targetUserId);

        if (userUpdateError) throw userUpdateError;
      } catch (userUpdateIssue) {
        console.warn('Warning: could not update user earnings_total immediately:', userUpdateIssue);
      }

      toast({
        title: "Success",
        description: `Submission approved and payout of $${payoutAmount.toFixed(2)} created`,
      });

      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Error approving submission:', error);
      toast({
        title: "Error",
        description: "Failed to approve submission and create payout",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const updateSubmissionStatus = async (id: string, status: 'rejected', projectId?: string) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // If rejecting, mark project approval as rejected
      if (status === 'rejected' && projectId) {
        const { error: projectError } = await supabase
          .from('projects')
          .update({ approval_status: 'rejected' })
          .eq('id', projectId);
        if (projectError) throw projectError;
      }

      toast({
        title: "Success",
        description: `Submission ${status} successfully`,
      });

      fetchSubmissions();
    } catch (error) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: "Failed to update submission",
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
        <h1 className="page-header">Submissions</h1>
        <p className="text-muted-foreground mt-2">Review and manage freelancer project submissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow 
                  key={submission.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <TableCell className="font-medium">{submission.project_name}</TableCell>
                  <TableCell>{submission.users?.full_name || 'Unknown'}</TableCell>
                  <TableCell>{submission.templates?.title || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        submission.status === 'approved'
                          ? 'default'
                          : submission.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        submission.projects?.approval_status === 'approved'
                          ? 'default'
                          : submission.projects?.approval_status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {submission.projects?.approval_status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    ${(submission.projects?.price ?? submission.price ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {(submission.projects?.commission_rate ?? submission.commission_rate ?? 0)}%
                  </TableCell>
                  <TableCell>{new Date(submission.submitted_at).toLocaleDateString()}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {submission.status === 'pending' && (
                        <>
                          {submission.projects?.approval_status === 'pending' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('projects')
                                    .update({ approval_status: 'under_review' })
                                    .eq('id', submission.project_id);
                                  if (error) throw error;
                                  toast({ title: 'Updated', description: 'Marked as Under Review' });
                                  fetchSubmissions();
                                } catch (err) {
                                  console.error('Error updating approval status:', err);
                                  toast({ title: 'Error', description: 'Failed to update approval status', variant: 'destructive' });
                                }
                              }}
                            >
                              Mark Under Review
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => approveAndCreatePayout(submission)}
                            disabled={approving}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateSubmissionStatus(submission.id, 'rejected', submission.project_id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Submission Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-6">
              {/* Image Preview */}
              {selectedSubmission.image_url && (
                <div className="w-full">
                  <img 
                    src={selectedSubmission.image_url} 
                    alt={selectedSubmission.project_name}
                    className="w-full h-auto rounded-lg border"
                  />
                </div>
              )}

              {/* Project Information */}
              <div className="grid gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Project Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Project Name</p>
                        <p className="font-medium">{selectedSubmission.projects?.project_name || selectedSubmission.project_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">URL Slug</p>
                        <p className="font-medium">{selectedSubmission.projects?.slug || 'N/A'}</p>
                      </div>
                    <div>
                      <p className="text-muted-foreground">Template</p>
                      <p className="font-medium">{selectedSubmission.templates?.title || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge
                        variant={
                          selectedSubmission.status === 'approved'
                            ? 'default'
                            : selectedSubmission.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {selectedSubmission.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Approval Status</p>
                      <Badge
                        variant={
                          selectedSubmission.projects?.approval_status === 'approved'
                            ? 'default'
                            : selectedSubmission.projects?.approval_status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {selectedSubmission.projects?.approval_status || 'pending'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedSubmission.projects?.description && (
                  <div>
                    <p className="text-muted-foreground text-sm">Description</p>
                    <p className="text-sm mt-1">{selectedSubmission.projects.description}</p>
                  </div>
                )}

                <Separator />

                {/* User Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Freelancer Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedSubmission.users?.full_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedSubmission.users?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Pricing Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing & Payout Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Template Price</p>
                      <p className="font-medium text-lg">
                        ${(selectedSubmission.projects?.price || selectedSubmission.price || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Commission Rate</p>
                      <p className="font-medium text-lg">
                        {(selectedSubmission.projects?.commission_rate || selectedSubmission.commission_rate || 0)}%
                      </p>
                    </div>
                    <div className="col-span-2 bg-muted/50 p-4 rounded-lg">
                      <p className="text-muted-foreground">Calculated Payout</p>
                      <p className="font-bold text-2xl text-primary">
                        ${(
                          ((selectedSubmission.projects?.price || selectedSubmission.price || 0) * 
                          (selectedSubmission.projects?.commission_rate || selectedSubmission.commission_rate || 0)) / 100
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p>Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                </div>

                {/* Actions */}
                {selectedSubmission.status === 'pending' && (
                  <div className="flex gap-3 pt-4">
                    {selectedSubmission.projects?.approval_status === 'pending' && (
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('projects')
                              .update({ approval_status: 'under_review' })
                              .eq('id', selectedSubmission.project_id);
                            if (error) throw error;
                            toast({ title: 'Updated', description: 'Marked as Under Review' });
                            fetchSubmissions();
                          } catch (err) {
                            console.error('Error updating approval status:', err);
                            toast({ title: 'Error', description: 'Failed to update approval status', variant: 'destructive' });
                          }
                        }}
                      >
                        Mark Under Review
                      </Button>
                    )}
                    <Button
                      className="flex-1"
                      onClick={() => approveAndCreatePayout(selectedSubmission)}
                      disabled={approving}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {approving ? 'Processing...' : 'Approve & Create Payout'}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        updateSubmissionStatus(selectedSubmission.id, 'rejected', selectedSubmission.project_id);
                        setSelectedSubmission(null);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
