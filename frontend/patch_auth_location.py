import re

with open('src/pages/AuthPage.tsx', 'r') as f:
    text = f.read()

# Add import
if "import { LocationSearchInput }" not in text:
    text = text.replace("import { Button }", "import { LocationSearchInput } from '@/components/ui/LocationSearchInput';\nimport { Button }")

# Insert the search input after the Location Gate's Allow/Update button block
target_str = """                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Name Field (for registration only) */}"""

replacement_str = """                        </Button>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <Label className="text-xs font-semibold mb-2 block">Or search location manually:</Label>
                        <LocationSearchInput 
                           placeholder="Type your area, city..."
                           onLocationSelect={(lat, lng, address) => {
                             const payload = { latitude: lat, longitude: lng, address };
                             setLocation(payload);
                             sessionStorage.setItem('user_location_session', JSON.stringify({ ...payload, timestamp: Date.now() }));
                           }}
                        />
                      </div>
                    </div>
                  )}
                  {/* Name Field (for registration only) */}"""

text = text.replace(target_str, replacement_str)

with open('src/pages/AuthPage.tsx', 'w') as f:
    f.write(text)
