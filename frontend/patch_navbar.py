import re

with open('src/components/layout/Navbar.tsx', 'r') as f:
    text = f.read()

# Add import at top
import_str = "import { LocationSearchInput } from '@/components/ui/LocationSearchInput';\nimport { Button } from '@/components/ui/button';"
text = text.replace("import { Button } from '@/components/ui/button';", import_str)

# Replace Google Maps key constant to use the provided one
text = re.sub(r'const GOOGLE_MAPS_API_KEY = .*;', 'const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;', text)

# Replace the manual location grid with our new component
manual_grid_regex = re.compile(
    r'<div className="grid grid-cols-1 md:grid-cols-2 gap-3">.*?<Button[^>]*onClick=\{handleManualLocationFetch\}[^>]*>.*?</Button>',
    re.DOTALL
)

new_code = """<div className="space-y-4 my-2">
              <Label>Search Location</Label>
              <LocationSearchInput 
                onLocationSelect={(lat, lng, address) => {
                  setShowLocationMap(true);
                  setPendingLocation({ lat, lng });
                  setPendingLocationLabel(address);
                  toast({ title: 'Location found', description: address });
                }} 
              />
              {locationError && (
                <p className="text-sm text-destructive">{locationError}</p>
              )}
            </div>"""

text = manual_grid_regex.sub(new_code, text)

with open('src/components/layout/Navbar.tsx', 'w') as f:
    f.write(text)
