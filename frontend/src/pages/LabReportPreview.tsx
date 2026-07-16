import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Download,
  FlaskConical,
  MapPin,
  Phone,
  Printer,
  QrCode,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';

const patientDetails = [
  ['Patient Name', 'Radhika Sharma'],
  ['Age / Gender', '34 Years / Female'],
  ['Contact Number', '+91 98765 43210'],
  ['Address', 'C-21, Vaishali Nagar, Jaipur, Rajasthan'],
  ['Collection Type', 'Home Sample Collection'],
];

const labDetails = [
  ['Lab Name', 'HealthyTouch Diagnostics'],
  ['Lab Code', 'HTJA67AB'],
  ['City', 'Jaipur'],
  ['Report Date', '14 May 2026, 10:42 AM'],
  ['Sample Collection Date', '14 May 2026, 07:15 AM'],
];

const reportRows = [
  {
    test: 'Hemoglobin',
    methodology: 'Cyanmethemoglobin',
    result: '10.8',
    unit: 'g/dL',
    reference: '12.0 - 15.0',
    abnormal: true,
  },
  {
    test: 'Total Leukocyte Count',
    methodology: 'Electrical Impedance',
    result: '7,600',
    unit: '/cumm',
    reference: '4,000 - 11,000',
  },
  {
    test: 'Platelet Count',
    methodology: 'Optical Flow Cytometry',
    result: '2.48',
    unit: 'lakh/cumm',
    reference: '1.50 - 4.50',
  },
  {
    test: 'Fasting Blood Glucose',
    methodology: 'Hexokinase',
    result: '118',
    unit: 'mg/dL',
    reference: '70 - 100',
    abnormal: true,
  },
  {
    test: 'HbA1c',
    methodology: 'HPLC',
    result: '5.7',
    unit: '%',
    reference: '< 5.7',
  },
  {
    test: 'Total Cholesterol',
    methodology: 'CHOD-PAP',
    result: '178',
    unit: 'mg/dL',
    reference: '< 200',
  },
  {
    test: 'TSH',
    methodology: 'CLIA',
    result: '2.36',
    unit: 'uIU/mL',
    reference: '0.35 - 5.50',
  },
];

const qrCells = [
  1, 1, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 1, 1, 0,
  1, 0, 1, 1, 0, 1, 1,
  0, 0, 1, 0, 1, 0, 0,
  1, 1, 0, 1, 1, 0, 1,
  0, 1, 1, 0, 0, 1, 0,
  1, 0, 1, 0, 1, 1, 1,
];

