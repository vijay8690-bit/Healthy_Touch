import { useEffect, useState } from 'react';
import { ArrowRight, Gift, Image, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminSidebarLinks } from '@/components/layout/AdminSidebarLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import homeContentService, {
  defaultHomeContent,
  type HomeContent,
  type HomeOffer,
} from '@/services/homeContent.service';
import uploadService from '@/services/upload.service';

const emptyImage = '';

const emptyOffer: HomeOffer = {
  tag: 'Limited Time',
  title: '',
  highlight: '',
  description: '',
  badge: '',
  color: 'primary',
  price: '',
  original: '',
  note: '',
  ctaText: 'Grab Offer',
  ctaLink: '/patient/dashboard',
  active: true,
};

export default function AdminHomeContent() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [content, setContent] = useState<HomeContent>(defaultHomeContent);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const data = await homeContentService.getAdminHomeContent();
      setContent(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load home content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof HomeContent>(key: K, value: HomeContent[K]) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const updateHeroImage = (index: number, value: string) => {
    setContent((prev) => ({
      ...prev,
      heroImages: prev.heroImages.map((imageUrl, imageIndex) =>
        imageIndex === index ? value : imageUrl
      ),
    }));
  };

  const addHeroImage = () => {
    setContent((prev) => ({
      ...prev,
      heroImages: [...prev.heroImages, emptyImage],
    }));
  };

  const removeHeroImage = (index: number) => {
    setContent((prev) => {
      const nextImages = prev.heroImages.filter((_, imageIndex) => imageIndex !== index);
      return {
        ...prev,
        heroImages: nextImages.length ? nextImages : [emptyImage],
      };
    });
  };

  const updateOffer = <K extends keyof HomeOffer>(index: number, key: K, value: HomeOffer[K]) => {
    setContent((prev) => ({
      ...prev,
      offers: prev.offers.map((offer, offerIndex) =>
        offerIndex === index ? { ...offer, [key]: value } : offer
      ),
    }));
  };

  const addOffer = () => {
    setContent((prev) => ({
      ...prev,
      offers: [...prev.offers, { ...emptyOffer }],
    }));
  };

  const removeOffer = (index: number) => {
    setContent((prev) => ({
      ...prev,
      offers: prev.offers.filter((_, offerIndex) => offerIndex !== index),
    }));
  };

  const uploadImage = async (file: File | null, onUploaded: (url: string) => void, field: string) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingField(field);
      const response = await uploadService.uploadSingleFile(file, 'home-content');
      if (!response?.success || !response?.url) {
        throw new Error('Upload failed');
      }

      onUploaded(response.url);
      toast({ title: 'Uploaded', description: 'Image uploaded successfully.' });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.response?.data?.message || error.message || 'Could not upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    const payload = {
      ...content,
      heroImages: content.heroImages.map((imageUrl) => imageUrl.trim()).filter(Boolean),
      offers: content.offers
        .map((offer) => ({
          ...offer,
          tag: offer.tag.trim(),
          title: offer.title.trim(),
          highlight: offer.highlight.trim(),
          description: offer.description.trim(),
          badge: offer.badge.trim(),
          price: offer.price.trim(),
          original: offer.original.trim(),
          note: offer.note.trim(),
          ctaText: offer.ctaText.trim() || 'Grab Offer',
          ctaLink: offer.ctaLink.trim() || '/patient/dashboard',
        }))
        .filter((offer) => offer.title),
    };

    if (!payload.heroImages.length) {
      toast({
        title: 'Hero image required',
        description: 'Add at least one hero slider image URL.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const updated = await homeContentService.updateAdminHomeContent(payload);
      setContent(updated);
      toast({ title: 'Saved', description: 'Home page content has been updated.' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save home content',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      sidebarLinks={adminSidebarLinks}
      portalName="Admin Portal"
      userName="Admin"
      userInitial="A"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Home Content Settings</h1>
            <p className="text-muted-foreground">Manage the homepage hero slider, CTA and offer banner.</p>
          </div>
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        {loading ? (
          <div className="card-healthcare p-10 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            Loading home content...
          </div>
        ) : (
          <>
          <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <div className="card-healthcare p-5 md:p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Hero Section</h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroTitle">Hero Title</Label>
                <Textarea
                  id="heroTitle"
                  value={content.heroTitle}
                  onChange={(event) => updateField('heroTitle', event.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                <Textarea
                  id="heroSubtitle"
                  value={content.heroSubtitle}
                  onChange={(event) => updateField('heroSubtitle', event.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ctaText">CTA Button Text</Label>
                  <Input
                    id="ctaText"
                    value={content.ctaText}
                    onChange={(event) => updateField('ctaText', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctaLink">CTA Button Link</Label>
                  <Input
                    id="ctaLink"
                    value={content.ctaLink}
                    onChange={(event) => updateField('ctaLink', event.target.value)}
                    placeholder="/patient/dashboard"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Hero Slider Images</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addHeroImage} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Image
                  </Button>
                </div>

                <div className="space-y-3">
                  {content.heroImages.map((imageUrl, index) => (
                    <div key={`${index}-${imageUrl}`} className="rounded-lg border bg-background p-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="h-20 w-full overflow-hidden rounded-md border bg-muted md:w-32">
                          {imageUrl ? (
                            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={imageUrl}
                            onChange={(event) => updateHeroImage(index, event.target.value)}
                            placeholder="https://... or /slider-1.jpg"
                          />
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              uploadImage(
                                event.target.files?.[0] || null,
                                (url) => updateHeroImage(index, url),
                                `hero-${index}`
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeHeroImage(index)}
                          aria-label="Remove hero image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {uploadingField === `hero-${index}` ? (
                        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading image...
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card-healthcare p-5 md:p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Offer Banner</h2>
                    <p className="text-sm text-muted-foreground">Shown inside the homepage hero when active.</p>
                  </div>
                  <Switch
                    checked={content.offerActive}
                    onCheckedChange={(checked) => updateField('offerActive', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offerTitle">Offer Banner Text</Label>
                  <Input
                    id="offerTitle"
                    value={content.offerTitle}
                    onChange={(event) => updateField('offerTitle', event.target.value)}
                    placeholder="Flat 30% off home visits"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offerDescription">Offer Description</Label>
                  <Textarea
                    id="offerDescription"
                    value={content.offerDescription}
                    onChange={(event) => updateField('offerDescription', event.target.value)}
                    rows={4}
                    placeholder="Short supporting text for the offer banner"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offerImage">Offer Banner Image</Label>
                  {content.offerImage ? (
                    <img
                      src={content.offerImage}
                      alt=""
                      className="h-36 w-full rounded-lg border object-cover"
                    />
                  ) : null}
                  <Input
                    id="offerImage"
                    value={content.offerImage}
                    onChange={(event) => updateField('offerImage', event.target.value)}
                    placeholder="https://... or /offer.jpg"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      uploadImage(
                        event.target.files?.[0] || null,
                        (url) => updateField('offerImage', url),
                        'offer'
                      )
                    }
                  />
                  {uploadingField === 'offer' ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading offer image...
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="card-healthcare overflow-hidden">
                <div
                  className="min-h-72 bg-cover bg-center p-5 text-white"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(12,18,34,0.72), rgba(12,18,34,0.4)), url('${
                      content.heroImages.find(Boolean) || defaultHomeContent.heroImages[0]
                    }')`,
                  }}
                >
                  <div className="max-w-md space-y-4">
                    <p className="inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-primary">
                      Preview
                    </p>
                    <h3 className="whitespace-pre-line text-3xl font-bold leading-tight">
                      {content.heroTitle || defaultHomeContent.heroTitle}
                    </h3>
                    <p className="text-sm text-white/85">
                      {content.heroSubtitle || defaultHomeContent.heroSubtitle}
                    </p>
                    {content.offerActive && (content.offerTitle || content.offerDescription) ? (
                      <div className="rounded-xl border border-white/15 bg-white/15 p-3 text-sm backdrop-blur">
                        <p className="font-semibold">{content.offerTitle}</p>
                        <p className="text-white/80">{content.offerDescription}</p>
                      </div>
                    ) : null}
                    <Button type="button" size="sm" className="gap-2">
                      {content.ctaText || defaultHomeContent.ctaText}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/*
          <div className="card-healthcare p-5 md:p-6 space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">Special Offers Section</h2>
                  <p className="text-sm text-muted-foreground">Cards shown in the homepage offers section.</p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addOffer} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Offer
              </Button>
            </div>

            <div className="space-y-4">
              {content.offers.map((offer, index) => (
                <div key={offer._id || index} className="rounded-lg border bg-background p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Offer {index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        {offer.active ? 'Visible on homepage' : 'Hidden from homepage'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={offer.active}
                        onCheckedChange={(checked) => updateOffer(index, 'active', checked)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeOffer(index)}
                        aria-label="Remove offer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={offer.title}
                        onChange={(event) => updateOffer(index, 'title', event.target.value)}
                        placeholder="Doctor Home Visit Starter Pack"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tag</Label>
                      <Input
                        value={offer.tag}
                        onChange={(event) => updateOffer(index, 'tag', event.target.value)}
                        placeholder="Limited Time"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Badge</Label>
                      <Input
                        value={offer.badge}
                        onChange={(event) => updateOffer(index, 'badge', event.target.value)}
                        placeholder="Most Loved"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2 xl:col-span-3">
                      <Label>Description</Label>
                      <Textarea
                        value={offer.description}
                        onChange={(event) => updateOffer(index, 'description', event.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Highlight</Label>
                      <Input
                        value={offer.highlight}
                        onChange={(event) => updateOffer(index, 'highlight', event.target.value)}
                        placeholder="Flat 30% OFF"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <select
                        value={offer.color}
                        onChange={(event) =>
                          updateOffer(index, 'color', event.target.value as HomeOffer['color'])
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        value={offer.price}
                        onChange={(event) => updateOffer(index, 'price', event.target.value)}
                        placeholder="₹799"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Original Price</Label>
                      <Input
                        value={offer.original}
                        onChange={(event) => updateOffer(index, 'original', event.target.value)}
                        placeholder="₹1,149"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Note</Label>
                      <Input
                        value={offer.note}
                        onChange={(event) => updateOffer(index, 'note', event.target.value)}
                        placeholder="for your first visit"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Button Text</Label>
                      <Input
                        value={offer.ctaText}
                        onChange={(event) => updateOffer(index, 'ctaText', event.target.value)}
                        placeholder="Grab Offer"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Button Link</Label>
                      <Input
                        value={offer.ctaLink}
                        onChange={(event) => updateOffer(index, 'ctaLink', event.target.value)}
                        placeholder="/patient/dashboard"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {!content.offers.length ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No offers added yet.
                </div>
              ) : null}
            </div>
          </div>
          */}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
