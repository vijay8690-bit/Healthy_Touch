import re
with open('/Users/pradhyumanpareek/Downloads/healthy-touch-portal-main/frontend/src/pages/admin/AdminProviders.tsx', 'r') as f:
    code = f.read()

r_old = """                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        Specialization"""

r_new = """                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedProvider.category === 'Ambulance' ? (
                      <>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Ambulance Type</p>
                          <p className="font-semibold text-lg">{selectedProvider.ambulanceType || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Vehicle Details</p>
                          <p className="font-semibold text-lg">{selectedProvider.vehicleModel} ({selectedProvider.vehicleYear}) - {selectedProvider.vehicleNumber}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Driver Details</p>
                          <p className="font-semibold text-lg">{selectedProvider.driverName} ({selectedProvider.driverMobileNo})</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Pricing & Availability</p>
                          <p className="font-semibold text-lg">Base ₹{selectedProvider.baseCharges} | Per km ₹{selectedProvider.perKmCharge} ({selectedProvider.availabilityType})</p>
                        </div>
                      </>
                    ) : (
                      <>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        Specialization"""

if r_old in code:
    code = code.replace(r_old, r_new)
    print("Patch 1 applied.")
else:
    print("Patch 1 failed to find target.")

r2_old = """                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        Consultation Fee
                      </p>
                      <p className="font-semibold text-lg text-primary">
                        ₹{selectedProvider.fees}
                      </p>
                    </div>
                  </div>

                  {selectedProvider.status === "approved" && ("""

r2_new = """                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        Consultation Fee
                      </p>
                      <p className="font-semibold text-lg text-primary">
                        ₹{selectedProvider.fees}
                      </p>
                    </div>
                      </>
                    )}
                  </div>

                  {selectedProvider.status === "approved" && ("""

if r2_old in code:
    code = code.replace(r2_old, r2_new)
    print("Patch 2 applied.")
else:
    print("Patch 2 failed to find target.")

with open('/Users/pradhyumanpareek/Downloads/healthy-touch-portal-main/frontend/src/pages/admin/AdminProviders.tsx', 'w') as f:
    f.write(code)