export default function LabReportPreview() {
  const { settings } = useSettings();
  const contactPhone = ((settings as any)?.contactPhone as string | undefined) || '+91 9887894498';
  return (
    <main className="min-h-screen bg-slate-100 px-2 py-3 text-slate-900 sm:px-3 sm:py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 grid max-w-[920px] grid-cols-2 gap-2 sm:flex sm:justify-end print:hidden">
        <Button className="w-full sm:w-auto" variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button className="w-full sm:w-auto" onClick={() => window.print()}>
          <Download className="mr-2 h-4 w-4" />
          Save PDF
        </Button>
      </div>

      <article className="mx-auto min-h-0 w-full max-w-[794px] overflow-hidden rounded-xl bg-white shadow-2xl shadow-slate-300/70 ring-1 ring-slate-200 sm:min-h-[1123px] sm:rounded-[18px] print:min-h-screen print:max-w-none print:rounded-none print:shadow-none print:ring-0">
        <header className="relative bg-teal-700 px-4 py-5 text-white sm:px-8 sm:py-7 print:px-7 print:py-6">
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-emerald-400 via-sky-400 to-lime-400" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-start gap-3 min-[420px]:flex-row min-[420px]:items-center sm:gap-4">
              <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-white p-2 shadow-lg shadow-teal-950/20 sm:h-20 sm:w-28">
                <img src="/healthy-touch-logo.png" alt="HealthyTouch" className="max-h-full object-contain" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">HealthyTouch</p>
                <h1 className="mt-1 text-xl font-bold tracking-normal sm:text-2xl">Professional Pathology Report</h1>
                <p className="mt-1 text-sm text-teal-50">Accurate diagnostics with compassionate care</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-right backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100">Report ID</p>
              <p className="text-2xl font-bold">HTJP101</p>
              <p className="mt-2 text-xs text-teal-50">Generated: 14 May 2026, 10:42 AM</p>
              <p className="text-xs text-teal-50">Page 1 of 1</p>
            </div>
          </div>
        </header>

        <section className="px-3 py-4 sm:px-8 sm:py-6 print:px-7 print:py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              icon={UserRound}
              title="Patient Details"
              accent="text-teal-700"
              items={patientDetails}
            />
            <InfoCard
              icon={Building2}
              title="Lab Details"
              accent="text-emerald-700"
              items={labDetails}
            />
          </div>

          <div className="my-6 border-t border-dashed border-slate-300" />

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-teal-800">
                <FlaskConical className="h-5 w-5" />
                <h2 className="text-lg font-bold tracking-normal">Complete Health Screening</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">Specimen: Whole blood / Serum / Plasma</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Verified</span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">NABL Process</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="min-w-[590px] w-full border-collapse text-left text-sm sm:min-w-0">
              <thead className="bg-teal-700 text-white">
                <tr>
                  <th className="w-[38%] px-4 py-3 font-semibold">Test Name / Methodology</th>
                  <th className="px-4 py-3 font-semibold">Result</th>
                  <th className="px-4 py-3 font-semibold">Unit</th>
                  <th className="px-4 py-3 font-semibold">Biological Reference Interval</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row, index) => (
                  <tr key={row.test} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border-t border-slate-200 px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.test}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{row.methodology}</p>
                    </td>
                    <td className={`border-t border-slate-200 px-4 py-3 text-base ${row.abnormal ? 'font-extrabold text-red-600' : 'font-semibold text-slate-900'}`}>
                      {row.result}
                    </td>
                    <td className="border-t border-slate-200 px-4 py-3 text-slate-700">{row.unit}</td>
                    <td className="border-t border-slate-200 px-4 py-3 text-slate-700">{row.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            <strong>Clinical note:</strong> Values highlighted in red are outside the biological reference interval. Results should be clinically correlated by the treating physician.
          </div>
        </section>

        <footer className="mt-auto border-t border-slate-200 bg-slate-50 px-4 py-5 sm:px-8 sm:py-6 print:px-7">
          <div className="grid gap-5 md:grid-cols-[130px_1fr_180px] md:items-end">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-bold text-teal-800">
                <QrCode className="h-4 w-4" />
                QR Verified
              </div>
              <div className="mt-2 grid h-24 w-24 grid-cols-7 gap-1 rounded-lg border border-slate-300 bg-white p-2">
                {qrCells.map((cell, index) => (
                  <span key={index} className={cell ? 'rounded-[2px] bg-slate-900' : 'rounded-[2px] bg-white'} />
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Scan to verify report</p>
            </div>

            <div className="space-y-3">
              <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <FooterLine icon={Phone} text={contactPhone} />
                <FooterLine icon={BadgeCheck} text="www.healthytouch.in" />
                <FooterLine icon={MapPin} text="HealthyTouch Diagnostics, Jaipur, Rajasthan" />
                <FooterLine icon={CalendarDays} text="Mon-Sat, 7:00 AM - 8:00 PM" />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                ISO 9001:2015 Certified Diagnostic Center
              </div>
            </div>

            <div className="text-center md:text-right">
              <div className="mb-2 h-12 border-b border-slate-400" />
              <p className="text-sm font-bold text-slate-900">Dr. Ananya Mehra</p>
              <p className="text-xs text-slate-500">Consultant Pathologist</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">Digitally Signed</p>
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  accent,
  items,
}: {
  icon: typeof UserRound;
  title: string;
  accent: string;
  items: string[][];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-3 flex items-center gap-2 ${accent}`}>
        <Icon className="h-5 w-5" />
        <h2 className="text-base font-bold tracking-normal">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map(([label, value]) => (
          <div key={label} className="grid grid-cols-1 gap-1 py-2 text-sm min-[420px]:grid-cols-[130px_1fr] min-[420px]:gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="font-medium text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FooterLine({ icon: Icon, text }: { icon: typeof Phone; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-teal-700" />
      <span className="truncate">{text}</span>
    </div>
  );
}
