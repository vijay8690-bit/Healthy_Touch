"use client";

import React from "react";
import { Check, Target, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const missionData = {
  badge: "Mission",
  title: "Our Mission",
  description: "We believe that where you live should not determine the quality of healthcare you receive. A patient in Hindaun deserves the same access to a qualified nurse or physiotherapist as someone in Delhi or Mumbai — at their doorstep, at a price they can afford, with the trust and transparency they deserve. That is the promise of HealthyTouch24.",
  features: [
    {
      title: "Accessible Healthcare",
      description: "We strive to eliminate barriers to healthcare access, ensuring that geography, mobility, or socioeconomic status never prevents anyone from receiving the care they deserve.",
    },
    {
      title: "Verified Professionals",
      description: "All our healthcare providers undergo thorough background checks and credential verification for your safety.",
    },
    {
      title: "Compassionate Care",
      description: "We believe in treating every patient with kindness, empathy, and respect at their doorstep.",
    },
  ],
  image: "/home_health_care.jpg",
};

const visionData = {
  badge: "Vision",
  title: "Our Vision",
  description: "To become India's most trusted home healthcare platform, known for quality, compassion, and innovation in healthcare delivery. A future where quality care is just a click away.",
  features: [
    {
      title: "Trusted Platform",
      description: "We envision becoming India's most trusted home healthcare platform with quality and innovation.",
    },
    {
      title: "Technology & Compassion",
      description: "A healthcare ecosystem where technology and human compassion work together seamlessly.",
    },
    {
      title: "Transformative Care",
      description: "Creating personalized care experiences that transform lives and communities.",
    },
  ],
  image: "/Home-healthcare.webp",
};

export default function MissionVisionSection() {
  return (
    <section className="w-full py-16 lg:py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Mission Card */}
          <div className="border rounded-2xl bg-background p-6 md:p-7 grid grid-cols-1 gap-6 items-start h-full lg:grid-cols-2">
            <div className="flex gap-6 flex-col self-start">
              <div className="flex gap-3 flex-col">
                <div>
                  <Badge variant="outline">{missionData.badge}</Badge>
                </div>
                <div className="flex gap-2 flex-col">
                  <h2 className="text-3xl lg:text-4xl tracking-tighter max-w-xl text-left font-regular">
                    {missionData.title}
                  </h2>
                  <p className="text-base md:text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl text-left">
                    {missionData.description}
                  </p>
                </div>
              </div>
              <div className="grid lg:pl-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {missionData.features.map((feature, index) => (
                  <div key={index} className="flex flex-row gap-4 items-start">
                    <Check className="w-4 h-4 mt-2 text-primary" />
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">{feature.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-xl overflow-hidden self-start lg:mt-1">
              <img
                src={missionData.image}
                alt="Mission"
                className="w-full h-full object-cover aspect-square"
              />
            </div>
          </div>

          {/* Vision Card */}
          <div className="border rounded-2xl bg-background p-6 md:p-7 grid grid-cols-1 gap-6 items-start h-full lg:grid-cols-2">
            <div className="flex gap-6 flex-col self-start">
              <div className="flex gap-3 flex-col">
                <div>
                  <Badge variant="outline">{visionData.badge}</Badge>
                </div>
                <div className="flex gap-2 flex-col">
                  <h2 className="text-3xl lg:text-4xl tracking-tighter max-w-xl text-left font-regular">
                    {visionData.title}
                  </h2>
                  <p className="text-base md:text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl text-left">
                    {visionData.description}
                  </p>
                </div>
              </div>
              <div className="grid lg:pl-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {visionData.features.map((feature, index) => (
                  <div key={index} className="flex flex-row gap-4 items-start">
                    <Check className="w-4 h-4 mt-2 text-secondary" />
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">{feature.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-xl overflow-hidden self-start lg:mt-1">
              <img
                src={visionData.image}
                alt="Vision"
                className="w-full h-full object-cover aspect-square"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
