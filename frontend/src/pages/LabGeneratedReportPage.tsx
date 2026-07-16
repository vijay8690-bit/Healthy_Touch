import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, HeartPulse, Loader2, Microscope, ShieldCheck, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getGeneratedLabBookingReport, openGeneratedLabBookingReportPdf } from '@/services/labTest.service';
import { getAssetViewUrl } from '@/utils/assetProxy';
import { renderPdfFirstPageToCanvas } from '@/utils/pdfPreview';
import { useSettings } from '@/contexts/SettingsContext';

const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : 'N/A';
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN') : 'N/A';

export default function LabGeneratedReportPage() {
  const { bookingId } = useParams();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadReport = async () => {
      if (!bookingId) return;
      try {
        setLoading(true);
        const response = await getGeneratedLabBookingReport(bookingId);
        setData(response);
      } catch (err: any) {
        setError(err?.message || 'Unable to load generated report');
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [bookingId]);

  const groupedResults = useMemo(() => {
    const map = new Map<string, any[]>();
    (data?.report?.results || []).forEach((row: any) => {
      const section = row.section || 'General';
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(row);
    });
    return Array.from(map.entries());
  }, [data]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  if (error || !data) {
    return <div className="mx-auto max-w-xl p-8 text-center text-destructive">{error || 'Report not found'}</div>;
  }

  const booking = data.booking;
  const report = data.report;
  const provider = booking.assignedLabProviderId || {};
  const providerUser = provider.userId || {};
  const reportTests = booking.selectedTests?.length ? booking.selectedTests : (booking.tests || []);

  return (
    <main className="min-h-screen bg-slate-100 p-2 sm:p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-3 flex max-w-5xl justify-end sm:mb-4 print:hidden">
        <Button className="w-full sm:w-auto" onClick={() => openGeneratedLabBookingReportPdf(booking._id, report.reportName, true)}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <CoverPage booking={booking} report={report} tests={reportTests} contactPhone={(settings as any)?.contactPhone || '+91 9887894498'} />

      <article className="mx-auto mb-5 min-h-0 w-full max-w-[794px] bg-white p-3 shadow-sm sm:min-h-[1123px] sm:p-5 print:mb-0 print:min-h-0 print:break-before-page print:shadow-none">
        <header className="flex flex-col items-center gap-4 text-center sm:grid sm:grid-cols-[140px_1fr_92px] sm:items-start">
          <div>
            <img src="/healthy-touch-logo.png" alt="Healthy Touch" className="h-14 object-contain" />
            <p className="mt-1 text-[10px] font-semibold text-red-500">A Care That New Outs...</p>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-normal text-blue-950 sm:text-2xl">LABORATORY TEST REPORT</h1>
            <div className="mx-auto mt-3 w-full max-w-72 rounded-sm bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white sm:text-xs">
              ACCURATE | RELIABLE | CONFIDENTIAL
            </div>
          </div>
          <div className="text-center text-[10px] font-semibold">
            <p>Scan to Verify</p>
            <p>This Report</p>
            <img src={report.verificationQrUrl} alt="Scan to download report" className="mt-1 h-16 w-16 border border-slate-700 object-contain" />
          </div>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoCard title="PATIENT DETAILS" rows={[
            ['Patient ID', String(booking.patientId?._id || booking.patientId || 'N/A').slice(-10).toUpperCase()],
            ['Patient Name', booking.patientName],
            ['Mobile No.', booking.patientMobile],
            ['Address', `${booking.address || ''}, ${booking.city || ''}`],
          ]} />
          <InfoCard title="REPORT DETAILS" rows={[
            ['Booking ID', String(booking._id).slice(-12).toUpperCase()],
            ['Report ID', report.reportId],
            ['Sample Collected On', formatDateTime(booking.sampleCollectedAt)],
            ['Report Generated On', formatDateTime(report.generatedAt)],
            ['Report Status', booking.status?.replace(/_/g, ' ')],
          ]} />
          <InfoCard title="LABORATORY DETAILS" rows={[
            ['Lab Name', provider.labName || providerUser.name || 'Healthy Touch Lab'],
            ['Lab ID', provider.labCode || 'N/A'],
            ['Contact No.', provider.labContactNumber || providerUser.mobile || 'N/A'],
            ['Email', providerUser.email || 'N/A'],
            ['NABL Accredited', provider.nablCertificate?.length ? 'Yes' : 'N/A'],
          ]} />
        </section>

        <section className="mt-5 overflow-hidden rounded border border-slate-300">
          <div className="bg-blue-950 px-3 py-2 text-xs font-bold text-white">TEST RESULTS</div>
          {report.resultAttachmentUrl ? (
            <AttachmentPreview
              url={report.resultAttachmentUrl}
              name={report.resultAttachmentName || 'Test result attachment'}
              mimeType={report.resultAttachmentMimeType}
              previewUrl={report.resultAttachmentPreviewUrl}
            />
          ) : (
          <div className="overflow-x-auto">
          <table className="min-w-[560px] w-full border-collapse text-xs sm:min-w-0">
            <thead>
              <tr className="bg-slate-100 text-slate-900">
                <th className="border border-slate-300 p-2">TEST NAME</th>
                <th className="border border-slate-300 p-2">RESULT</th>
                <th className="border border-slate-300 p-2">UNIT</th>
                <th className="border border-slate-300 p-2">REFERENCE RANGE</th>
                <th className="border border-slate-300 p-2">METHOD</th>
              </tr>
            </thead>
            <tbody>
              {groupedResults.map(([section, rows]) => (
                <>
                  <tr key={`${section}-section`}>
                    <td colSpan={5} className="border border-slate-300 bg-emerald-50 p-2 font-bold text-emerald-700">{section.toUpperCase()}</td>
                  </tr>
                  {rows.map((row, index) => (
                    <tr key={`${section}-${row.testName}-${index}`}>
                      <td className="border border-slate-300 p-2 font-medium">{row.testName}</td>
                      <td className="border border-slate-300 p-2 text-center font-semibold">{row.result}</td>
                      <td className="border border-slate-300 p-2 text-center">{row.unit || '-'}</td>
                      <td className="border border-slate-300 p-2 text-center">{row.referenceRange || '-'}</td>
                      <td className="border border-slate-300 p-2 text-center">{row.method || '-'}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
          </div>
          )}
        </section>

        <p className="mt-3 text-[11px]">Note: Reference ranges are as per adults. Please correlate clinically.</p>

        <section className="mt-4 grid gap-3 md:grid-cols-3">
          <BottomBox title="COMMENTS / INTERPRETATION">
            {report.comments || 'All parameters are within normal range. Kindly consult your physician for clinical correlation.'}
          </BottomBox>
          <BottomBox title="CONCLUSION / SUMMARY">
            <div className="space-y-2">
              <Badge variant="outline" className="border-emerald-300 text-emerald-700">Overall</Badge>
              <p>{report.summary || 'The test results are within normal limits. Maintain healthy lifestyle and routine check-ups.'}</p>
            </div>
          </BottomBox>
          <BottomBox title="AUTHORIZED BY">
            <div className="text-center">
              {report.signatureUrl ? <img src={report.signatureUrl} alt="Signature" className="mx-auto h-12 object-contain" /> : <div className="mx-auto h-12 w-36 border-b-2 border-red-400" />}
              <p className="mt-2 font-bold">{report.authorizedBy || 'Authorized Signatory'}</p>
              <p>{report.authorizedQualification}</p>
              <p>{report.registrationNumber ? `Reg. No. ${report.registrationNumber}` : ''}</p>
            </div>
          </BottomBox>
        </section>
      </article>

      <section className="mx-auto h-[1123px] w-full max-w-[794px] overflow-auto bg-white shadow-sm print:break-before-page print:shadow-none">
        <iframe
          title="General Recommendation on Preventive Screening"
          src="/lab-report-recommendation.html"
          className="h-full w-full border-0"
        />
      </section>
    </main>
  );
}

function CoverPage({ booking, report, tests, contactPhone }: { booking: any; report: any; tests: any[]; contactPhone: string }) {
  const patientId = String(booking.patientId?._id || booking.patientId || 'N/A').slice(-10).toUpperCase();
  const sampleId = String(booking._id || 'N/A').slice(-10).toUpperCase();
  const testNames = tests.map((test) => test.testName).filter(Boolean).join(', ') || 'Lab Test';

  return (
    <section className="relative mx-auto mb-5 flex min-h-0 w-full max-w-[794px] flex-col overflow-hidden bg-white px-3 pb-4 pt-4 shadow-sm sm:min-h-[1123px] sm:px-12 sm:pb-8 sm:pt-10 print:mb-0 print:break-after-page print:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <img src="/healthy-touch-logo.png" alt="Healthy Touch" className="h-14 w-32 object-contain object-left sm:h-28 sm:w-64" />
        <div className="text-right font-semibold tracking-normal text-blue-950 sm:hidden">
          <p className="text-sm leading-none">INFINITY VISION</p>
          <p className="mt-1 text-[9px] tracking-[0.24em]">OVERSEAS</p>
        </div>
      </div>
      <div className="absolute right-12 top-14 hidden text-right font-semibold tracking-normal text-blue-950 sm:block">
        <p className="text-2xl leading-none">INFINITY VISION</p>
        <p className="mt-2 text-xs tracking-[0.38em]">OVERSEAS</p>
      </div>

      <div className="mb-5 mt-5 grid grid-cols-[minmax(0,1fr)_124px] items-center gap-3 sm:mb-10 sm:mt-14 sm:grid-cols-[1fr_350px] sm:gap-6">
        <div>
          <h1 className="text-xl font-bold leading-tight text-blue-950 sm:text-[42px]">
            YOUR HEALTH,
            <br />
            <span className="text-lime-600">OUR PRIORITY</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600 sm:mt-4 sm:text-lg">
            Accurate Reports. Better Insights.
            <br />
            Healthier You.
          </p>
          <div className="mt-3 h-1 w-20 bg-blue-600 sm:mt-6 sm:w-32" />
          <ul className="mt-4 grid gap-2 text-[11px] font-medium text-slate-700 sm:mt-10 sm:block sm:space-y-8 sm:text-base">
            {[
              { label: 'Advanced Technology', icon: Microscope },
              { label: 'Accurate Results', icon: ShieldCheck },
              { label: 'Trusted Care', icon: Stethoscope },
              { label: 'Better Health Outcomes', icon: HeartPulse },
            ].map(({ label, icon: Icon }, index) => (
              <li key={label} className="flex items-center gap-2 sm:gap-4">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white sm:h-10 sm:w-10 ${index % 2 ? 'bg-lime-600' : 'bg-blue-700'}`}>
                  <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto w-full max-w-[124px] rounded-full border-2 border-blue-600 bg-white p-1.5 sm:max-w-none sm:border-4 sm:p-2">
          <img src="/lab_testimg.png" alt="Laboratory sample testing" className="aspect-square w-full rounded-full object-cover" />
        </div>
      </div>

      <div className="-mx-3 mt-auto rounded-t-[24px] bg-blue-700 px-3 pb-5 pt-5 text-white sm:-mx-12 sm:rounded-t-[46px] sm:px-12 sm:pb-10 sm:pt-10">
        <h2 className="mb-4 text-lg font-bold sm:mb-6 sm:text-2xl">LABORATORY REPORT</h2>
        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3 sm:grid-cols-[1fr_150px] sm:gap-8">
          <div className="space-y-2 text-xs sm:space-y-3 sm:text-sm">
            <CoverDetail label="Patient Name" value={booking.patientName} />
            <CoverDetail label="Patient ID" value={patientId} />
            <CoverDetail label="Age / Gender" value={`${booking.patientId?.age || 'N/A'} / ${booking.patientId?.gender || 'N/A'}`} />
            <CoverDetail label="Sample ID" value={sampleId} />
            <CoverDetail label="Tests" value={testNames} />
            <CoverDetail label="Report Date" value={formatDate(report.generatedAt)} />
          </div>
          <div className="rounded-xl bg-white p-2 text-center text-blue-950 sm:p-3">
            <img src={report.verificationQrUrl} alt="Scan to download complete report" className="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24" />
            <p className="mt-2 text-[10px] font-medium">Scan to Download</p>
            <p className="text-[10px] font-medium">Complete Report</p>
          </div>
        </div>
      </div>

      <div className="-mx-3 flex flex-col items-start gap-2 border-t bg-white px-3 py-3 text-[10px] font-medium text-slate-700 sm:-mx-12 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-12 sm:py-5 sm:text-[11px]">
        <span>{contactPhone}</span>
        <span>care@healthytouch.com</span>
        <span className="max-w-[340px] text-left sm:text-right">Managed by Infinity vision overseas GROUND FLOOR, Flat No.: 01, MANDAWARA ROAD, MANDAWARA ROAD, Hindaun, Hindaun, Rajasthan 322230</span>
      </div>
    </section>
  );
}

function CoverDetail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[78px_8px_1fr] gap-1 break-words sm:grid-cols-[104px_10px_1fr]">
      <span>{label}</span>
      <span>:</span>
      <span className="font-semibold">{value || 'N/A'}</span>
    </div>
  );
}

function AttachmentPreview({ url, name, mimeType, previewUrl }: { url: string; name: string; mimeType?: string; previewUrl?: string }) {
  const isImage = String(mimeType || '').startsWith('image/');
  const isPdf = String(mimeType || '').includes('pdf') || /\.pdf($|\?)/i.test(url);
  const canRenderPdfAsImage = isPdf && /res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(url);
  const assetUrl = getAssetViewUrl(url, 'inline', {
    format: isPdf ? 'pdf' : undefined,
    filename: name,
  });
  const pdfImageUrl = canRenderPdfAsImage
    ? getAssetViewUrl(url, 'inline', { format: 'png', filename: name.replace(/\.pdf$/i, '.png') })
    : '';
  const savedPreviewUrl = previewUrl
    ? getAssetViewUrl(previewUrl, 'inline', { filename: name.replace(/\.pdf$/i, '-preview.png') })
    : '';

  return (
    <div className="bg-white">
      {isImage && (
        <div className="bg-white">
          <img src={assetUrl} alt={name} className="h-auto w-full object-contain" />
        </div>
      )}
      {canRenderPdfAsImage && !savedPreviewUrl && (
        <div className="bg-white">
          <img src={pdfImageUrl} alt={name} className="h-auto w-full object-contain" />
        </div>
      )}
      {savedPreviewUrl && !isImage && (
        <img src={savedPreviewUrl} alt={name} className="h-auto w-full object-contain" />
      )}
      {isPdf && !isImage && !canRenderPdfAsImage && !savedPreviewUrl && (
        <PdfPageImage url={assetUrl} name={name} />
      )}
      {!isImage && !isPdf && (
        <img src={assetUrl} alt={name} className="h-auto w-full object-contain" />
      )}
    </div>
  );
}

function PdfPageImage({ url, name }: { url: string; name: string }) {
  const [preview, setPreview] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    renderPdfFirstPageToCanvas(url)
      .then((canvas) => {
        if (active) setPreview(canvas.toDataURL('image/png'));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [url]);

  if (failed) return <p className="p-4 text-sm text-destructive">Unable to display uploaded test result.</p>;
  if (!preview) return <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  return <img src={preview} alt={name} className="h-auto w-full object-contain" />;
}

function InfoCard({ title, rows }: { title: string; rows: Array<[string, any]> }) {
  return (
    <div className="overflow-hidden rounded border border-slate-300 text-xs">
      <div className="bg-blue-950 px-3 py-2 font-bold text-white">{title}</div>
      <div className="space-y-2 p-3">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[92px_1fr] gap-1">
            <span className="font-bold">{label}</span>
            <span>: {value || 'N/A'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BottomBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-32 rounded border border-slate-300 p-3 text-xs">
      <h3 className="mb-3 text-xs font-bold text-blue-950">{title}</h3>
      {children}
    </div>
  );
}
