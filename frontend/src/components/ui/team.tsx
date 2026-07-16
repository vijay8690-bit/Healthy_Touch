import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/config/api.config';

type TeamMember = {
  _id?: string;
  name: string;
  role: string;
  avatar: string;
  bio: string;
  experience?: string;
  profileLink?: string;
  displayOrder?: number;
};

const fallbackMembers: TeamMember[] = [
  {
    name: 'Dr. Ananya Mehta',
    role: 'Founder',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=826&q=80',
    bio: 'Experienced healthcare leader focused on quality home care.',
    experience: '15+ Years',
  },
  {
    name: 'Dr. Arjun Verma',
    role: 'Co-Founder',
    avatar: 'https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=826&q=80',
    bio: 'Clinical expert driving multidisciplinary coordination.',
    experience: '12+ Years',
  },
  {
    name: 'Nurse Riya Kapoor',
    role: 'Head Nurse',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=826&q=80',
    bio: 'Leads nursing excellence with a strong focus on patients.',
    experience: '10+ Years',
  },
  {
    name: 'Dr. Sarah Smith',
    role: 'Physiotherapist',
    avatar: 'https://images.unsplash.com/photo-1594824401549-0668b5774a26?auto=format&fit=crop&w=826&q=80',
    bio: 'Specialist in post-operative rehabilitation and mobility.',
    experience: '8+ Years',
  },
  {
    name: 'Dr. Rahul Sharma',
    role: 'Cardiologist',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=826&q=80',
    bio: 'Expert in chronic heart disease management.',
    experience: '20+ Years',
  },
];

export default function TeamSection() {
  const [members, setMembers] = useState<TeamMember[]>(fallbackMembers);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/team`);
        const data = await response.json();

        if (response.ok && data?.success && Array.isArray(data.members)) {
          setMembers(data.members);
        }
      } catch (error) {
        // Keep fallback members if API is unavailable.
      }
    };

    fetchTeam();
  }, []);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    [members]
  );

  return (
    <>
      <section className="bg-muted/20 py-16 md:py-24 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-7xl">
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
               <p className="inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-white/70 text-primary shadow-sm mb-4">
               Our Team
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              The care team behind <span className="gradient-text">Healthy Touch</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
              A multidisciplinary team of doctors, nurses and care coordinators working together
              to deliver safe, compassionate healthcare at home.
              </p>
            </motion.div>

          <div className="mt-10 md:mt-20">
            <div className="grid gap-x-6 gap-y-12 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {sortedMembers.map((member, index) => (
                <div
                  key={member._id || `${member.name}-${index}`}
                  className="group flex flex-col items-center text-center p-4 rounded-3xl transition-all duration-300 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.02)]"
                >
                  <div className="relative w-32 h-32 md:w-36 md:h-36 mb-5 shrink-0 overflow-hidden rounded-full ring-4 ring-white shadow-lg transition-transform duration-500 group-hover:scale-105 group-hover:ring-primary/20 bg-muted">
                    <img
                      className="w-full h-full object-cover"
                      src={member.avatar}
                      alt={member.name}
                      loading="lazy"
                    />
                  </div>
                  
                  <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {member.name}
                  </h3>
                  
                  <p className="text-xs font-medium text-primary/80 mb-2 uppercase tracking-wider">
                    {member.role}
                  </p>
                  
                  {member.experience && (
                    <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold mb-3">
                      {member.experience}
                    </span>
                  )}
                  
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {member.bio}
                  </p>
                  
                  {member.profileLink && (
                    <a
                      href={member.profileLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 text-xs font-semibold text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Profile &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

