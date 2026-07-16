import { Download, QrCode, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ProviderIdCardProps = {
  provider: any;
  className?: string;
  compact?: boolean;
};

const getProviderId = (provider: any) => provider?._id || provider?.id || "";

const getProviderName = (provider: any) =>
  provider?.userId?.name || provider?.name || provider?.contactPersonName || "Healthy Touch Provider";

export const getProviderCode = (provider: any) => {
  if (provider?.category === "Lab Technician" && provider?.labCode) return provider.labCode;
  const id = getProviderId(provider);
  return id ? `HTP-${String(id).slice(-6).toUpperCase()}` : "HTP-VERIFIED";
};

export const getProviderVerificationUrl = (provider: any) => {
  const id = getProviderId(provider);
  if (typeof window === "undefined") return `/verify-provider/${id}`;
  return `${window.location.origin}/verify-provider/${id}`;
};

const getQrImageUrl = (provider: any) => {
  const verificationUrl = getProviderVerificationUrl(provider);
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(verificationUrl)}`;
};

const formatDate = (date?: string) => {
  if (!date) return "N/A";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getCity = (provider: any) =>
  provider?.address?.city || provider?.location?.city || provider?.labServiceArea || "N/A";

const getMobile = (provider: any) =>
  provider?.userId?.mobile || provider?.mobile || provider?.labContactNumber || provider?.driverMobileNo || "N/A";

const getPhoto = (provider: any) =>
  provider?.userId?.profileImage || provider?.profileImage || provider?.ambulancePhoto || "";

const getDisplayName = (provider: any) =>
  provider?.category === "Lab Technician" && provider?.labName
    ? provider.labName
    : getProviderName(provider);

const openPrintableCard = (provider: any) => {
  const qrUrl = getQrImageUrl(provider);
  const photo = getPhoto(provider);
  const displayName = getDisplayName(provider);
  const html = `<!doctype html>
<html>
<head>
  <title>Healthy Touch ID Card - ${displayName}</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; width: 85.6mm; height: 54mm; overflow: hidden; }
    body { display: grid; place-items: center; background: #eef2f7; font-family: Inter, Arial, sans-serif; }
    .card { width: 85.6mm; height: 54mm; border: 1px solid #d8e2ef; border-radius: 4mm; overflow: hidden; background: white; color: #102033; box-shadow: 0 12px 34px rgba(15, 23, 42, .14); break-inside: avoid; page-break-inside: avoid; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 18mm; padding: 4mm 5mm; background: linear-gradient(135deg, #2f8dbb, #1f6f92); color: white; }
    .logo { height: 12mm; width: 12mm; object-fit: contain; background: white; border-radius: 4mm; padding: 1.5mm; }
    .status { display: inline-flex; align-items: center; border: 1px solid rgba(255,255,255,.45); border-radius: 999px; padding: 3px 7px; font-size: 8px; font-weight: 800; letter-spacing: .03em; white-space: nowrap; }
    .body { display: grid; grid-template-columns: 17mm 1fr 18mm; gap: 3mm; height: 36mm; padding: 4mm 5mm; align-items: start; }
    .photo { width: 17mm; height: 17mm; border-radius: 4mm; object-fit: cover; background: #e2e8f0; border: 1px solid #d8e2ef; }
    .fallback { width: 17mm; height: 17mm; border-radius: 4mm; background: #e0f2fe; display: grid; place-items: center; font-size: 24px; font-weight: 800; color: #0f766e; }
    h1 { font-size: 13px; line-height: 1.05; margin: 0 0 5px; max-width: 145px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .muted { color: #64748b; font-size: 6.8px; text-transform: uppercase; font-weight: 800; letter-spacing: .04em; margin-bottom: 1px; }
    .value { font-size: 8.5px; font-weight: 700; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .details { display: grid; grid-template-columns: 1fr 1fr; column-gap: 8px; }
    .qr { width: 17mm; height: 17mm; border: 1px solid #d8e2ef; border-radius: 4mm; padding: 1mm; background: white; }
    .verify { font-size: 7px; color: #64748b; margin-top: 2mm; text-align: center; }
    .foot { display: none; }
    @page { size: 85.6mm 54mm; margin: 0; }
    @media print {
      html, body { width: 85.6mm; height: 54mm; overflow: hidden; background: white; }
      body { display: block; }
      .card { box-shadow: none; border-radius: 4mm; }
    }
  </style>
</head>
<body>
  <section class="card">
    <div class="top">
      <img class="logo" src="/healthy-touch-logo.png" alt="Healthy Touch" />
      <div class="status">VERIFIED / APPROVED</div>
    </div>
    <div class="body">
      ${photo ? `<img class="photo" src="${photo}" alt="${displayName}" />` : `<div class="fallback">${displayName.charAt(0).toUpperCase()}</div>`}
      <div>
        <h1>${displayName}</h1>
        <div class="details">
          ${provider?.category === "Lab Technician" ? `<div><div class="muted">Owner</div><div class="value">${getProviderName(provider)}</div></div>` : ""}
          <div><div class="muted">Category</div><div class="value">${provider?.category || "N/A"}</div></div>
          <div><div class="muted">Specialization</div><div class="value">${provider?.specialization || "N/A"}</div></div>
          <div><div class="muted">${provider?.category === "Lab Technician" ? "Lab Code" : "Provider Code"}</div><div class="value">${getProviderCode(provider)}</div></div>
          <div><div class="muted">Mobile</div><div class="value">${getMobile(provider)}</div></div>
          <div><div class="muted">City</div><div class="value">${getCity(provider)}</div></div>
          <div><div class="muted">Approved</div><div class="value">${formatDate(provider?.approvedAt || provider?.updatedAt)}</div></div>
        </div>
      </div>
      <div>
        <img class="qr" src="${qrUrl}" alt="Verification QR" />
        <div class="verify">Scan</div>
      </div>
    </div>
    <div class="foot"><span>Healthy Touch Provider Verification Card</span><span>Status: Verified</span></div>
  </section>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=760,height=720");
  printWindow?.document.write(html);
  printWindow?.document.close();
};

export default function ProviderIdCard({ provider, className = "", compact = false }: ProviderIdCardProps) {
  if (!provider || provider.status !== "approved") return null;

  const name = getProviderName(provider);
  const displayName = getDisplayName(provider);
  const photo = getPhoto(provider);
  const qrUrl = getQrImageUrl(provider);

  return (
    <div className={`w-full max-w-[430px] ${className}`}>
      <div className="aspect-[1.586/1] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-primary to-health-blue-deep px-3 py-2 text-primary-foreground">
          <img src="/healthy-touch-logo.png" className="h-9 rounded-lg bg-white p-1" alt="Healthy Touch" />
          <Badge className="bg-white/15 px-2 py-0.5 text-[10px] text-white hover:bg-white/15">
            <ShieldCheck className="mr-1 h-3 w-3" />
          Verified / Approved
          </Badge>
        </div>

        <div className="grid grid-cols-[72px_1fr_72px] gap-3 p-3">
          <div className="flex justify-center">
            {photo ? (
              <img src={photo} alt={displayName} className="h-16 w-16 rounded-xl border object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Healthy Touch ID Card</p>
            <h3 className="mt-0.5 truncate text-base font-bold leading-tight">{displayName}</h3>
            {provider.category === "Lab Technician" && provider.labName && (
              <p className="truncate text-[10px] text-muted-foreground">Owner: {name}</p>
            )}

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-tight">
              <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{provider.category || "N/A"}</span></div>
              <div><span className="text-muted-foreground">Specialization:</span> <span className="font-medium">{provider.specialization || "N/A"}</span></div>
              <div><span className="text-muted-foreground">{provider.category === "Lab Technician" ? "Lab Code:" : "Provider Code:"}</span> <span className="font-medium">{getProviderCode(provider)}</span></div>
              <div><span className="text-muted-foreground">Mobile:</span> <span className="font-medium">{getMobile(provider)}</span></div>
              <div><span className="text-muted-foreground">City:</span> <span className="font-medium">{getCity(provider)}</span></div>
              <div><span className="text-muted-foreground">Approved:</span> <span className="font-medium">{formatDate(provider.approvedAt || provider.updatedAt)}</span></div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <img src={qrUrl} alt="Provider verification QR code" className="h-16 w-16 rounded-xl border bg-white p-1" />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <QrCode className="h-3 w-3" />
              Scan
            </div>
          </div>
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => openPrintableCard(provider)}>
        <Download className="mr-2 h-4 w-4" />
        Download ID Card
      </Button>
    </div>
  );
}
