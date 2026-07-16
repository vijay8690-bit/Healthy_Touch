"use client";

import { motion } from 'framer-motion';

const values = [
  {
    title: 'Compassionate Care',
    description: 'We believe in treating every patient with kindness, empathy, and respect.',
    bgColor: 'bg-primary', // Primary blue
  },
  {
    title: 'Trust & Safety',
    description: 'All our providers undergo thorough background checks and credential verification.',
    bgColor: 'bg-secondary', // Secondary green
  },
  {
    title: 'Quality Excellence',
    description: 'We maintain the highest standards of healthcare delivery and patient satisfaction.',
    bgColor: 'bg-primary/90', // Lighter primary blue
  },
  {
    title: 'Community First',
    description: 'We are committed to making quality healthcare accessible to all communities.',
    bgColor: 'bg-secondary/90', // Lighter secondary green
  },
];

export default function CoreValuesSection() {
  return (
    <section className="py-16 bg-background bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-0">
                Our Core Values
              </h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              <p className="text-foreground text-lg leading-relaxed">
                These fundamental principles guide everything we do and shape how we serve our patients and communities.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`${value.bgColor} rounded-xl p-6 text-white`}
            >
              <h3 className="font-bold text-xl mb-3 text-white">
                {value.title}
              </h3>
              <p className="text-sm text-white leading-relaxed">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

