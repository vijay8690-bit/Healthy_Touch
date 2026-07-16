import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Search,
  Filter,
  Mail,
  Clock,
  CheckCircle,
  Trash2,
  X,
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  CreditCard,
  DollarSign,
  Settings,
  Home,
  IndianRupee,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/hooks/use-toast';
import { queryService } from '@/services/query.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export default function AdminQueries() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [queries, setQueries] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedQuery, setSelectedQuery] = useState<any>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchQueries();
  }, [statusFilter]);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter.toUpperCase();
      if (searchQuery) params.search = searchQuery;

      const response = await queryService.getAllQueries(params);
      if (response.success) {
        setQueries(response.queries);
        setStats(response.stats);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch queries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReply = (query: any) => {
    setSelectedQuery(query);
    setReplyText(query.adminReply || '');
    setIsReplyModalOpen(true);
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast({
        title: 'Missing Reply',
        description: 'Please enter your reply',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await queryService.replyToQuery(selectedQuery._id, replyText);
      if (response.success) {
        toast({
          title: 'Reply Sent',
          description: 'Your reply has been sent via email',
        });
        setIsReplyModalOpen(false);
        setReplyText('');
        setSelectedQuery(null);
        fetchQueries();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send reply',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (queryId: string) => {
    if (!confirm('Are you sure you want to delete this query?')) return;

    try {
      const response = await queryService.deleteQuery(queryId);
      if (response.success) {
        toast({
          title: 'Query Deleted',
          description: 'Query has been deleted successfully',
        });
        fetchQueries();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete query',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (queryId: string, status: string) => {
    try {
      const response = await queryService.updateQueryStatus(queryId, status);
      if (response.success) {
        toast({
          title: 'Status Updated',
          description: 'Query status has been updated',
        });
        fetchQueries();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole="admin"
      sidebarLinks={sidebarLinks}
      userName="Admin"
      notificationCount={0}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Contact Queries</h1>
          <p className="text-muted-foreground">Manage customer questions and feedback</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card-healthcare p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Queries</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="card-healthcare p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{stats?.open || 0}</p>
              </div>
            </div>
          </div>

          <div className="card-healthcare p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Replied</p>
                <p className="text-2xl font-bold">{stats?.replied || 0}</p>
              </div>
            </div>
          </div>

          <div className="card-healthcare p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <X className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold">{stats?.closed || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card-healthcare p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchQueries}>
              <Filter className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
        </div>

        {/* Queries List */}
        <div className="space-y-4">
          {queries.length === 0 ? (
            <div className="card-healthcare p-12 text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No queries found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all'
                  ? `No ${statusFilter} queries at the moment`
                  : 'No customer queries have been submitted yet'}
              </p>
            </div>
          ) : (
            queries.map((query) => (
              <motion.div
                key={query._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-healthcare p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{query.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(query.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        query.status === 'OPEN'
                          ? 'bg-yellow-100 text-yellow-700'
                          : query.status === 'REPLIED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {query.status}
                    </span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Message:</p>
                  <p className="text-sm">{query.message}</p>
                </div>

                {query.adminReply && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-900">Your Reply:</p>
                    </div>
                    <p className="text-sm text-green-800">{query.adminReply}</p>
                    {query.repliedAt && (
                      <p className="text-xs text-green-600 mt-2">
                        Replied on {new Date(query.repliedAt).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenReply(query)}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {query.status === 'REPLIED' ? 'Update Reply' : 'Reply'}
                  </Button>
                  {query.status !== 'CLOSED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(query._id, 'CLOSED')}
                    >
                      Mark as Closed
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(query._id)}
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Reply Modal */}
        <Dialog open={isReplyModalOpen} onOpenChange={setIsReplyModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Reply to Query</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">From:</p>
                <p className="text-sm font-semibold">{selectedQuery?.email}</p>
                <p className="text-sm font-medium text-muted-foreground mt-3 mb-1">Message:</p>
                <p className="text-sm">{selectedQuery?.message}</p>
              </div>

              <div>
                <Label>Your Reply *</Label>
                <Textarea
                  placeholder="Type your reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This reply will be sent to the user via email
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsReplyModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1 gap-2" onClick={handleReply}>
                  <Send className="w-4 h-4" />
                  Send Reply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
}
