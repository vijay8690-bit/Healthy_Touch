import re
with open('/Users/pradhyumanpareek/Downloads/healthy-touch-portal-main/frontend/src/pages/admin/AdminProviders.tsx', 'r') as f:
    code = f.read()

r_old = """                  ) : (
                    <div className="card-healthcare p-8 text-center text-muted-foreground">
                      No documents available for this provider.
                    </div>
                  )}
                </div>
              </TabsContent>"""

r_new = """                  ) : (
                    <div className="card-healthcare p-8 text-center text-muted-foreground">
                      No documents available for this provider.
                    </div>
                  )}
                  {selectedProvider?.category === 'Ambulance' && (
                    <div className="space-y-4 mt-6 border-t pt-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Ambulance Specific Documents
                      </h3>
                      {['rcDocument', 'driverLicenseDocument', 'ambulancePhoto', 'panCardPhoto', 'cancelledChequePhoto', 'policeVerificationDocument'].map((docKey) => {
                        const docUrl = selectedProvider[docKey];
                        if (!docUrl) return null;
                        return (
                          <div key={docKey} className="card-healthcare p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold flex items-center gap-2 capitalize">
                                <FileText className="w-4 h-4" />
                                {docKey.replace(/([A-Z])/g, ' $1').trim()}
                              </h4>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" asChild>
                                  <a href={getAssetViewUrl(docUrl, "inline")} target="_blank" rel="noopener noreferrer">
                                    <Eye className="w-4 h-4 mr-1" /> View
                                  </a>
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <a href={getAssetViewUrl(docUrl, "attachment")} download>
                                    <Download className="w-4 h-4 mr-1" /> Download
                                  </a>
                                </Button>
                              </div>
                            </div>
                            {docUrl.toLowerCase().endsWith('.pdf') ? (
                              <iframe src={getAssetViewUrl(docUrl, "inline")} className="w-full h-96 rounded-lg border border-border" title="PDF Document" />
                            ) : (
                              <img src={getAssetViewUrl(docUrl, "inline")} alt="Document" className="w-full max-w-2xl mx-auto rounded-lg border border-border bg-muted/30" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>"""

if r_old in code:
    code = code.replace(r_old, r_new)
    print("Patch applied to ambulance documentation.")
else:
    print("Failed to find block in AdminProviders for docs.")

with open('/Users/pradhyumanpareek/Downloads/healthy-touch-portal-main/frontend/src/pages/admin/AdminProviders.tsx', 'w') as f:
    f.write(code)
