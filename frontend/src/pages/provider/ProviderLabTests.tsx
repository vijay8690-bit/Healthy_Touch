import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ClipboardList, XCircle, FileText, Trash2, Eye, Download, Save } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getAssetViewUrl } from '@/utils/assetProxy';
import { createPdfFirstPagePreviewFile } from '@/utils/pdfPreview';
import {
  deleteProviderGeneratedLabReport,
  deleteProviderLabBookingReportData,
  generateProviderLabBookingReport,
  getProviderGeneratedLabReport,
  getProviderAssignedLabBookings,
  openLabReportPdf,
  openGeneratedLabBookingReportPdf,
  saveProviderLabBookingReportData,
  updateProviderLabBookingStatus,
  updateProviderGeneratedLabReport,
} from '@/services/labTest.service';

export default function ProviderLabTests() {
  const [assignedOrders, setAssignedOrders] = useState<any[]>([]);
  const [orderInputs, setOrderInputs] = useState<Record<string, {
    reason?: string;
    generatedTestId?: string;
    editingReportId?: string;
    editingReportName?: string;
    parameters?: Array<{ section?: string; testName?: string; name: string; methodology?: string; resultValue: string; unit?: string; normalRange?: string; flag?: string }>;
    comments?: string;
    summary?: string;
    authorizedBy?: string;
    authorizedQualification?: string;
    registrationNumber?: string;
    signatureUrl?: string;
  }>>({});
  const [loading, setLoading] = useState(true);
  const [generatingOrderId, setGeneratingOrderId] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, {
    resultAttachment?: File | null;
    resultAttachmentPreview?: File | null;
    signatureImage?: File | null;
  }>>({});
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const ordersRes = await getProviderAssignedLabBookings();
      setAssignedOrders(ordersRes.bookings || []);
    } catch (error: any) {
      toast({
        title: 'Unable to load lab tests',
        description: error?.response?.data?.message || error?.message || 'Only approved lab providers can access this page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getParameterNames = (test: any) => {
    const master = test.labTestId || {};
    const names = master.parameters?.length ? master.parameters : (master.includes?.length ? master.includes : []);
    return (names.length ? names : [test.testName]).filter(Boolean);
  };

  const buildReportRows = (test: any) => getParameterNames(test).map((name: string) => ({
    section: test.labTestId?.category || test.category || 'General',
    testName: test.testName,
    name,
    methodology: '',
    resultValue: '',
    unit: '',
    normalRange: '',
    flag: '',
  }));

  const buildCombinedReportRows = (tests: any[]) => tests.flatMap((test) => buildReportRows(test));

  const prepareCombinedReport = (bookingId: string, tests: any[], input: any) => {
    setOrderInputs((current) => ({
      ...current,
      [bookingId]: {
        ...input,
        generatedTestId: 'all',
        parameters: buildCombinedReportRows(tests),
      },
    }));
  };

  const updateReportParameter = (bookingId: string, input: any, index: number, patch: any) => {
    const rows = [...(input.parameters || [])];
    rows[index] = { ...rows[index], ...patch };
    setOrderInputs((current) => ({ ...current, [bookingId]: { ...input, parameters: rows } }));
  };

  const saveGeneratedReportData = async (order: any) => {
    const input = orderInputs[order._id] || {};
    const files = generatedFiles[order._id] || {};

    if (!files.resultAttachment && !order.resultAttachmentUrl) {
      toast({ title: 'Upload test result PDF/image', variant: 'destructive' });
      return;
    }

    try {
      setGeneratingOrderId(order._id);
      let resultAttachmentPreview = files.resultAttachmentPreview;
      const hasLegacyPdfWithoutPreview = !files.resultAttachment
        && !order.resultAttachmentPreviewUrl
        && order.resultAttachmentMimeType === 'application/pdf'
        && !/res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(String(order.resultAttachmentUrl || ''));
      if (hasLegacyPdfWithoutPreview) {
        resultAttachmentPreview = await createPdfFirstPagePreviewFile(
          getAssetViewUrl(order.resultAttachmentUrl, 'inline', {
            format: 'pdf',
            filename: order.resultAttachmentName || 'test-result.pdf',
          }),
          order.resultAttachmentName || 'test-result.pdf',
        );
      }
      await saveProviderLabBookingReportData(order._id, {
        reportResults: [],
        comments: input.comments,
        summary: input.summary,
        authorizedBy: input.authorizedBy,
        authorizedQualification: input.authorizedQualification,
        registrationNumber: input.registrationNumber,
        signatureUrl: input.signatureUrl,
        resultAttachment: files.resultAttachment,
        resultAttachmentPreview,
        signatureImage: files.signatureImage,
      });
      setGeneratedFiles((current) => ({ ...current, [order._id]: {} }));
      toast({ title: 'Generated report saved' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingOrderId('');
    }
  };

  const deleteGeneratedReportData = async (order: any) => {
    const confirmed = window.confirm('Delete generated report data? Patient/admin generated report access will be removed.');
    if (!confirmed) return;

    try {
      setGeneratingOrderId(order._id);
      await deleteProviderLabBookingReportData(order._id);
      setGeneratedFiles((current) => ({ ...current, [order._id]: {} }));
      setOrderInputs((current) => ({ ...current, [order._id]: { reason: current[order._id]?.reason || '' } }));
      toast({ title: 'Generated report deleted' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingOrderId('');
    }
  };

  const getGeneratedReportId = (report: any) => {
    if (String(report.url || '').startsWith('/api/')) {
      const parts = String(report.url).split('/').filter(Boolean);
      return parts[parts.length - 2] || report.reportId || '';
    }
    return report.reportId || '';
  };

  const editGeneratedReport = async (bookingId: string, reportEntry: any, input: any) => {
    const reportId = getGeneratedReportId(reportEntry);
    if (!reportId) {
      toast({ title: 'Generated report id not found', variant: 'destructive' });
      return;
    }

    try {
      const response = await getProviderGeneratedLabReport(reportId);
      const report = response.report;
      setOrderInputs((current) => ({
        ...current,
        [bookingId]: {
          ...input,
          generatedTestId: 'all',
          editingReportId: report._id || reportId,
          editingReportName: report.reportId || reportEntry.name || 'Generated report',
          parameters: (report.parameters || []).map((item: any) => ({
            testName: item.testName || '',
            name: item.name || '',
            methodology: item.methodology || '',
            resultValue: item.resultValue || '',
            unit: item.unit || '',
            normalRange: item.normalRange || '',
            flag: item.flag || '',
          })),
        },
      }));
      toast({ title: 'Report loaded for editing' });
    } catch (error: any) {
      toast({
        title: 'Unable to load report',
        description: error?.message || error?.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const deleteGeneratedReport = async (bookingId: string, reportEntry: any, input: any) => {
    const reportId = getGeneratedReportId(reportEntry);
    if (!reportId) {
      toast({ title: 'Generated report id not found', variant: 'destructive' });
      return;
    }

    const confirmed = window.confirm('Delete this report? Patient access will be removed if it was already uploaded.');
    if (!confirmed) return;

    try {
      await deleteProviderGeneratedLabReport(reportId);
      setOrderInputs((current) => {
        const currentInput = current[bookingId] || input;
        if (currentInput.editingReportId !== reportId && currentInput.editingReportName !== reportEntry.name) {
          return current;
        }
        return {
          ...current,
          [bookingId]: {
            ...currentInput,
            editingReportId: '',
            editingReportName: '',
            parameters: [],
          },
        };
      });
      toast({ title: 'Report deleted' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Unable to delete report',
        description: error?.message || error?.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const updateOrderStatus = async (bookingId: string, status: 'lab_accepted' | 'lab_rejected' | 'sample_collected' | 'report_ready' | 'completed') => {
    const input = orderInputs[bookingId] || {};
    if (status === 'lab_rejected' && !input.reason?.trim()) {
      toast({ title: 'Please enter rejection reason', variant: 'destructive' });
      return;
    }
    const selectedOrder = assignedOrders.find((order) => order._id === bookingId);
    const selectedOrderHasMainReport = hasMainReport(selectedOrder);
    if (status === 'report_ready' && !selectedOrderHasMainReport) {
      toast({ title: 'Please upload Main Lab Report PDF before marking ready', variant: 'destructive' });
      return;
    }
    if (status === 'completed' && selectedOrder?.status !== 'report_ready') {
      toast({ title: 'Mark report ready before completing this order', variant: 'destructive' });
      return;
    }

    try {
      await updateProviderLabBookingStatus(bookingId, {
        status,
        reason: input.reason,
      });
      toast({ title: 'Lab order updated' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const setGeneratedFile = (bookingId: string, field: 'resultAttachment' | 'signatureImage', file?: File | null) => {
    setGeneratedFiles((current) => ({
      ...current,
      [bookingId]: {
        ...(current[bookingId] || {}),
        [field]: file || null,
      },
    }));
  };

  const setResultAttachment = async (bookingId: string, file?: File | null) => {
    let preview: File | null = null;
    if (file?.type === 'application/pdf') {
      try {
        preview = await createPdfFirstPagePreviewFile(file);
      } catch (error: any) {
        toast({
          title: 'Unable to preview PDF',
          description: error?.message || 'Please upload an image or another PDF.',
          variant: 'destructive',
        });
        return;
      }
    }
    setGeneratedFiles((current) => ({
      ...current,
      [bookingId]: {
        ...(current[bookingId] || {}),
        resultAttachment: file || null,
        resultAttachmentPreview: preview,
      },
    }));
  };

  const generateReport = async (order: any) => {
    const tests = order.selectedTests || order.tests || [];
    const input = orderInputs[order._id] || {};
    const rows = input.parameters?.length ? input.parameters : buildCombinedReportRows(tests);
    const filledRows = rows.filter((row: any) => row.name?.trim() && row.resultValue?.trim());

    if (!tests.length) {
      toast({ title: 'No tests found for this order', variant: 'destructive' });
      return;
    }
    if (!filledRows.length) {
      toast({ title: 'Enter at least one result value', variant: 'destructive' });
      return;
    }

    try {
      setGeneratingOrderId(order._id);
      if (input.editingReportId) {
        await updateProviderGeneratedLabReport(input.editingReportId, {
          testName: tests.map((test: any) => test.testName).filter(Boolean).join(', '),
          parameters: filledRows,
        });
      } else {
        await generateProviderLabBookingReport(order._id, {
        testName: tests.map((test: any) => test.testName).filter(Boolean).join(', '),
        parameters: filledRows,
        });
      }
      toast({
        title: input.editingReportId ? 'Report updated' : 'Report generated',
        description: 'Report is saved as draft. Click Mark Completed and Upload to send it to the patient.',
      });
      setOrderInputs((current) => ({
        ...current,
        [order._id]: {
          ...input,
          editingReportId: '',
          editingReportName: '',
          parameters: buildCombinedReportRows(tests),
        },
      }));
      loadData();
    } catch (error: any) {
      toast({
        title: 'Report generation failed',
        description: error?.message || error?.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingOrderId('');
    }
  };

  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN') : 'N/A';
  const hasMainReport = (order: any) => Boolean(
    order.mainReportPdfUrl ||
    order.reportUrl ||
    order.reportResults?.length ||
    order.resultAttachmentUrl ||
    (order.reportFiles || []).some((report: any) => !report.reportType || ['main', 'other'].includes(report.reportType)) ||
    order.reports?.length
  );

  return (
    <DashboardLayout
      sidebarLinks={getProviderSidebarLinks(user)}
      portalName="Manage Lab Tests"
      userName={user?.name || 'Provider'}
      userInitial={user?.name?.charAt(0) || 'P'}
    >
      <div>
        <h2 className="font-display text-2xl font-bold">Manage Lab Tests</h2>
        <p className="text-muted-foreground">Manage assigned lab orders, generate reports, and update patient order status.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <section className="card-healthcare p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="h-5 w-5 text-primary" />
            Assigned Lab Orders
          </h3>
          {assignedOrders.length > 0 ? (
            <div className="space-y-4">
              {assignedOrders.map((order) => {
                const tests = order.selectedTests || order.tests || [];
                const input = {
                  comments: order.comments || '',
                  summary: order.summary || '',
                  authorizedBy: order.authorizedBy || '',
                  authorizedQualification: order.authorizedQualification || '',
                  registrationNumber: order.registrationNumber || '',
                  signatureUrl: order.signatureUrl || '',
                  ...(orderInputs[order._id] || {}),
                };
                const mainReportUploaded = hasMainReport(order);
                const hasGeneratedReport = !!(order.reportResults?.length || order.resultAttachmentUrl || order.summaryAttachmentUrl);
                const canSaveGeneratedReport = !['lab_rejected', 'cancelled', 'rejected_by_admin', 'completed'].includes(order.status);
                const namedReportUrls = new Set([order.mainReportPdfUrl].filter(Boolean));
                const publishedReports = (order.reportFiles?.length ? order.reportFiles : order.reports || [])
                  .filter((report: any) => !namedReportUrls.has(report.url));
                const draftReports = (order.generatedReports || [])
                  .filter((report: any) => report.status === 'draft')
                  .map((report: any) => ({
                    url: report.generatedPdfUrl,
                    name: `${report.reportId} - ${report.testName}`,
                    reportId: report.reportId,
                    generated: true,
                    draft: true,
                  }));
                const reports = [...draftReports, ...publishedReports];
                return (
                  <div key={order._id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Badge className="capitalize">{String(order.status).replace(/_/g, ' ')}</Badge>
                          <Badge variant="outline">{order.collectionType === 'home' ? 'Home collection' : 'Lab visit'}</Badge>
                        </div>
                        <h4 className="font-semibold">{order.patientName}</h4>
                        <p className="text-sm text-muted-foreground">{order.patientMobile}</p>
                        <p className="mt-2 text-sm">{formatDate(order.preferredDate)}, {order.preferredTimeSlot}</p>
                        <p className="text-sm text-muted-foreground">{order.address}, {order.city}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {tests.map((test: any) => (
                            <Badge key={`${order._id}-${test.testId}`} variant="outline">{test.testName}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-2 lg:w-[620px]">
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" onClick={() => updateOrderStatus(order._id, 'lab_accepted')} disabled={order.status !== 'assigned_to_lab'}>
                            <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order._id, 'lab_rejected')} disabled={order.status !== 'assigned_to_lab'}>
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </div>
                        <Input
                          placeholder="Reject reason"
                          value={input.reason || ''}
                          onChange={(e) => setOrderInputs((current) => ({ ...current, [order._id]: { ...input, reason: e.target.value } }))}
                        />
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order._id, 'sample_collected')} disabled={!['lab_accepted', 'assigned_to_lab'].includes(order.status)}>
                          Mark Sample Collected
                        </Button>
                        {reports.length > 0 && (
                          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                            <p className="mb-2 font-medium">Reports</p>
                            {reports.map((report: any, index: number) => (
                              report.generated || String(report.url || '').startsWith('/api/') ? (
                              <div key={report.url || index} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/70 p-2">
                                <button
                                  type="button"
                                  onClick={() => openLabReportPdf(report.url, report.name || order.reportName || `Lab report ${index + 1}`)}
                                  className="flex min-w-0 items-center gap-2 text-left text-primary hover:underline"
                                >
                                  <FileText className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{report.name || order.reportName || `Lab report ${index + 1}`}</span>
                                  {report.draft && <Badge variant="outline">Draft</Badge>}
                                </button>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => editGeneratedReport(order._id, report, input)}>
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteGeneratedReport(order._id, report, input)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="mr-1 h-4 w-4" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                              ) : (
                                <div key={report.url || index} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/70 p-2">
                                  <span className="flex min-w-0 items-center gap-2 text-sm">
                                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                                    <span className="truncate">{report.name || order.reportName || `Lab report ${index + 1}`}</span>
                                  </span>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openLabReportPdf(report.url, report.name || order.reportName || `Lab report ${index + 1}`)}>
                                      View
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => openLabReportPdf(report.url, report.name || order.reportName || `Lab report ${index + 1}`, true)}>
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              )
                            ))}
                          </div>
                        )}
                        {hasGeneratedReport && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-emerald-800">{order.generatedReportId || 'Generated report'} - {tests.map((test: any) => test.testName).filter(Boolean).join(', ')}</span>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => window.open(`/lab-bookings/${order._id}/generated-report`, '_blank')}>
                                  <Eye className="mr-1 h-4 w-4" />
                                  Preview
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openGeneratedLabBookingReportPdf(order._id, order.generatedReportId || 'Lab report', true)}>
                                  <Download className="mr-1 h-4 w-4" />
                                  PDF
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteGeneratedReportData(order)}
                                  disabled={generatingOrderId === order._id}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="mr-1 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="rounded-lg border border-border p-3">
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-medium">Generated Professional Report</p>
                              <p className="text-xs text-muted-foreground">Upload existing result PDF/image; it will appear inside the Healthy Touch report template.</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => saveGeneratedReportData(order)}
                              disabled={!canSaveGeneratedReport || generatingOrderId === order._id}
                            >
                              {generatingOrderId === order._id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                              {hasGeneratedReport ? 'Update Generated Report' : 'Save Generated Report'}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <ReportUploadRow
                              label="Test Result PDF / Image"
                              required
                              accept="application/pdf,image/jpeg,image/jpg,image/png"
                              currentName={order.resultAttachmentName}
                              currentUrl={order.resultAttachmentUrl}
                              selectedFile={generatedFiles[order._id]?.resultAttachment}
                              onFileChange={(file) => void setResultAttachment(order._id, file)}
                            />
                            <ReportUploadRow
                              label="Authorized Signature Image"
                              accept="image/jpeg,image/jpg,image/png"
                              currentName={order.signatureUrl ? 'Signature uploaded' : ''}
                              currentUrl={order.signatureUrl}
                              selectedFile={generatedFiles[order._id]?.signatureImage}
                              onFileChange={(file) => setGeneratedFile(order._id, 'signatureImage', file)}
                            />
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <textarea className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Comments / Interpretation" value={input.comments || ''} onChange={(e) => setOrderInputs((current) => ({ ...current, [order._id]: { ...input, comments: e.target.value } }))} />
                            <textarea className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Conclusion / Summary text (optional)" value={input.summary || ''} onChange={(e) => setOrderInputs((current) => ({ ...current, [order._id]: { ...input, summary: e.target.value } }))} />
                            <Input placeholder="Authorized by name" value={input.authorizedBy || ''} onChange={(e) => setOrderInputs((current) => ({ ...current, [order._id]: { ...input, authorizedBy: e.target.value } }))} />
                            <Input placeholder="Qualification" value={input.authorizedQualification || ''} onChange={(e) => setOrderInputs((current) => ({ ...current, [order._id]: { ...input, authorizedQualification: e.target.value } }))} />
                            <Input placeholder="Registration number" value={input.registrationNumber || ''} onChange={(e) => setOrderInputs((current) => ({ ...current, [order._id]: { ...input, registrationNumber: e.target.value } }))} />
                          </div>
                          <Button
                            size="sm"
                            className="mt-3 w-full sm:hidden"
                            onClick={() => saveGeneratedReportData(order)}
                            disabled={!canSaveGeneratedReport || generatingOrderId === order._id}
                          >
                            {generatingOrderId === order._id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                            {hasGeneratedReport ? 'Update Generated Report' : 'Save Generated Report'}
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order._id, 'report_ready')}
                          disabled={order.status !== 'sample_collected' || !mainReportUploaded}
                        >
                          Mark Report Ready
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order._id, 'completed')}
                          disabled={order.status !== 'report_ready'}
                        >
                          Mark Completed
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No assigned lab orders yet.</p>
          )}
        </section>
      )}
    </DashboardLayout>
  );
}

function ReportUploadRow({
  label,
  required = false,
  accept,
  currentName,
  currentUrl,
  selectedFile,
  onFileChange,
}: {
  label: string;
  required?: boolean;
  accept: string;
  currentName?: string;
  currentUrl?: string;
  selectedFile?: File | null;
  onFileChange: (file?: File | null) => void;
}) {
  const displayName = selectedFile?.name || currentName || 'No file uploaded';

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {label} {required && <span className="text-destructive">*</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{displayName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentUrl && (
            <>
              <Button size="sm" variant="outline" onClick={() => window.open(getAssetViewUrl(currentUrl), '_blank')}>
                <Eye className="mr-1 h-4 w-4" />
                View
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(getAssetViewUrl(currentUrl, 'attachment'), '_self')}>
                <Download className="mr-1 h-4 w-4" />
                Download
              </Button>
            </>
          )}
          <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            {currentUrl ? 'Replace' : 'Upload'}
            <input
              type="file"
              accept={accept}
              className="sr-only"
              onChange={(event) => onFileChange(event.target.files?.[0] || null)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
