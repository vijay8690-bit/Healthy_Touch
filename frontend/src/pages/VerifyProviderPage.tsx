import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import providerService from "@/services/provider.service";

export default function VerifyProviderPage() {
  const { providerId } = useParams();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (!providerId) {
        setError("Verification link is invalid.");
        setLoading(false);
        return;
      }

      try {
        const response = await providerService.verifyProvider(providerId);
        setProvider(response.provider);
      } catch (err: any) {
        setError(err.response?.data?.message || "Provider could not be verified.");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [providerId]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/40 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b bg-primary/5 p-5">
            <img src="/healthy-touch-logo.png" className="h-14" alt="Healthy Touch" />
            <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Verified Badge
            </Badge>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying provider...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold">Verification Failed</h1>
                <p className="text-muted-foreground">{error}</p>
                <Button asChild variant="outline" className="mt-2">
                  <Link to="/">Go to Healthy Touch</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                    <CheckCircle className="h-8 w-8 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Healthy Touch Verified Provider
                    </p>
                    <h1 className="mt-1 text-2xl font-bold">
                      {provider.category === "Lab Technician" && provider.labName ? provider.labName : provider.name}
                    </h1>
                    {provider.category === "Lab Technician" && provider.labName && (
                      <p className="mt-1 text-sm text-muted-foreground">Owner: {provider.name}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-semibold">{provider.category || "N/A"}</span>
                  </div>
                  {provider.category === "Lab Technician" && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Lab / Centre Name</span>
                      <span className="text-right font-semibold">{provider.labName || "N/A"}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Specialization</span>
                    <span className="text-right font-semibold">{provider.specialization || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary">
                      {provider.status === "approved" ? "Verified / Approved" : provider.status}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-sm text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-secondary" />
                    Healthy Touch verified badge
                  </div>
                  This provider is approved by Healthy Touch and this verification page was opened from their official ID card QR code.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
